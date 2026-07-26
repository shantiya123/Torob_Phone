from django.urls import path

from .views import (
    MyOfferListView,
    MyStoreView,
    OfferCreateView,
    OfferDeleteView,
    OfferDetailView,
    OfferUpdateView,
    PublicStoreOfferListView,
    StoreDetailView,
    StoreDashboardView,
    StoreListView,
    StaffStoreApproveView,
    StaffStoreRejectView,
    StaffStoreReviewDetailView,
    StaffStoreReviewListView,
)

urlpatterns = [
    path("stores/", StoreListView.as_view(), name="store-list"),
    path("stores/me/", MyStoreView.as_view(), name="my-store"),
    path("stores/me/dashboard/", StoreDashboardView.as_view(), name="store-dashboard"),
    path("stores/me/offers/", MyOfferListView.as_view(), name="my-offer-list"),
    path(
        "stores/<int:store_id>/offers/",
        PublicStoreOfferListView.as_view(),
        name="public-store-offer-list",
    ),
    path("stores/<int:pk>/", StoreDetailView.as_view(), name="store-detail"),
    path("offers/", OfferCreateView.as_view(), name="offer-create"),
    path("offers/<int:pk>/", OfferDetailView.as_view(), name="offer-detail"),
    path("staff/store-reviews/", StaffStoreReviewListView.as_view(), name="staff-store-review-list"),
    path("staff/store-reviews/<int:pk>/", StaffStoreReviewDetailView.as_view(), name="staff-store-review-detail"),
    path("staff/store-reviews/<int:pk>/approve/", StaffStoreApproveView.as_view(), name="staff-store-review-approve"),
    path("staff/store-reviews/<int:pk>/reject/", StaffStoreRejectView.as_view(), name="staff-store-review-reject"),
]
