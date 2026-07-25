from datetime import timedelta

from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import AccountProfile
from catalog.models import Brand, DeviceModel, DeviceVariant
from marketplace.models import Offer, Store


class PublicStoreOfferListTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.customer = user_model.objects.create_user(username="customer", password="pass")
        AccountProfile.objects.create(
            user=self.customer, account_type=AccountProfile.AccountType.CUSTOMER
        )
        self.store_user = user_model.objects.create_user(username="seller", password="pass")
        profile = AccountProfile.objects.create(
            user=self.store_user, account_type=AccountProfile.AccountType.STORE
        )
        self.active_store = Store.objects.create(
            account_profile=profile,
            name="Active Store",
            slug="active-store",
            business_phone="1",
            address="address",
            status=Store.Status.ACTIVE,
        )
        self.pending_store = self._make_store("Pending Store", "pending-store", Store.Status.PENDING)
        self.rejected_store = self._make_store(
            "Rejected Store", "rejected-store", Store.Status.REJECTED
        )
        self.suspended_store = self._make_store(
            "Suspended Store", "suspended-store", Store.Status.SUSPENDED
        )
        brand = Brand.objects.create(name="Brand", slug="brand")
        model = DeviceModel.objects.create(
            brand=brand, model_name="Phone", model_key="phone", is_catalog_eligible=True
        )
        self.variants = [
            DeviceVariant.objects.create(
                device_model=model,
                configuration_key=f"{ram}-128",
                ram_gb=ram,
                storage_gb=128,
            )
            for ram in (4, 8, 12, 16, 24, 32)
        ]
        self.offers = [
            Offer.objects.create(
                store=self.active_store,
                device_variant=variant,
                price=1000 + index,
                quantity=1,
                description=f"Offer {index}",
            )
            for index, variant in enumerate(self.variants)
        ]
        # A zero-quantity offer must never appear in public results.
        Offer.objects.create(
            store=self.active_store,
            device_variant=DeviceVariant.objects.create(
                device_model=model, configuration_key="zero", ram_gb=1, storage_gb=64
            ),
            price=1,
            quantity=0,
        )
        Offer.objects.create(
            store=self.active_store,
            device_variant=DeviceVariant.objects.create(
                device_model=model,
                configuration_key="unavailable",
                ram_gb=2,
                storage_gb=64,
                is_available=False,
            ),
            price=2,
            quantity=1,
        )

    def _make_store(self, name, slug, store_status):
        user = get_user_model().objects.create_user(username=slug, password="pass")
        profile = AccountProfile.objects.create(
            user=user, account_type=AccountProfile.AccountType.STORE
        )
        return Store.objects.create(
            account_profile=profile,
            name=name,
            slug=slug,
            business_phone="1",
            address="address",
            status=store_status,
        )

    def _url(self, store_id=None):
        return reverse(
            "public-store-offer-list",
            kwargs={"store_id": self.active_store.pk if store_id is None else store_id},
        )

    def test_public_access_is_allowed_for_anonymous_customer_store_and_staff(self):
        for user in (None, self.customer, self.store_user):
            self.client.force_authenticate(user)
            response = self.client.get(self._url(), {"page_size": 1})
            self.assertEqual(response.status_code, status.HTTP_200_OK)
        staff = get_user_model().objects.create_user(username="staff", password="pass", is_staff=True)
        self.client.force_authenticate(staff)
        self.assertEqual(self.client.get(self._url()).status_code, status.HTTP_200_OK)

    def test_hidden_or_missing_store_returns_not_found(self):
        for store in (self.pending_store, self.rejected_store, self.suspended_store):
            self.assertEqual(self.client.get(self._url(store.pk)).status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(self.client.get(self._url(999999)).status_code, status.HTTP_404_NOT_FOUND)

    def test_active_store_without_offers_returns_empty_pagination(self):
        empty = self._make_store("Empty Store", "empty-store", Store.Status.ACTIVE)
        response = self.client.get(self._url(empty.pk))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)
        self.assertEqual(response.data["results"], [])

    def test_default_ordering_is_newest_first_with_deterministic_ties(self):
        timestamp = timezone.now() - timedelta(days=1)
        Offer.objects.filter(pk=self.offers[0].pk).update(created_at=timestamp)
        Offer.objects.filter(pk=self.offers[1].pk).update(created_at=timestamp)
        response = self.client.get(self._url())
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [item["id"] for item in response.data["results"]]
        self.assertEqual(ids[-2:], [self.offers[1].pk, self.offers[0].pk])
        self.assertEqual(len(ids), 6)

    def test_supported_price_orderings_and_invalid_ordering_falls_back_to_newest(self):
        response = self.client.get(self._url(), {"ordering": "price_asc"})
        self.assertEqual([item["price"] for item in response.data["results"]], list(range(1000, 1006)))
        response = self.client.get(self._url(), {"ordering": "price_desc"})
        self.assertEqual([item["price"] for item in response.data["results"]], list(range(1005, 999, -1)))
        response = self.client.get(self._url(), {"ordering": "unsupported"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_pagination_and_page_size_limit(self):
        response = self.client.get(self._url(), {"page_size": 5})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 6)
        self.assertEqual(len(response.data["results"]), 5)
        self.assertIsNotNone(response.data["next"])

        response = self.client.get(self._url(), {"page_size": 1000})
        self.assertEqual(len(response.data["results"]), 6)

    def test_serializer_is_public_offer_representation_without_private_fields(self):
        response = self.client.get(self._url(), {"page_size": 1})
        self.assertEqual(
            set(response.data["results"][0]),
            {
                "id",
                "device_variant",
                "store",
                "price",
                "quantity",
                "available",
                "description",
                "created_at",
                "updated_at",
            },
        )
        item = response.data["results"][0]
        self.assertEqual(item["store"]["id"], self.active_store.pk)
        self.assertIn("image_url", item["device_variant"])
        self.assertNotIn("legal_profile", item["store"])
        self.assertNotIn("reviewed_by", item["store"])

    def test_owned_offer_route_still_resolves_to_store_owner_endpoint(self):
        self.client.force_authenticate(self.store_user)
        response = self.client.get("/api/stores/me/offers/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["results"][0]["store"]["id"], self.active_store.pk)
