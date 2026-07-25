from django.urls import path

from .views import MyWalletTransactionListView, MyWalletView, WalletChargeView


urlpatterns = [
    path("wallet/", MyWalletView.as_view(), name="my-wallet"),
    path("wallet/transactions/", MyWalletTransactionListView.as_view(), name="my-wallet-transactions"),
    path("wallet/charge/", WalletChargeView.as_view(), name="wallet-charge"),
]
