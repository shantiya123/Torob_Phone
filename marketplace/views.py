from django.db import transaction
from django.db.models import Count, F, Q, Sum
from django.shortcuts import get_object_or_404
from django.utils import timezone
from drf_spectacular.utils import OpenApiExample, OpenApiParameter, OpenApiTypes, extend_schema
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from api_pagination import StandardResultsSetPagination
from api_permissions import IsApprovedStore, IsStaffUser, IsStoreOwner, OwnsOffer, user_store

from .models import Offer, Store
from .serializers import (
    OfferCreateSerializer,
    OfferDetailSerializer,
    OfferListSerializer,
    OfferUpdateSerializer,
    StoreOperationalOfferSerializer,
    StoreOwnerSerializer,
    StorePublicDetailSerializer,
    StorePublicListSerializer,
    StoreReviewDetailSerializer,
    StoreReviewQueueSerializer,
    StoreReviewRejectSerializer,
)


def public_offer_queryset():
    """Canonical public Offer eligibility rules shared by public endpoints."""

    return Offer.objects.select_related(
        "store", "device_variant__device_model__brand"
    ).filter(
        store__status=Store.Status.ACTIVE,
        quantity__gt=0,
        device_variant__is_available=True,
        device_variant__device_model__is_catalog_eligible=True,
    )


class _StaffStoreReviewQuerysetMixin:
    def get_queryset(self):
        return Store.objects.select_related(
            "account_profile__user", "legal_profile", "reviewed_by"
        )


class StaffStoreReviewListView(_StaffStoreReviewQuerysetMixin, generics.ListAPIView):
    permission_classes = [IsStaffUser]
    serializer_class = StoreReviewQueueSerializer
    pagination_class = StandardResultsSetPagination

    @extend_schema(
        parameters=[
            OpenApiParameter("status", OpenApiTypes.STR, OpenApiParameter.QUERY, enum=[choice for choice, _ in Store.Status.choices], description="Defaults to pending."),
            OpenApiParameter("search", OpenApiTypes.STR, OpenApiParameter.QUERY, description="Case-insensitive Store, owner, or legal-name search."),
        ],
        responses=StoreReviewQueueSerializer,
        description="Staff-only review queue. The review identifier is the Store ID.",
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        queryset = super().get_queryset()
        requested_status = self.request.query_params.get("status", Store.Status.PENDING)
        valid_statuses = {value for value, _ in Store.Status.choices}
        if requested_status not in valid_statuses:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({"status": "Choose a valid store status."})
        search = self.request.query_params.get("search", "").strip()
        queryset = queryset.filter(status=requested_status)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search)
                | Q(account_profile__user__username__icontains=search)
                | Q(account_profile__user__email__icontains=search)
                | Q(legal_profile__legal_name__icontains=search)
                | Q(legal_profile__business_registration_number__icontains=search)
            )
        return queryset.order_by("created_at", "pk")


class StaffStoreReviewDetailView(_StaffStoreReviewQuerysetMixin, generics.RetrieveAPIView):
    permission_classes = [IsStaffUser]
    serializer_class = StoreReviewDetailSerializer

    @extend_schema(
        responses=StoreReviewDetailSerializer,
        description="Staff-only registration detail. The path identifier is the Store ID, not a separate review record.",
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)


class _StaffStoreReviewActionView(APIView):
    permission_classes = [IsStaffUser]
    action_status = None

    def _detail_queryset(self):
        return Store.objects.select_related("account_profile__user", "legal_profile", "reviewed_by")

    def _response(self, store):
        return Response(StoreReviewDetailSerializer(store).data)

    @transaction.atomic
    def _transition(self, request, pk, rejection_reason=""):
        try:
            store = Store.objects.select_for_update().get(pk=pk)
        except Store.DoesNotExist:
            return Response({"detail": "Not found."}, status=status.HTTP_404_NOT_FOUND)
        if store.status == self.action_status:
            return self._response(self._detail_queryset().get(pk=store.pk))
        if store.status != Store.Status.PENDING:
            detail = f"This Store cannot be {self.action_status} from its current status."
            return Response(
                {"code": "store_review_invalid_transition", "detail": detail},
                status=status.HTTP_409_CONFLICT,
            )
        store.status = self.action_status
        store.rejection_reason = rejection_reason
        store.reviewed_by = request.user
        store.reviewed_at = timezone.now()
        store.save(update_fields=["status", "rejection_reason", "reviewed_by", "reviewed_at", "updated_at"])
        return self._response(self._detail_queryset().get(pk=store.pk))


