from django.db import transaction
from django.db.models import Prefetch, Q
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
    StoreOwnerSerializer,
    StorePublicDetailSerializer,
    StorePublicListSerializer,
    StoreReviewDetailSerializer,
    StoreReviewQueueSerializer,
    StoreReviewRejectSerializer,
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


class MyStoreView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsStoreOwner]
    serializer_class = StoreOwnerSerializer
    http_method_names = ["get", "patch", "head", "options"]

    def get_object(self):
        return user_store(self.request.user)


class DeviceVariantOfferListView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = OfferListSerializer
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        queryset = Offer.objects.select_related("store").filter(
            device_variant_id=self.kwargs["device_variant_id"],
            store__status=Store.Status.ACTIVE,
            quantity__gt=0,
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
        queryset = Offer.objects.select_related("store", "device_variant__device_model__brand")
        if self.request.method == "GET":
            return queryset.filter(store__status=Store.Status.ACTIVE)
        return queryset.filter(store=user_store(self.request.user))


class MyOfferListView(generics.ListAPIView):
    permission_classes = [IsStoreOwner]
    serializer_class = OfferDetailSerializer
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        return Offer.objects.select_related(
            "store", "device_variant__device_model__brand"
        ).filter(store=user_store(self.request.user)).order_by("-updated_at", "-pk")


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
