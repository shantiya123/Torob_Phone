from django.db import transaction
from django.db.models import F
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.response import Response
from drf_spectacular.utils import OpenApiParameter, OpenApiTypes, extend_schema, extend_schema_view

from api_pagination import StandardResultsSetPagination
from api_permissions import IsCustomer, IsStoreOwner, user_store
from marketplace.models import Offer

from .models import Basket, BasketItem, Order
from .services import OrderCancellationError, cancel_order
from .services import CheckoutError, checkout_customer
from .services import release_expired_basket_items
from .serializers import (
    BasketItemCreateSerializer,
    BasketItemSerializer,
    BasketItemUpdateSerializer,
    BasketSerializer,
    CheckoutResponseSerializer,
    OrderCreateSerializer,
    OrderCancellationResponseSerializer,
    OrderSerializer,
    OrderSummarySerializer,
)
from wallet.serializers import WalletTransactionSerializer


class MyBasketView(generics.RetrieveAPIView):
    permission_classes = [IsCustomer]
    serializer_class = BasketSerializer

    def get_object(self):
        basket, _ = Basket.objects.get_or_create(user=self.request.user)
        release_expired_basket_items(user=self.request.user)
        return Basket.objects.prefetch_related(
            "items__offer__store",
            "items__offer__device_variant__device_model__brand",
        ).get(pk=basket.pk)


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
        if instance.expires_at <= timezone.now():
            return Response(
                {
                    "code": "basket_reservation_expired",
                    "detail": "This Basket reservation has expired.",
                    "basket_item_id": instance.pk,
                },
                status=status.HTTP_409_CONFLICT,
            )
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


@extend_schema_view(
    get=extend_schema(parameters=[
        OpenApiParameter(
            name="status", type=OpenApiTypes.STR,
            description="Filter by pending, paid, cancelled, or completed.",
        )
    ], responses=OrderSummarySerializer(many=True)),
    post=extend_schema(
        request=None,
        responses={201: CheckoutResponseSerializer, 200: CheckoutResponseSerializer},
        parameters=[
            OpenApiParameter(
                "Idempotency-Key",
                OpenApiTypes.STR,
                OpenApiParameter.HEADER,
                required=True,
            )
        ],
    ),
)
class MyOrderListView(generics.ListCreateAPIView):
    permission_classes = [IsCustomer]
    pagination_class = StandardResultsSetPagination

    def get_serializer_class(self):
        return OrderCreateSerializer if self.request.method == "POST" else OrderSummarySerializer

    def create(self, request, *args, **kwargs):
        key = request.headers.get("Idempotency-Key", "").strip()
        if not key or len(key) > 128:
            return Response(
                {"code": "idempotency_key_required", "detail": "A valid Idempotency-Key is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            payload, replayed = checkout_customer(request.user, key)
        except CheckoutError as exc:
            body = {"code": exc.code, "detail": exc.detail, **exc.extra}
            return Response(
                body,
                status=status.HTTP_409_CONFLICT
                if exc.code in {
                    "insufficient_wallet_balance",
                    "checkout_in_progress",
                    "basket_reservation_expired",
                }
                else status.HTTP_400_BAD_REQUEST,
            )
        response = Response(
            payload, status=status.HTTP_200_OK if replayed else status.HTTP_201_CREATED
        )
        if replayed:
            response["Idempotent-Replay"] = "true"
        return response

    def get_queryset(self):
        queryset = Order.objects.select_related("store").prefetch_related("items").filter(
            basket__user=self.request.user
        )
        requested_status = self.request.query_params.get("status")
        if requested_status is not None:
            valid_statuses = {value for value, _label in Order.Status.choices}
            if requested_status not in valid_statuses:
                raise ValidationError({"status": "Invalid order status."})
            queryset = queryset.filter(status=requested_status)
        return queryset.order_by("-created_at", "-pk")


class OrderCreateView(MyOrderListView):
    """Named TG-006 view; POST shares the order collection endpoint."""


class OrderDetailView(generics.RetrieveAPIView):
    permission_classes = [IsCustomer]
    serializer_class = OrderSerializer

    def get_queryset(self):
        return Order.objects.select_related("store").prefetch_related(
            "items__offer__device_variant__device_model__brand"
        ).filter(basket__user=self.request.user)


class OrderCancelView(generics.GenericAPIView):
    """Cancel an order and restore reserved stock exactly once."""

    permission_classes = [IsCustomer]
    serializer_class = OrderSerializer

    @extend_schema(request=None, responses=OrderCancellationResponseSerializer)
    def post(self, request, pk):
        try:
            order = Order.objects.select_related("basket").get(pk=pk)
        except Order.DoesNotExist as exc:
            raise NotFound() from exc
        if not request.user.is_staff and order.basket.user_id != request.user.id:
            raise PermissionDenied("You may only cancel your own orders.")
        try:
            order, restored, refund, wallet_balance = cancel_order(order.pk)
        except OrderCancellationError as exc:
            raise ValidationError({
                "code": "order_not_cancellable",
                "detail": "This order cannot be cancelled in its current state.",
            }) from exc
        return Response({
            "order": OrderSerializer(order, context=self.get_serializer_context()).data,
            "stock_restored": restored,
            "refund": WalletTransactionSerializer(refund).data if refund else None,
            "refund_created": refund is not None,
            "wallet_balance": wallet_balance,
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
