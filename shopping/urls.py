from django.urls import path

from .views import (
    BasketItemCreateView,
    BasketItemDeleteView,
    BasketItemUpdateView,
    MyBasketView,
    MyOrderListView,
    MyStoreOrderListView,
    OrderCancelView,
    OrderCreateView,
    OrderDetailView,
    StoreOrderDetailView,
)

urlpatterns = [
    path("basket/", MyBasketView.as_view(), name="my-basket"),
    path("basket/items/", BasketItemCreateView.as_view(), name="basket-item-create"),
    path("basket/items/<int:pk>/", BasketItemUpdateView.as_view(), name="basket-item-update"),
    path("orders/", MyOrderListView.as_view(), name="my-order-list"),
    path("orders/<int:pk>/", OrderDetailView.as_view(), name="order-detail"),
    path("orders/<int:pk>/cancel/", OrderCancelView.as_view(), name="order-cancel"),
    path("stores/me/orders/", MyStoreOrderListView.as_view(), name="my-store-order-list"),
    path("stores/me/orders/<int:pk>/", StoreOrderDetailView.as_view(), name="store-order-detail"),
]
