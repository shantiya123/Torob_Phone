from django.urls import path

from .views import (
    MyOfferListView,
    MyStoreView,
    OfferCreateView,
    OfferDeleteView,
    OfferDetailView,
    OfferUpdateView,
    StoreDetailView,
    StoreListView,
)

urlpatterns = [
    path("stores/", StoreListView.as_view(), name="store-list"),
    path("stores/me/", MyStoreView.as_view(), name="my-store"),
    path("stores/me/offers/", MyOfferListView.as_view(), name="my-offer-list"),
    path("stores/<int:pk>/", StoreDetailView.as_view(), name="store-detail"),
    path("offers/", OfferCreateView.as_view(), name="offer-create"),
    path("offers/<int:pk>/", OfferDetailView.as_view(), name="offer-detail"),
]
