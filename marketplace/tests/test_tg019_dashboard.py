from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import AccountProfile
from catalog.models import Brand, DeviceModel, DeviceVariant
from marketplace.models import Offer, Store
from shopping.models import Basket, Order, OrderItem


class TG019DashboardTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.owner = user_model.objects.create_user(username="owner", password="pass")
        profile = AccountProfile.objects.create(
            user=self.owner, account_type=AccountProfile.AccountType.STORE
        )
        self.store = Store.objects.create(
            account_profile=profile, name="Store", slug="store",
            business_phone="1", address="address", status=Store.Status.ACTIVE
        )
        brand = Brand.objects.create(name="Brand", slug="brand")
        model = DeviceModel.objects.create(
            brand=brand, model_name="Phone", model_key="phone", is_catalog_eligible=True
        )
        hidden_model = DeviceModel.objects.create(
            brand=brand, model_name="Hidden", model_key="hidden", is_catalog_eligible=False
        )
        self.variant = DeviceVariant.objects.create(
            device_model=model, configuration_key="8-128", ram_gb=8, storage_gb=128
        )
        hidden_variant = DeviceVariant.objects.create(
            device_model=hidden_model, configuration_key="4-64", ram_gb=4, storage_gb=64
        )
        self.offer = Offer.objects.create(
            store=self.store, device_variant=self.variant, price=1000, quantity=3
        )
        Offer.objects.create(
            store=self.store, device_variant=hidden_variant, price=800, quantity=2
        )
        self.client.force_authenticate(self.owner)

    def test_dashboard_returns_operational_metrics_and_recent_data(self):
        response = self.client.get(reverse("store-dashboard"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["operational_access"])
        self.assertEqual(response.data["offers"]["total"], 2)
        self.assertEqual(response.data["offers"]["publicly_available"], 1)
        self.assertEqual(response.data["offers"]["unavailable_variant"], 1)
        self.assertEqual(response.data["offers"]["total_available_units"], 5)
        self.assertEqual(len(response.data["recent_offers"]), 2)

    def test_dashboard_restricts_inactive_store(self):
        self.store.status = Store.Status.PENDING
        self.store.save(update_fields=["status"])
        response = self.client.get(reverse("store-dashboard"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["operational_access"])
        self.assertEqual(response.data["reason"], "store_not_active")
        self.assertIsNone(response.data["offers"])

    def test_store_order_list_filters(self):
        customer = get_user_model().objects.create_user(username="customer", password="pass")
        AccountProfile.objects.create(
            user=customer, account_type=AccountProfile.AccountType.CUSTOMER
        )
        basket = Basket.objects.create(user=customer)
        order = Order.objects.create(basket=basket, store=self.store, status=Order.Status.PAID)
        OrderItem.objects.create(order=order, offer=self.offer, quantity=1, unit_price=1000)
        response = self.client.get(reverse("my-store-order-list"), {"status": "paid"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(
            self.client.get(reverse("my-store-order-list"), {"status": "invalid"}).status_code,
            status.HTTP_400_BAD_REQUEST,
        )

    def test_non_store_roles_are_denied(self):
        customer = get_user_model().objects.create_user(username="customer", password="pass")
        AccountProfile.objects.create(
            user=customer, account_type=AccountProfile.AccountType.CUSTOMER
        )
        self.client.force_authenticate(customer)
        self.assertEqual(
            self.client.get(reverse("store-dashboard")).status_code,
            status.HTTP_403_FORBIDDEN,
        )

    def test_catalog_detail_reports_owned_offer_and_market_context(self):
        response = self.client.get(
            reverse("store-catalog-phone-detail", args=[self.variant.device_model_id])
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        variant = response.data["variants"][0]
        self.assertEqual(variant["owned_offer"]["id"], self.offer.pk)
        self.assertEqual(variant["market"]["offer_count"], 1)
        self.assertEqual(variant["market"]["lowest_price"], 1000)
