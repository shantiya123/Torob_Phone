from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import AccountProfile
from catalog.models import Brand, DeviceModel, DeviceVariant
from marketplace.models import Offer, Store, StoreLegalProfile


class TG018StorePrivacyTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.owner = user_model.objects.create_user(
            username="owner", email="owner@example.test", password="pass"
        )
        profile = AccountProfile.objects.create(
            user=self.owner, account_type=AccountProfile.AccountType.STORE
        )
        self.store = Store.objects.create(
            account_profile=profile,
            name="Private Contact Store",
            slug="private-contact-store",
            description="Public description",
            business_phone="+98-111",
            business_email="business@example.test",
            address="Private registered address",
            status=Store.Status.ACTIVE,
        )
        StoreLegalProfile.objects.create(
            store=self.store,
            legal_name="Private Legal Name",
            business_type="company",
            business_registration_number="REG-123",
            national_identifier="NATIONAL-123",
            tax_identifier="TAX-123",
            legal_representative_name="Private Representative",
        )
        brand = Brand.objects.create(name="Brand", slug="brand")
        model = DeviceModel.objects.create(
            brand=brand, model_name="Phone", model_key="phone", is_catalog_eligible=True
        )
        variant = DeviceVariant.objects.create(
            device_model=model, configuration_key="8-128", ram_gb=8, storage_gb=128
        )
        self.offer = Offer.objects.create(
            store=self.store, device_variant=variant, price=1000, quantity=2
        )

    def assert_private_store_fields_absent(self, payload):
        for field in (
            "business_phone",
            "business_email",
            "address",
            "owner",
            "legal_profile",
            "reviewed_by",
            "reviewed_at",
            "rejection_reason",
        ):
            self.assertNotIn(field, payload)

    def test_public_store_detail_is_identity_only(self):
        response = self.client.get(reverse("store-detail", args=[self.store.pk]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            set(response.data),
            {"id", "name", "slug", "description", "logo", "created_at"},
        )
        self.assert_private_store_fields_absent(response.data)

    def test_public_offer_nested_store_is_compact(self):
        response = self.client.get(reverse("offer-detail", args=[self.offer.pk]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data["store"]), {"id", "name", "slug", "logo"})
        self.assert_private_store_fields_absent(response.data["store"])

        response = self.client.get(
            reverse("public-store-offer-list", args=[self.store.pk]), {"page_size": 1}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(set(response.data["results"][0]["store"]), {"id", "name", "slug", "logo"})

    def test_owner_can_read_private_profile_but_cannot_write_review_fields(self):
        self.client.force_authenticate(self.owner)
        response = self.client.get(reverse("my-store"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["business_phone"], "+98-111")
        self.assertEqual(response.data["business_email"], "business@example.test")
        self.assertEqual(response.data["address"], "Private registered address")
        response = self.client.patch(
            reverse("my-store"),
            {"status": Store.Status.REJECTED, "reviewed_by": self.owner.pk},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.store.refresh_from_db()
        self.assertEqual(self.store.status, Store.Status.ACTIVE)

    def test_staff_review_detail_retains_private_fields(self):
        staff = get_user_model().objects.create_user(
            username="staff", password="pass", is_staff=True
        )
        self.client.force_authenticate(staff)
        response = self.client.get(reverse("staff-store-review-detail", args=[self.store.pk]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["business_phone"], "+98-111")
        self.assertEqual(response.data["legal_profile"]["legal_name"], "Private Legal Name")
        self.assertEqual(response.data["owner"]["username"], "owner")

