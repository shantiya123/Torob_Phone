from django.urls import path

from .views import MyWalletTransactionListView, MyWalletView


urlpatterns = [
    path("wallet/", MyWalletView.as_view(), name="my-wallet"),
    path("wallet/transactions/", MyWalletTransactionListView.as_view(), name="my-wallet-transactions"),
]
