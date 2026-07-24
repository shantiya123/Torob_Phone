from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from wallet.models import Wallet, WalletTransaction


class WalletApiTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="wallet-user", password="pass")
        self.other = get_user_model().objects.create_user(username="other-user", password="pass")

    def test_wallet_is_lazy_and_transactions_are_scoped(self):
        self.client.force_authenticate(self.user)
        response = self.client.get(reverse("my-wallet"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        wallet = Wallet.objects.get(user=self.user)
        WalletTransaction.objects.create(wallet=wallet, amount=10, balance_after=10, transaction_type="charge")
        other_wallet = Wallet.objects.create(user=self.other)
        WalletTransaction.objects.create(wallet=other_wallet, amount=20, balance_after=20, transaction_type="charge")
        response = self.client.get(reverse("my-wallet-transactions"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["results"]), 1)

    def test_schema_and_documentation_endpoints_are_available(self):
        self.assertEqual(self.client.get("/api/schema/").status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.get("/api/docs/").status_code, status.HTTP_200_OK)
