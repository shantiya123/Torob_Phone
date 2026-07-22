"""Basket and order serializers.

Implements docs/Serializers.md sections 10 (Basket Serializers),
11 (Basket Reservation Rules), 12 (Basket Item Price Snapshot),
13 (Order Serializers), and 14 (Order Price Snapshot).

The price/inventory flow enforced here:

    Offer.price -> BasketItem.unit_price (copied when added to basket)
    Offer.quantity -> reserved on add, released/re-reserved on update
    BasketItem.unit_price -> OrderItem.unit_price (copied at checkout)

None of these serializers accept ``unit_price``, ``total``, ``basket``,
``store``, or ``status`` as client input — they are always backend-derived
or backend-controlled.
"""

from django.db import transaction
from django.db.models import F
from rest_framework import serializers

from marketplace.models import Offer
from marketplace.serializers import OfferListSerializer

from .models import Basket, BasketItem, Order, OrderItem


# --------------------------------------------------------------------------
# Basket serializers
# --------------------------------------------------------------------------


class BasketItemSerializer(serializers.ModelSerializer):
    """Represents one item in the basket. See 10.2 / 12.

    ``unit_price`` is a price snapshot copied from the offer when the item
    was added; it is read-only and does not track the offer's current price.
    """

    offer = OfferListSerializer(read_only=True)
    total = serializers.SerializerMethodField()

    class Meta:
        model = BasketItem
        fields = ["id", "offer", "quantity", "unit_price", "total", "created_at", "updated_at"]
        read_only_fields = ["id", "offer", "unit_price", "total", "created_at", "updated_at"]

    def get_total(self, instance):
        return instance.unit_price * instance.quantity


class BasketSerializer(serializers.ModelSerializer):
    """Represents the authenticated user's current basket. See 10.1.

    ``total`` is computed from ``BasketItem.unit_price * BasketItem.quantity``
    across all items; the client never submits it.
    """

    items = BasketItemSerializer(many=True, read_only=True)
    total = serializers.SerializerMethodField()

    class Meta:
        model = Basket
        fields = ["id", "items", "total", "created_at", "updated_at"]
        read_only_fields = fields

    def get_total(self, instance):
        return sum(item.unit_price * item.quantity for item in instance.items.all())


class BasketItemCreateSerializer(serializers.Serializer):
    """Adds an offer to the authenticated user's basket. See 10.3 / 11.

    ``unit_price``, ``total``, and ``basket`` are never accepted: the basket
    comes from ``request.user``, and the unit price is copied from the
    offer's current price at the moment of reservation. Adding an offer that
    is already in the basket increases its reserved quantity rather than
    creating a duplicate row (enforced by the ``basket``+``offer`` unique
    constraint), matching the model docstring.
    """

    offer = serializers.PrimaryKeyRelatedField(queryset=Offer.objects.all())
    quantity = serializers.IntegerField(min_value=1)

    def validate(self, attrs):
        offer = attrs["offer"]
        quantity = attrs["quantity"]
        if offer.quantity < quantity:
            raise serializers.ValidationError(
                {"quantity": "The requested quantity exceeds what this store currently has available."}
            )
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        request = self.context["request"]
        offer = validated_data["offer"]
        quantity = validated_data["quantity"]

        basket, _ = Basket.objects.get_or_create(user=request.user)

        # Lock the offer row for the duration of the reservation check.
        offer = Offer.objects.select_for_update().get(pk=offer.pk)
        if offer.quantity < quantity:
            raise serializers.ValidationError(
                {"quantity": "The requested quantity exceeds what this store currently has available."}
            )

        item, created = BasketItem.objects.select_for_update().get_or_create(
            basket=basket,
            offer=offer,
            defaults={"quantity": quantity, "unit_price": offer.price},
        )
        if not created:
            item.quantity = F("quantity") + quantity
            item.save(update_fields=["quantity", "updated_at"])
            item.refresh_from_db()

        offer.quantity = F("quantity") - quantity
        offer.save(update_fields=["quantity", "updated_at"])
        return item


class BasketItemUpdateSerializer(serializers.Serializer):
    """Updates only the quantity of an existing basket item. See 10.4 / 11.

    ``offer``, ``unit_price``, ``total``, and ``basket`` cannot be changed
    through this serializer. The reservation difference between the old and
    new quantity is applied to the offer's available quantity atomically.
    """

    quantity = serializers.IntegerField(min_value=1)

    def validate_quantity(self, value):
        instance = self.instance
        difference = value - instance.quantity
        if difference > 0 and instance.offer.quantity < difference:
            raise serializers.ValidationError(
                "The requested quantity exceeds what this store currently has available."
            )
        return value

    @transaction.atomic
    def update(self, instance, validated_data):
        new_quantity = validated_data["quantity"]
        difference = new_quantity - instance.quantity

        offer = Offer.objects.select_for_update().get(pk=instance.offer_id)
        if difference > 0 and offer.quantity < difference:
            raise serializers.ValidationError(
                {"quantity": "The requested quantity exceeds what this store currently has available."}
            )

        offer.quantity = F("quantity") - difference
        offer.save(update_fields=["quantity", "updated_at"])

        instance.quantity = new_quantity
        instance.save(update_fields=["quantity", "updated_at"])
        return instance


# --------------------------------------------------------------------------
# Order serializers
# --------------------------------------------------------------------------


class OrderItemSerializer(serializers.ModelSerializer):
    """Represents one purchased offer at its purchase-time price. See 13.3.

    ``unit_price`` is the historical price at checkout and is never
    recalculated from the offer's current ``price``.
    """

    offer = OfferListSerializer(read_only=True)
    total = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = ["id", "offer", "quantity", "unit_price", "total", "created_at"]
        read_only_fields = fields

    def get_total(self, instance):
        return instance.unit_price * instance.quantity


class OrderSerializer(serializers.ModelSerializer):
    """Represents one store's portion of a checked-out basket. See 13.2.

    ``store``, ``status``, and ``total`` are backend-controlled; status
    changes require a dedicated domain transition, not this serializer.
    """

    items = OrderItemSerializer(many=True, read_only=True)
    total = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = ["id", "store", "status", "items", "total", "created_at", "updated_at"]
        read_only_fields = fields

    def get_total(self, instance):
        return sum(item.unit_price * item.quantity for item in instance.items.all())


class OrderCreateSerializer(serializers.Serializer):
    """Checks out the authenticated user's basket. See 13.1 / 14.

    Accepts no input fields: the client never submits order items, stores,
    or prices. Groups the basket's items by store, creates one Order per
    store, copies each BasketItem's ``unit_price`` snapshot onto its
    OrderItem, and clears the basket. The whole operation is atomic.
    """

    def validate(self, attrs):
        request = self.context["request"]
        basket = getattr(request.user, "basket", None)
        if basket is None or not basket.items.exists():
            raise serializers.ValidationError("The basket is empty.")
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        request = self.context["request"]
        basket = request.user.basket

        items_by_store = {}
        for item in basket.items.select_related("offer__store").select_for_update():
            items_by_store.setdefault(item.offer.store_id, []).append(item)

        orders = []
        for store_id, items in items_by_store.items():
            order = Order.objects.create(basket=basket, store_id=store_id, status=Order.Status.PENDING)
            OrderItem.objects.bulk_create(
                [
                    OrderItem(
                        order=order,
                        offer=item.offer,
                        quantity=item.quantity,
                        unit_price=item.unit_price,
                    )
                    for item in items
                ]
            )
            orders.append(order)

        basket.items.all().delete()
        return orders

    def to_representation(self, orders):
        return OrderSerializer(orders, many=True, context=self.context).data