class StaffStoreApproveView(_StaffStoreReviewActionView):
    action_status = Store.Status.ACTIVE

    @extend_schema(
        request=None,
        responses={200: StoreReviewDetailSerializer},
        description="Staff-only pending-to-active decision. Repeating approval of an active Store is idempotent and preserves its original review metadata.",
    )
    def post(self, request, pk):
        return self._transition(request, pk)


class StaffStoreRejectView(_StaffStoreReviewActionView):
    action_status = Store.Status.REJECTED

    @extend_schema(
        request=StoreReviewRejectSerializer,
        responses={200: StoreReviewDetailSerializer},
        description="Staff-only pending-to-rejected decision. A non-blank rejection_reason is required; repeated rejection is idempotent.",
    )
    def post(self, request, pk):
        serializer = StoreReviewRejectSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return self._transition(request, pk, serializer.validated_data["rejection_reason"])


class StoreListView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = StorePublicListSerializer
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        queryset = Store.objects.filter(status=Store.Status.ACTIVE).order_by("name", "pk")
        search = self.request.query_params.get("search", "").strip()
        return queryset.filter(name__icontains=search) if search else queryset


class StoreDetailView(generics.RetrieveAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = StorePublicDetailSerializer
    queryset = Store.objects.filter(status=Store.Status.ACTIVE)


class PublicStoreOfferListView(generics.ListAPIView):
    """Paginated public offers for one publicly active Store."""

    permission_classes = [permissions.AllowAny]
    serializer_class = OfferDetailSerializer
    pagination_class = StandardResultsSetPagination

    @extend_schema(
        parameters=[
            OpenApiParameter(
                "ordering",
                OpenApiTypes.STR,
                OpenApiParameter.QUERY,
                enum=["newest", "price_asc", "price_desc"],
                description="Defaults to newest. Use page_size=5 for the Storefront preview.",
            ),
        ],
        responses=OfferDetailSerializer,
        description=(
            "Public active offers for a Store ID. Hidden or missing Stores return 404; "
            "only positive-quantity offers are included."
        ),
    )
    def get(self, request, *args, **kwargs):
        return super().get(request, *args, **kwargs)

    def get_queryset(self):
        get_object_or_404(
            Store.objects.filter(status=Store.Status.ACTIVE),
            pk=self.kwargs["store_id"],
        )
        ordering = self.request.query_params.get("ordering", "newest")
        ordering_fields = {
            "newest": ("-created_at", "-pk"),
            "price_asc": ("price", "pk"),
            "price_desc": ("-price", "pk"),
        }
        return (
            public_offer_queryset()
            .filter(store_id=self.kwargs["store_id"])
            .order_by(*ordering_fields.get(ordering, ordering_fields["newest"]))
        )


class MyStoreView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsStoreOwner]
    serializer_class = StoreOwnerSerializer
    http_method_names = ["get", "patch", "head", "options"]

    def get_object(self):
        return user_store(self.request.user)


