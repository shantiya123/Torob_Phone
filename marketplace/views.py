from django.db.models import Prefetch
from rest_framework import generics, permissions

from api_pagination import StandardResultsSetPagination
from api_permissions import IsApprovedStore, IsStoreOwner, OwnsOffer, user_store

from .models import Offer, Store
from .serializers import (
    OfferCreateSerializer,
    OfferDetailSerializer,
    OfferListSerializer,
    OfferUpdateSerializer,
    StoreOwnerSerializer,
    StorePublicDetailSerializer,
    StorePublicListSerializer,
)


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
