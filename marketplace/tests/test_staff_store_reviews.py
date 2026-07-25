from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import AccountProfile
from catalog.models import Brand, DeviceModel, DeviceVariant
from marketplace.models import Offer, Store, StoreLegalProfile


class StaffStoreReviewAPITests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.staff = user_model.objects.create_user(
            username="reviewer", password="pass", is_staff=True
        )
        self.superuser = user_model.objects.create_superuser(
            username="superuser", password="pass", email="root@example.test"
        )
        self.customer = user_model.objects.create_user(username="customer", password="pass")
        AccountProfile.objects.create(
            user=self.customer, account_type=AccountProfile.AccountType.CUSTOMER
        )
        self.store_user = user_model.objects.create_user(
            username="store-user", password="pass", email="seller@example.test"
        )
        store_profile = AccountProfile.objects.create(
            user=self.store_user, account_type=AccountProfile.AccountType.STORE
        )
        self.store = Store.objects.create(
            account_profile=store_profile,
            name="Mobile Center",
            slug="mobile-center",
            description="Phone retailer",
            business_phone="123",
            business_email="seller@example.test",
            address="1 Main Street",
            status=Store.Status.PENDING,
        )
        StoreLegalProfile.objects.create(
            store=self.store,
            legal_name="Mobile Center LLC",
            business_type="company",
            business_registration_number="BR-1",
            national_identifier="NI-1",
            tax_identifier="TAX-1",
            legal_representative_name="Applicant",
            legal_representative_national_identifier="RN-1",
        )
        self.other_store = self._make_store("Other Store", "other-store", Store.Status.PENDING)
        self.rejected_store = self._make_store(
            "Rejected Store", "rejected-store", Store.Status.REJECTED
        )
        self.active_store = self._make_store("Active Store", "active-store", Store.Status.ACTIVE)
        self.queue_url = reverse("staff-store-review-list")

    def _make_store(self, name, slug, store_status):
        user_model = get_user_model()
        user = user_model.objects.create_user(
            username=slug, email=f"{slug}@example.test", password="pass"
        )
        profile = AccountProfile.objects.create(
            user=user, account_type=AccountProfile.AccountType.STORE
        )
        store = Store.objects.create(
            account_profile=profile,
            name=name,
            slug=slug,
            business_phone="1",
            address="address",
            status=store_status,
        )
        StoreLegalProfile.objects.create(
            store=store,
            legal_name=f"{name} Legal",
            business_type="company",
            legal_representative_name="Representative",
        )
        return store

    def _url(self, store, action=None):
        name = "staff-store-review-detail" if action is None else f"staff-store-review-{action}"
        return reverse(name, kwargs={"pk": store.pk})

    def test_anonymous_customer_store_and_non_staff_are_denied(self):
        for user in (None, self.customer, self.store_user):
            self.client.force_authenticate(user)
            expected = status.HTTP_401_UNAUTHORIZED if user is None else status.HTTP_403_FORBIDDEN
            self.assertEqual(self.client.get(self.queue_url).status_code, expected)

        non_staff = get_user_model().objects.create_user(username="ordinary", password="pass")
        self.client.force_authenticate(non_staff)
        self.assertEqual(self.client.get(self.queue_url).status_code, status.HTTP_403_FORBIDDEN)

    def test_staff_without_account_profile_and_superuser_are_allowed(self):
        self.client.force_authenticate(self.staff)
        self.assertEqual(self.client.get(self.queue_url).status_code, status.HTTP_200_OK)
        self.client.force_authenticate(self.superuser)
        self.assertEqual(self.client.get(self.queue_url).status_code, status.HTTP_200_OK)

    def test_queue_defaults_to_pending_and_supports_status_search_and_pagination(self):
        self.client.force_authenticate(self.staff)
        response = self.client.get(self.queue_url, {"page_size": 1})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 2)
        self.assertEqual(len(response.data["results"]), 1)
        self.assertEqual(response.data["results"][0]["status"], Store.Status.PENDING)

        response = self.client.get(self.queue_url, {"status": "active"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["name"], "Active Store")

        response = self.client.get(self.queue_url, {"search": "SELLER@EXAMPLE"})
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], self.store.pk)

        response = self.client.get(self.queue_url, {"status": "not-a-status"})
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

    def test_detail_contains_private_registration_data_only_for_staff(self):
        self.client.force_authenticate(self.staff)
        response = self.client.get(self._url(self.store))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["owner"]["username"], "store-user")
        self.assertEqual(response.data["owner"]["email"], "seller@example.test")
        self.assertEqual(response.data["legal_profile"]["legal_name"], "Mobile Center LLC")
        self.assertIn("rejection_reason", response.data)

        self.client.force_authenticate(self.customer)
        self.assertEqual(self.client.get(self._url(self.store)).status_code, status.HTTP_403_FORBIDDEN)

    def test_approval_transitions_and_makes_store_public_and_offer_eligible(self):
        self.client.force_authenticate(self.staff)
        response = self.client.post(self._url(self.store, "approve"), {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.store.refresh_from_db()
        self.assertEqual(self.store.status, Store.Status.ACTIVE)
        self.assertEqual(self.store.reviewed_by_id, self.staff.id)
        self.assertIsNotNone(self.store.reviewed_at)
        self.assertEqual(self.store.rejection_reason, "")
        self.assertEqual(self.client.get(f"/api/stores/{self.store.pk}/").status_code, status.HTTP_200_OK)

        brand = Brand.objects.create(name="Brand", slug="brand")
        model = DeviceModel.objects.create(brand=brand, model_name="Model", model_key="model")
        variant = DeviceVariant.objects.create(
            device_model=model, configuration_key="8-128", ram_gb=8, storage_gb=128
        )
        Offer.objects.create(store=self.store, device_variant=variant, price=100, quantity=1)
        self.assertEqual(
            self.client.get(f"/api/catalog/device-variants/{variant.pk}/offers/").status_code,
            status.HTTP_200_OK,
        )

    def test_rejection_requires_trimmed_reason_and_keeps_store_non_public(self):
        self.client.force_authenticate(self.staff)
        response = self.client.post(
            self._url(self.store, "reject"), {"rejection_reason": "   "}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("rejection_reason", response.data)

        response = self.client.post(
            self._url(self.store, "reject"),
            {"rejection_reason": "  Registration could not be verified.  "},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.store.refresh_from_db()
        self.assertEqual(self.store.status, Store.Status.REJECTED)
        self.assertEqual(self.store.rejection_reason, "Registration could not be verified.")
        self.assertEqual(self.client.get(f"/api/stores/{self.store.pk}/").status_code, status.HTTP_404_NOT_FOUND)

        brand = Brand.objects.create(name="Rejected Brand", slug="rejected-brand")
        model = DeviceModel.objects.create(
            brand=brand, model_name="Rejected Model", model_key="rejected-model"
        )
        variant = DeviceVariant.objects.create(
            device_model=model, configuration_key="8-128", ram_gb=8, storage_gb=128
        )
        Offer.objects.create(store=self.store, device_variant=variant, price=100, quantity=1)
        offers = self.client.get(f"/api/catalog/device-variants/{variant.pk}/offers/")
        self.assertEqual(offers.status_code, status.HTTP_200_OK)
        self.assertEqual(offers.data["count"], 0)

    def test_invalid_transitions_and_repeated_actions_are_controlled(self):
        self.client.force_authenticate(self.staff)
        self.assertEqual(
            self.client.post(
                self._url(self.rejected_store, "approve"), {}, format="json"
            ).status_code,
            status.HTTP_409_CONFLICT,
        )
        self.assertEqual(
            self.client.post(
                self._url(self.active_store, "reject"),
                {"rejection_reason": "reason"},
                format="json",
            ).status_code,
            status.HTTP_409_CONFLICT,
        )

        response = self.client.post(self._url(self.store, "approve"), {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        first_reviewer = response.data["reviewed_by"]
        response = self.client.post(self._url(self.store, "approve"), {}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["reviewed_by"], first_reviewer)
