from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import AccountProfile

from wallet.models import Wallet, WalletTransaction


class TG016WalletTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.customer = user_model.objects.create_user(username="customer", password="pass")
        AccountProfile.objects.create(
            user=self.customer, account_type=AccountProfile.AccountType.CUSTOMER
        )
        self.store = user_model.objects.create_user(username="store", password="pass")
        AccountProfile.objects.create(
            user=self.store, account_type=AccountProfile.AccountType.STORE
        )
        self.staff = user_model.objects.create_user(
            username="staff", password="pass", is_staff=True
        )

    def test_wallet_is_customer_only(self):
        for user in (None, self.store, self.staff):
            self.client.force_authenticate(user)
            expected = status.HTTP_401_UNAUTHORIZED if user is None else status.HTTP_403_FORBIDDEN
            self.assertEqual(self.client.get(reverse("my-wallet")).status_code, expected)
            self.assertEqual(
                self.client.get(reverse("my-wallet-transactions")).status_code, expected
            )

    def test_charge_validates_amount_and_is_idempotent(self):
        self.client.force_authenticate(self.customer)
        response = self.client.post(
            reverse("wallet-charge"),
            {"amount": 1_000_000},
            HTTP_IDEMPOTENCY_KEY="charge-1",
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["wallet"]["balance"], 1_000_000)
        self.assertEqual(response.data["transaction"]["transaction_type"], "charge")

        replay = self.client.post(
            reverse("wallet-charge"),
            {"amount": 1_000_000},
            HTTP_IDEMPOTENCY_KEY="charge-1",
            format="json",
        )
        self.assertEqual(replay.status_code, status.HTTP_200_OK)
        self.assertEqual(replay.data, response.data)
        self.assertEqual(Wallet.objects.get(user=self.customer).balance, 1_000_000)
        self.assertEqual(
            WalletTransaction.objects.filter(wallet__user=self.customer).count(), 1
        )

        for amount in (0, -1, 100_000_001, True, "1.5"):
            invalid = self.client.post(
                reverse("wallet-charge"),
                {"amount": amount},
                HTTP_IDEMPOTENCY_KEY=f"invalid-{amount}",
                format="json",
            )
            self.assertEqual(invalid.status_code, status.HTTP_400_BAD_REQUEST)

    def test_charge_requires_idempotency_key(self):
        self.client.force_authenticate(self.customer)
        response = self.client.post(reverse("wallet-charge"), {"amount": 1_000_000}, format="json")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "idempotency_key_required")
