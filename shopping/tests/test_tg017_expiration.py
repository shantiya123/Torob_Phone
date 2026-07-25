from datetime import timedelta
from io import StringIO

from django.core.management import call_command
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import AccountProfile
from catalog.models import Brand, DeviceModel, DeviceVariant
from marketplace.models import Offer, Store
from shopping.models import Basket, BasketItem, Order
from wallet.models import Wallet


class TG017ReservationExpirationTests(APITestCase):
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
            store=self.store, device_variant=self.variant, price=900, quantity=5
        )
        self.basket = Basket.objects.create(user=self.customer)
        self.client.force_authenticate(self.customer)

    def add(self, quantity=1):
        return self.client.post(
            reverse("basket-item-create"),
            {"offer": self.offer.pk, "quantity": quantity},
            format="json",
        )

    def test_new_reservation_exposes_server_expiration_and_refreshes_on_change(self):
        response = self.add(2)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        first_expiry = response.data["expires_at"]
        self.assertIn("remaining_seconds", response.data)
        item = BasketItem.objects.get()
        self.assertEqual(item.quantity, 2)
        response = self.client.patch(
            reverse("basket-item-update", args=[item.pk]), {"quantity": 1}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertGreaterEqual(response.data["expires_at"], first_expiry)

    def test_basket_read_releases_expired_stock_and_removes_item(self):
        response = self.add(2)
        item = BasketItem.objects.get()
        item.expires_at = timezone.now() - timedelta(seconds=1)
        item.save(update_fields=["expires_at"])
        self.offer.refresh_from_db()
        self.assertEqual(self.offer.quantity, 3)

        response = self.client.get(reverse("my-basket"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["items"], [])
        self.offer.refresh_from_db()
        self.assertEqual(self.offer.quantity, 5)
        self.assertFalse(BasketItem.objects.exists())

    def test_readding_expired_offer_releases_old_reservation_and_uses_current_price(self):
        self.add(1)
        item = BasketItem.objects.get()
        item.expires_at = timezone.now() - timedelta(seconds=1)
        item.save(update_fields=["expires_at"])
        self.offer.price = 1200
        self.offer.save(update_fields=["price"])
        response = self.add(1)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        item = BasketItem.objects.get()
        item.refresh_from_db()
        self.assertEqual(item.unit_price, 1200)
        self.assertEqual(item.quantity, 1)
        self.offer.refresh_from_db()
        self.assertEqual(self.offer.quantity, 4)

    def test_expired_update_returns_conflict_without_silent_recreation(self):
        self.add(1)
        item = BasketItem.objects.get()
        item.expires_at = timezone.now() - timedelta(seconds=1)
        item.save(update_fields=["expires_at"])
        response = self.client.patch(
            reverse("basket-item-update", args=[item.pk]), {"quantity": 2}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.data["code"], "basket_reservation_expired")
        self.assertTrue(BasketItem.objects.filter(pk=item.pk).exists())

    def test_checkout_expired_line_releases_it_and_does_not_charge(self):
        self.add(1)
        item = BasketItem.objects.get()
        item.expires_at = timezone.now() - timedelta(seconds=1)
        item.save(update_fields=["expires_at"])
        Wallet.objects.create(user=self.customer, balance=5000)
        response = self.client.post(
            reverse("my-order-list"),
            {},
            HTTP_IDEMPOTENCY_KEY="expired-checkout",
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.data["code"], "basket_reservation_expired")
        self.assertFalse(BasketItem.objects.exists())
        self.assertEqual(Order.objects.count(), 0)
        self.assertEqual(Wallet.objects.get(user=self.customer).balance, 5000)
        self.offer.refresh_from_db()
        self.assertEqual(self.offer.quantity, 5)

    def test_cleanup_command_is_bounded_and_idempotent(self):
        self.add(2)
        item = BasketItem.objects.get()
        item.expires_at = timezone.now() - timedelta(seconds=1)
        item.save(update_fields=["expires_at"])
        output = StringIO()
        call_command("release_expired_basket_reservations", stdout=output, batch_size=1)
        self.assertFalse(BasketItem.objects.exists())
        self.offer.refresh_from_db()
        self.assertEqual(self.offer.quantity, 5)
        call_command("release_expired_basket_reservations", stdout=output, batch_size=1)
        self.offer.refresh_from_db()
        self.assertEqual(self.offer.quantity, 5)
