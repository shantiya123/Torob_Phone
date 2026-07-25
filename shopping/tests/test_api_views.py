from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import AccountProfile
from catalog.models import Brand, DeviceModel, DeviceVariant
from catalog.query_set import empty_query_set
from marketplace.models import Offer, Store
from shopping.models import Basket, BasketItem, Order, OrderItem


class ApiViewTestCase(APITestCase):
    def make_account(self, username, account_type):
        user = get_user_model().objects.create_user(username=username, password="Strong-pass-123")
        profile = AccountProfile.objects.create(user=user, account_type=account_type)
        return user, profile

    def make_store(self, username, status_value=Store.Status.ACTIVE):
        user, profile = self.make_account(username, AccountProfile.AccountType.STORE)
        store = Store.objects.create(
            account_profile=profile,
            name=username,
            slug=username,
            business_phone="123",
            address="address",
            status=status_value,
        )
        return user, store

    def setUp(self):
        self.customer, _ = self.make_account("customer", AccountProfile.AccountType.CUSTOMER)
        self.other_customer, _ = self.make_account("other", AccountProfile.AccountType.CUSTOMER)
        self.store_user, self.store = self.make_store("active-store")
        brand = Brand.objects.create(name="Example", slug="example")
        model = DeviceModel.objects.create(
            brand=brand,
            model_name="Phone",
            model_key="phone",
            is_catalog_eligible=True,
        )
        self.variant = DeviceVariant.objects.create(
            device_model=model,
            configuration_key="8-128",
            ram_gb=8,
            storage_gb=128,
        )
        self.offer = Offer.objects.create(
            store=self.store, device_variant=self.variant, price=900, quantity=5
        )

    def test_public_and_private_store_views_are_separated(self):
        response = self.client.get(reverse("store-detail", args=[self.store.pk]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn("reviewed_by", response.data)

        self.client.force_authenticate(self.store_user)
        response = self.client.get(reverse("my-store"))
        self.assertEqual(response.data["id"], self.store.pk)

    def test_pending_store_cannot_create_offer(self):
        pending_user, _ = self.make_store("pending-store", Store.Status.PENDING)
        self.client.force_authenticate(pending_user)
        response = self.client.post(
            reverse("offer-create"),
            {"device_variant": self.variant.pk, "price": 1000, "quantity": 1},
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_offer_update_is_limited_to_owner(self):
        other_store_user, _ = self.make_store("other-store")
        self.client.force_authenticate(other_store_user)
        response = self.client.patch(reverse("offer-detail", args=[self.offer.pk]), {"price": 800})
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.offer.refresh_from_db()
        self.assertEqual(self.offer.price, 900)

    def test_basket_reserves_and_delete_releases_stock(self):
        self.client.force_authenticate(self.customer)
        response = self.client.post(reverse("basket-item-create"), {"offer": self.offer.pk, "quantity": 2})
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        item = BasketItem.objects.get(pk=response.data["id"])
        self.assertEqual(item.unit_price, 900)
        self.offer.refresh_from_db()
        self.assertEqual(self.offer.quantity, 3)

        response = self.client.delete(reverse("basket-item-update", args=[item.pk]))
        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.offer.refresh_from_db()
        self.assertEqual(self.offer.quantity, 5)

    def test_customer_cannot_read_another_customers_order(self):
        basket = Basket.objects.create(user=self.other_customer)
        order = Order.objects.create(basket=basket, store=self.store)
        self.client.force_authenticate(self.customer)
        response = self.client.get(reverse("order-detail", args=[order.pk]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_customer_cannot_delete_another_customers_basket_item(self):
        basket = Basket.objects.create(user=self.other_customer)
        item = BasketItem.objects.create(basket=basket, offer=self.offer, quantity=1, unit_price=900)
        self.client.force_authenticate(self.customer)
        response = self.client.delete(reverse("basket-item-update", args=[item.pk]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.offer.refresh_from_db()
        self.assertEqual(self.offer.quantity, 5)

    def test_cancelling_order_restores_stock_once(self):
        basket = Basket.objects.create(user=self.customer)
        order = Order.objects.create(basket=basket, store=self.store, status=Order.Status.PENDING)
        OrderItem.objects.create(order=order, offer=self.offer, quantity=2, unit_price=900)
        self.offer.quantity = 3
        self.offer.save()
        self.client.force_authenticate(self.customer)

        response = self.client.post(reverse("order-cancel", args=[order.pk]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["stock_restored"])
        self.offer.refresh_from_db()
        self.assertEqual(self.offer.quantity, 5)

        response = self.client.post(reverse("order-cancel", args=[order.pk]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["stock_restored"])
        self.offer.refresh_from_db()
        self.assertEqual(self.offer.quantity, 5)

    def test_completed_order_cannot_be_cancelled(self):
        basket = Basket.objects.create(user=self.customer)
        order = Order.objects.create(basket=basket, store=self.store, status=Order.Status.COMPLETED)
        self.client.force_authenticate(self.customer)
        response = self.client.post(reverse("order-cancel", args=[order.pk]))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_other_customer_cannot_cancel_order(self):
        basket = Basket.objects.create(user=self.other_customer)
        order = Order.objects.create(basket=basket, store=self.store)
        self.client.force_authenticate(self.customer)
        response = self.client.post(reverse("order-cancel", args=[order.pk]))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_existing_query_set_can_be_sorted_without_an_llm_call(self):
        self.client.force_authenticate(self.customer)
        response = self.client.post(
            reverse("search"),
            {"query_set": empty_query_set(), "ordering": "price_asc"},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["ordering"], "price_asc")
        self.assertEqual(response.data["query_set"], empty_query_set())
        self.assertEqual(response.data["results"][0]["id"], self.variant.pk)
        self.assertEqual(response.data["results"][0]["minimum_available_price"], 900)

    def make_order(self, owner=None, order_status=Order.Status.PENDING, quantity=2, unit_price=900):
        basket, _ = Basket.objects.get_or_create(user=owner or self.customer)
        order = Order.objects.create(basket=basket, store=self.store, status=order_status)
        OrderItem.objects.create(order=order, offer=self.offer, quantity=quantity, unit_price=unit_price)
        return order

    def test_customer_order_list_has_historical_summary_and_status_filtering(self):
        pending = self.make_order()
        self.make_order(order_status=Order.Status.PAID)
        self.offer.price = 5000
        self.offer.save()
        self.client.force_authenticate(self.customer)

        response = self.client.get(reverse("my-order-list"), {"status": Order.Status.PENDING})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        summary = response.data["results"][0]
        self.assertEqual(summary["id"], pending.pk)
        self.assertEqual(summary["store"], {"id": self.store.pk, "name": self.store.name})
        self.assertEqual(summary["item_count"], 2)
        self.assertEqual(summary["total"], 1800)
        self.assertEqual(self.client.get(reverse("my-order-list"), {"status": "invalid"}).status_code, status.HTTP_400_BAD_REQUEST)

    def test_order_detail_uses_snapshot_price_and_variant_identity(self):
        order = self.make_order(quantity=1, unit_price=900)
        self.offer.price = 9999
        self.offer.save()
        self.client.force_authenticate(self.customer)
        response = self.client.get(reverse("order-detail", args=[order.pk]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        item = response.data["items"][0]
        self.assertEqual(item["unit_price"], 900)
        self.assertEqual(item["line_total"], 900)
        self.assertEqual(item["offer"], self.offer.pk)
        self.assertEqual(item["variant"]["id"], self.variant.pk)
        self.assertEqual(item["variant"]["brand"], "Example")

    def test_store_and_staff_cannot_access_customer_orders(self):
        order = self.make_order()
        staff = get_user_model().objects.create_user(username="staff", password="pass", is_staff=True)
        for user in (self.store_user, staff):
            self.client.force_authenticate(user)
            self.assertEqual(self.client.get(reverse("my-order-list")).status_code, status.HTTP_403_FORBIDDEN)
            self.assertEqual(self.client.get(reverse("order-detail", args=[order.pk])).status_code, status.HTTP_403_FORBIDDEN)
            self.assertEqual(self.client.post(reverse("order-cancel", args=[order.pk])).status_code, status.HTTP_403_FORBIDDEN)

    def test_checkout_returns_every_store_specific_summary(self):
        other_store_user, other_store = self.make_store("second-store")
        other_variant = DeviceVariant.objects.create(
            device_model=self.variant.device_model, configuration_key="12-256", ram_gb=12, storage_gb=256
        )
        other_offer = Offer.objects.create(store=other_store, device_variant=other_variant, price=1200, quantity=3)
        basket = Basket.objects.create(user=self.customer)
        BasketItem.objects.create(basket=basket, offer=self.offer, quantity=1, unit_price=900)
        BasketItem.objects.create(basket=basket, offer=other_offer, quantity=1, unit_price=1200)
        self.client.force_authenticate(self.customer)
        response = self.client.post(reverse("my-order-list"))
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(len(response.data), 2)
        self.assertEqual({entry["store"]["id"] for entry in response.data}, {self.store.pk, other_store.pk})
        self.assertEqual({entry["total"] for entry in response.data}, {900, 1200})

    def test_anonymous_and_empty_basket_checkout_are_rejected(self):
        self.assertEqual(self.client.get(reverse("my-order-list")).status_code, status.HTTP_401_UNAUTHORIZED)
        self.client.force_authenticate(self.customer)
        response = self.client.post(reverse("my-order-list"))
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["code"], "basket_empty")
