from django.urls import path

from marketplace.views import DeviceVariantOfferListView

from .views import DeviceVariantDetailView, SearchView

urlpatterns = [
    path("search/", SearchView.as_view(), name="search"),
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
