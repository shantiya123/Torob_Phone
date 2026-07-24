from django.db import transaction
from django.db.models import F
from rest_framework import generics, status
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.response import Response

from api_pagination import StandardResultsSetPagination
from api_permissions import IsCustomer, IsStoreOwner, user_store
from marketplace.models import Offer

from .models import Basket, BasketItem, Order
from .services import OrderCancellationError, cancel_order
from .serializers import (
    BasketItemCreateSerializer,
    BasketItemSerializer,
    BasketItemUpdateSerializer,
    BasketSerializer,
    OrderCreateSerializer,
    OrderSerializer,
)


class MyBasketView(generics.RetrieveAPIView):
    permission_classes = [IsCustomer]
    serializer_class = BasketSerializer

    def get_object(self):
        basket, _ = Basket.objects.get_or_create(user=self.request.user)
        return Basket.objects.prefetch_related("items__offer__store").get(pk=basket.pk)


class BasketItemCreateView(generics.CreateAPIView):
    permission_classes = [IsCustomer]
    serializer_class = BasketItemCreateSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = serializer.save()
        return Response(
            BasketItemSerializer(item, context=self.get_serializer_context()).data,
            status=status.HTTP_201_CREATED,
        )


class _OwnBasketItemMixin:
    permission_classes = [IsCustomer]

    def get_queryset(self):
        return BasketItem.objects.select_related("offer", "basket").filter(basket__user=self.request.user)


class BasketItemUpdateView(_OwnBasketItemMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = BasketItemUpdateSerializer
    http_method_names = ["patch", "delete", "head", "options"]

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        item = serializer.save()
        return Response(BasketItemSerializer(item, context=self.get_serializer_context()).data)

    @transaction.atomic
    def perform_destroy(self, instance):
        try:
            item = BasketItem.objects.select_for_update().get(
                pk=instance.pk, basket__user=self.request.user
            )
        except BasketItem.DoesNotExist as exc:
            raise NotFound() from exc
        offer = Offer.objects.select_for_update().get(pk=item.offer_id)
        offer.quantity = F("quantity") + item.quantity
        offer.save(update_fields=["quantity", "updated_at"])
        item.delete()


class BasketItemDeleteView(BasketItemUpdateView):
    """Named TG-006 view; DELETE shares the basket-item detail endpoint."""


class MyOrderListView(generics.ListCreateAPIView):
    permission_classes = [IsCustomer]
    pagination_class = StandardResultsSetPagination

    def get_serializer_class(self):
        return OrderCreateSerializer if self.request.method == "POST" else OrderSerializer

    def get_queryset(self):
        return Order.objects.prefetch_related("items__offer__store").filter(
            basket__user=self.request.user
        ).order_by("-created_at", "-pk")


class OrderCreateView(MyOrderListView):
    """Named TG-006 view; POST shares the order collection endpoint."""


class OrderDetailView(generics.RetrieveAPIView):
    permission_classes = [IsCustomer]
    serializer_class = OrderSerializer

    def get_queryset(self):
        return Order.objects.prefetch_related("items__offer__store").filter(basket__user=self.request.user)


class OrderCancelView(generics.GenericAPIView):
    """Cancel an order and restore reserved stock exactly once."""

    serializer_class = OrderSerializer

    def post(self, request, pk):
        try:
            order = Order.objects.select_related("basket").get(pk=pk)
        except Order.DoesNotExist as exc:
            raise NotFound() from exc
        if not request.user.is_staff and order.basket.user_id != request.user.id:
            raise PermissionDenied("You may only cancel your own orders.")
        try:
            order, restored = cancel_order(order.pk)
        except OrderCancellationError as exc:
            raise ValidationError(str(exc)) from exc
        return Response({
            "order": OrderSerializer(order, context=self.get_serializer_context()).data,
            "stock_restored": restored,
        })


class MyStoreOrderListView(generics.ListAPIView):
    permission_classes = [IsStoreOwner]
    serializer_class = OrderSerializer
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        return Order.objects.prefetch_related("items__offer__store").filter(
            store=user_store(self.request.user)
        ).order_by("-created_at", "-pk")


class StoreOrderDetailView(generics.RetrieveAPIView):
    permission_classes = [IsStoreOwner]
    serializer_class = OrderSerializer

    def get_queryset(self):
        return Order.objects.prefetch_related("items__offer__store").filter(
            store=user_store(self.request.user)
        )
