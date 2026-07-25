from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import AccountProfile
from catalog.models import Brand, DeviceModel, DeviceVariant
from marketplace.models import Store


class StoreCatalogApiTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.store_user = user_model.objects.create_user(username="catalog-store", password="pass")
        store_profile = AccountProfile.objects.create(
            user=self.store_user, account_type=AccountProfile.AccountType.STORE
        )
        Store.objects.create(
            account_profile=store_profile,
            name="Catalog Store",
            slug="catalog-store",
            business_phone="123",
            address="address",
        )
        self.customer = user_model.objects.create_user(username="catalog-customer", password="pass")
        AccountProfile.objects.create(
            user=self.customer, account_type=AccountProfile.AccountType.CUSTOMER
        )
        self.staff = user_model.objects.create_user(username="catalog-staff", password="pass", is_staff=True)
        staff_profile = AccountProfile.objects.create(
            user=self.staff, account_type=AccountProfile.AccountType.STORE
        )
        Store.objects.create(
            account_profile=staff_profile,
            name="Staff Store",
            slug="staff-store",
            business_phone="456",
            address="address",
        )

        samsung = Brand.objects.create(name="Samsung", slug="samsung")
        apple = Brand.objects.create(name="Apple", slug="apple")
        self.phone = DeviceModel.objects.create(
            brand=samsung,
            model_name="Galaxy M47",
            model_key="galaxy-m47",
            released_on="2026-07-04",
            image_url="https://example.test/galaxy-m47.jpg",
            is_catalog_eligible=True,
        )
        self.other_phone = DeviceModel.objects.create(
            brand=apple,
            model_name="iPhone 13",
            model_key="iphone-13",
            is_catalog_eligible=True,
        )
        self.hidden_phone = DeviceModel.objects.create(
            brand=samsung,
            model_name="Internal Phone",
            model_key="internal-phone",
            is_catalog_eligible=False,
        )
        self.available_variant = DeviceVariant.objects.create(
            device_model=self.phone, configuration_key="8-128", ram_gb=8, storage_gb=128
        )
        DeviceVariant.objects.create(
            device_model=self.phone, configuration_key="12-256", ram_gb=12, storage_gb=256, is_available=False
        )
        self.list_url = reverse("store-catalog-phone-list")
        self.detail_url = reverse("store-catalog-phone-detail", args=[self.phone.pk])

    def test_only_non_staff_store_users_can_list_and_retrieve(self):
        self.assertEqual(self.client.get(self.list_url).status_code, status.HTTP_401_UNAUTHORIZED)
        self.client.force_authenticate(self.customer)
        self.assertEqual(self.client.get(self.list_url).status_code, status.HTTP_403_FORBIDDEN)
        self.client.force_authenticate(self.staff)
        self.assertEqual(self.client.get(self.list_url).status_code, status.HTTP_403_FORBIDDEN)
        self.client.force_authenticate(self.store_user)
        self.assertEqual(self.client.get(self.list_url).status_code, status.HTTP_200_OK)
        self.assertEqual(self.client.get(self.detail_url).status_code, status.HTTP_200_OK)

    def test_list_searches_brand_and_model_with_standard_pagination(self):
        self.client.force_authenticate(self.store_user)
        response = self.client.get(self.list_url, {"search": "samsung"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], self.phone.pk)
        self.assertIn("next", response.data)
        self.assertIn("previous", response.data)

        response = self.client.get(self.list_url, {"search": "iphone"})
        self.assertEqual(response.data["results"][0]["id"], self.other_phone.pk)
        response = self.client.get(self.list_url)
        self.assertEqual(response.data["count"], 2)

    def test_detail_exposes_parent_image_and_available_offerable_variants(self):
        self.client.force_authenticate(self.store_user)
        response = self.client.get(self.detail_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["brand"], "Samsung")
        self.assertEqual(response.data["model"], "Galaxy M47")
        self.assertEqual(response.data["image_url"], "https://example.test/galaxy-m47.jpg")
        self.assertEqual(response.data["variants"], [
            {
                "id": self.available_variant.pk,
                "brand": "Samsung",
                "model_name": "Galaxy M47",
                "device_kind": "unknown",
                "image_url": "https://example.test/galaxy-m47.jpg",
                "storage_gb": 128,
                "ram_gb": 8,
                "storage_technology": None,
                "is_available": True,
            }
        ])

    def test_ineligible_phone_is_not_exposed(self):
        self.client.force_authenticate(self.store_user)
        response = self.client.get(reverse("store-catalog-phone-detail", args=[self.hidden_phone.pk]))
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