class StoreDashboardView(APIView):
    permission_classes = [IsStoreOwner]

    @extend_schema(
        responses=dict,
        description="Store-only operational summary. Inactive stores receive a restricted state.",
    )
    def get(self, request):
        from django.utils import timezone
        from shopping.models import BasketItem, Order
        from shopping.serializers import OrderSummarySerializer

        store = user_store(request.user)
        base = {
            "store": {
                "id": store.pk,
                "name": store.name,
                "slug": store.slug,
                "logo": request.build_absolute_uri(store.logo.url) if store.logo else None,
                "status": store.status,
                "rejection_reason": store.rejection_reason or "",
            },
            "generated_at": timezone.now(),
        }
        if store.status != Store.Status.ACTIVE:
            return Response({
                **base,
                "operational_access": False,
                "reason": "store_not_active",
                "offers": None,
                "orders": None,
                "recent_orders": [],
                "recent_offers": [],
            })

        offers = Offer.objects.filter(store=store)
        offer_metrics = offers.aggregate(
            total=Count("pk"),
            out_of_stock=Count("pk", filter=Q(quantity__lte=0)),
            unavailable_variant=Count(
                "pk",
                filter=Q(quantity__gt=0) & (
                    Q(device_variant__is_available=False)
                    | Q(device_variant__device_model__is_catalog_eligible=False)
                ),
            ),
            total_available_units=Sum("quantity"),
        )
        public_qs = public_offer_queryset().filter(store=store)
        active_reserved = BasketItem.objects.filter(
            offer__store=store, expires_at__gt=timezone.now()
        ).aggregate(units=Sum("quantity"))["units"] or 0
        order_counts = {
            status_value: Order.objects.filter(store=store, status=status_value).count()
            for status_value, _label in Order.Status.choices
        }
        recent_orders = Order.objects.filter(store=store).prefetch_related("items").order_by(
            "-created_at", "-pk"
        )[:5]
        recent_offers = offers.select_related(
            "device_variant__device_model__brand"
        ).order_by("-updated_at", "-pk")[:5]
        return Response({
            **base,
            "operational_access": True,
            "reason": None,
            "offers": {
                "total": offer_metrics["total"] or 0,
                "publicly_available": public_qs.count(),
                "out_of_stock": offer_metrics["out_of_stock"] or 0,
                "unavailable_variant": offer_metrics["unavailable_variant"] or 0,
                "reserved_units": active_reserved,
                "total_available_units": offer_metrics["total_available_units"] or 0,
            },
            "orders": {
                "paid": order_counts.get(Order.Status.PAID, 0),
                "completed": order_counts.get(Order.Status.COMPLETED, 0),
                "cancelled": order_counts.get(Order.Status.CANCELLED, 0),
                "open": order_counts.get(Order.Status.PAID, 0),
            },
            "recent_orders": OrderSummarySerializer(recent_orders, many=True).data,
            "recent_offers": StoreOperationalOfferSerializer(recent_offers, many=True).data,
        })


class DeviceVariantOfferListView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = OfferListSerializer
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        queryset = public_offer_queryset().filter(
            device_variant_id=self.kwargs["device_variant_id"]
        )
        ordering = self.request.query_params.get("ordering", "price")
        return queryset.order_by("-price" if ordering == "price_desc" else "price", "pk")


class OfferDetailView(generics.RetrieveUpdateDestroyAPIView):
    http_method_names = ["get", "patch", "delete", "head", "options"]

    def get_permissions(self):
        classes = [permissions.AllowAny] if self.request.method == "GET" else [IsApprovedStore, OwnsOffer]
        return [permission() for permission in classes]

    def get_serializer_class(self):
        return OfferDetailSerializer if self.request.method == "GET" else OfferUpdateSerializer

    def get_queryset(self):
        if self.request.method == "GET":
            return public_offer_queryset()
        return Offer.objects.select_related("store", "device_variant__device_model__brand").filter(
            store=user_store(self.request.user)
        )


class MyOfferListView(generics.ListAPIView):
    permission_classes = [IsStoreOwner]
    serializer_class = StoreOperationalOfferSerializer
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        queryset = Offer.objects.select_related(
            "store", "device_variant__device_model__brand"
        ).filter(store=user_store(self.request.user))
        search = self.request.query_params.get("search", "").strip()
        if search:
            queryset = queryset.filter(
                Q(device_variant__device_model__model_name__icontains=search)
                | Q(device_variant__device_model__brand__name__icontains=search)
            )
        stock = self.request.query_params.get("stock")
        if stock == "available":
            queryset = queryset.filter(quantity__gt=0)
        elif stock == "out":
            queryset = queryset.filter(quantity=0)
        return queryset.order_by("-updated_at", "-pk")


class OfferCreateView(generics.CreateAPIView):
    permission_classes = [IsApprovedStore]
    serializer_class = OfferCreateSerializer


class _OwnedOfferMixin:
    permission_classes = [OwnsOffer]

    def get_queryset(self):
        return Offer.objects.filter(store=user_store(self.request.user))


class OfferUpdateView(OfferDetailView):
    """Named TG-006 view; PATCH is routed through OfferDetailView's shared endpoint."""


class OfferDeleteView(OfferDetailView):
    """Named TG-006 view; DELETE is routed through OfferDetailView's shared endpoint."""
