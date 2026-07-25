from django.urls import path

from marketplace.views import DeviceVariantOfferListView

from .views import (
    DeviceVariantDetailView,
    PhoneExplanationAPIView,
    QuerySetResetView,
    QuerySetStateView,
    SearchView,
    StoreCatalogPhoneDetailView,
    StoreCatalogPhoneListView,
)

urlpatterns = [
    path("search/", SearchView.as_view(), name="search"),
    path("search/reset/", QuerySetResetView.as_view(), name="search-reset"),
    path("search/state/", QuerySetStateView.as_view(), name="search-state"),
    path("catalog/phones/", StoreCatalogPhoneListView.as_view(), name="store-catalog-phone-list"),
    path("catalog/phones/<int:pk>/", StoreCatalogPhoneDetailView.as_view(), name="store-catalog-phone-detail"),
    path("catalog/phones/<int:pk>/explanation/", PhoneExplanationAPIView.as_view(), name="phone-explanation"),
    path(
        "catalog/device-variants/<int:pk>/explanation/",
        PhoneExplanationAPIView.as_view(),
        name="device-variant-explanation",
    ),
    path(
        "catalog/device-variants/<int:pk>/",
        DeviceVariantDetailView.as_view(),
        name="device-variant-detail",
    ),
    path(
        "catalog/device-variants/<int:device_variant_id>/offers/",
        DeviceVariantOfferListView.as_view(),
        name="device-variant-offers",
    ),
]
