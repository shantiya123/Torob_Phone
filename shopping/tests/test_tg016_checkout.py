from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import AccountProfile
from catalog.models import Brand, DeviceModel, DeviceVariant
from marketplace.models import Offer, Store
from shopping.models import Basket, BasketItem, Order
from wallet.models import Wallet, WalletTransaction


class TG016CheckoutTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.customer = user_model.objects.create_user(username="customer", password="pass")
        AccountProfile.objects.create(
            user=self.customer, account_type=AccountProfile.AccountType.CUSTOMER
        )
        profile = AccountProfile.objects.create(
            user=user_model.objects.create_user(username="seller", password="pass"),
            account_type=AccountProfile.AccountType.STORE,
        )
        self.store = Store.objects.create(
            account_profile=profile,
            name="Store",
            slug="store",
            business_phone="1",
            address="address",
            status=Store.Status.ACTIVE,
        )
        brand = Brand.objects.create(name="Brand", slug="brand")
        model = DeviceModel.objects.create(
            brand=brand, model_name="Phone", model_key="phone", is_catalog_eligible=True
        )
        self.variant = DeviceVariant.objects.create(
            device_model=model, configuration_key="8-128", ram_gb=8, storage_gb=128
        )
        self.offer = Offer.objects.create(
            store=self.store, device_variant=self.variant, price=999, quantity=5
        )
        self.basket = Basket.objects.create(user=self.customer)
        BasketItem.objects.create(
            basket=self.basket, offer=self.offer, quantity=2, unit_price=900
        )
        self.offer.quantity = 3
        self.offer.save()
        self.wallet = Wallet.objects.create(user=self.customer, balance=5_000)

    def checkout(self, key="checkout-1"):
        self.client.force_authenticate(self.customer)
        return self.client.post(
            reverse("my-order-list"),
            {},
            HTTP_IDEMPOTENCY_KEY=key,
            format="json",
        )

    def test_checkout_is_atomic_paid_structured_and_uses_reserved_price(self):
        response = self.checkout()
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["order_count"], 1)
        self.assertEqual(response.data["total"], 1_800)
        self.assertEqual(response.data["orders"][0]["status"], Order.Status.PAID)
        self.assertEqual(response.data["wallet_balance"], 3_200)
        self.assertFalse(BasketItem.objects.filter(basket=self.basket).exists())
        self.offer.refresh_from_db()
        self.assertEqual(self.offer.quantity, 3)
        order = Order.objects.get()
        self.assertEqual(order.items.get().unit_price, 900)
        purchase = WalletTransaction.objects.get(transaction_type="purchase")
        self.assertEqual(purchase.amount, -1_800)
        self.assertEqual(purchase.balance_after, 3_200)

        replay = self.checkout()
        self.assertEqual(replay.status_code, status.HTTP_200_OK)
        self.assertEqual(replay.data, response.data)
        self.assertEqual(Order.objects.count(), 1)
        self.assertEqual(
            WalletTransaction.objects.filter(transaction_type="purchase").count(), 1
        )

    def test_missing_key_and_insufficient_balance_leave_state_unchanged(self):
        self.client.force_authenticate(self.customer)
        missing = self.client.post(reverse("my-order-list"), {}, format="json")
        self.assertEqual(missing.status_code, status.HTTP_400_BAD_REQUEST)
        self.wallet.balance = 100
        self.wallet.save()
        response = self.checkout("insufficient")
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.data["code"], "insufficient_wallet_balance")
        self.assertEqual(Order.objects.count(), 0)
        self.assertTrue(BasketItem.objects.filter(basket=self.basket).exists())
        self.assertEqual(Wallet.objects.get(pk=self.wallet.pk).balance, 100)

    def test_paid_cancellation_refunds_once_and_restores_stock_once(self):
        response = self.checkout()
        order_id = response.data["orders"][0]["id"]
        response = self.client.post(reverse("order-cancel", args=[order_id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["stock_restored"])
        self.assertTrue(response.data["refund_created"])
        self.assertEqual(response.data["refund"]["amount"], 1_800)
        self.assertEqual(response.data["wallet_balance"], 5_000)
        self.offer.refresh_from_db()
        self.assertEqual(self.offer.quantity, 5)

        response = self.client.post(reverse("order-cancel", args=[order_id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["stock_restored"])
        self.assertFalse(response.data["refund_created"])
        self.assertEqual(WalletTransaction.objects.filter(transaction_type="refund").count(), 1)
        self.offer.refresh_from_db()
        self.assertEqual(self.offer.quantity, 5)

    def test_invalid_checkout_context_does_not_charge(self):
        self.offer.device_variant.is_available = False
        self.offer.device_variant.save()
        response = self.checkout("invalid-variant")
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "checkout_variant_unavailable")
        self.assertEqual(Order.objects.count(), 0)
        self.assertEqual(Wallet.objects.get(pk=self.wallet.pk).balance, 5_000)
        self.assertTrue(BasketItem.objects.filter(basket=self.basket).exists())
