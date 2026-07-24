"""Read-only wallet API endpoints."""

from rest_framework import generics

from api_pagination import StandardResultsSetPagination

from .models import Wallet, WalletTransaction
from .serializers import WalletSerializer, WalletTransactionSerializer


class MyWalletView(generics.RetrieveAPIView):
    serializer_class = WalletSerializer

    def get_object(self):
        wallet, _ = Wallet.objects.get_or_create(user=self.request.user)
        return wallet


class MyWalletTransactionListView(generics.ListAPIView):
    serializer_class = WalletTransactionSerializer
    pagination_class = StandardResultsSetPagination

    def get_queryset(self):
        wallet, _ = Wallet.objects.get_or_create(user=self.request.user)
        return WalletTransaction.objects.filter(wallet=wallet).order_by("-created_at", "-pk")
