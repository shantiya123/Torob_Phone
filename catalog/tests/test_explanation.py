from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import AccountProfile
from catalog.models import Brand, DeviceModel, DeviceVariant
from catalog.query_set import empty_query_set
from catalog.query_set_storage import get_saved_query_set, save_query_set
from marketplace.models import Offer, Store


class PhoneExplanationTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="customer", password="pass")
        store_user = get_user_model().objects.create_user(username="seller", password="pass")
        store_profile = AccountProfile.objects.create(
            user=store_user, account_type=AccountProfile.AccountType.STORE
        )
        self.store = Store.objects.create(
            account_profile=store_profile, name="Store", slug="store", business_phone="1",
            address="address", status=Store.Status.ACTIVE,
        )
        brand = Brand.objects.create(name="Example", slug="example")
        model = DeviceModel.objects.create(
            brand=brand, model_name="Phone", model_key="phone", is_catalog_eligible=True
        )
        self.variant = DeviceVariant.objects.create(
            device_model=model, configuration_key="8-128", ram_gb=8, storage_gb=128
        )
        Offer.objects.create(store=self.store, device_variant=self.variant, price=900, quantity=1)
        Offer.objects.create(
            store=self.store, device_variant=DeviceVariant.objects.create(
                device_model=model, configuration_key="12-256", ram_gb=12, storage_gb=256
            ), price=700, quantity=0,
        )
        self.url = reverse("phone-explanation", args=[self.variant.pk])

    def active_filter(self):
        value = empty_query_set()
        value["performance"]["variants"]["ram_gb"]["min"] = 8
        return value

    def test_anonymous_user_cannot_access_explanation(self):
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_user_without_filter_gets_message_without_calling_ai(self):
        self.client.force_authenticate(self.user)
        with patch("catalog.views.ExplanationService.explain") as explain:
            response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("ابتدا جستجوی خود", response.data["description"])
        explain.assert_not_called()

    @patch("catalog.views.ExplanationService.explain", return_value="توضیح شخصی سازی شده")
    def test_saved_filter_is_sent_with_minimum_available_price(self, explain):
        save_query_set(self.user, self.active_filter())
        self.client.force_authenticate(self.user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["description"], "توضیح شخصی سازی شده")
        user_filter, product = explain.call_args.args
        self.assertEqual(user_filter, self.active_filter())
        self.assertEqual(product["price"]["lowest_available_price"], 900)

    @patch("catalog.views.ExplanationService.explain", side_effect=__import__("catalog.llm_provider", fromlist=["LLMProviderError"]).LLMProviderError("down"))
    def test_ai_failure_does_not_crash_endpoint(self, _explain):
        save_query_set(self.user, self.active_filter())
        self.client.force_authenticate(self.user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["description"])
        self.assertEqual(response.data["error"], "AI explanation temporarily unavailable")

    def test_reset_returns_all_null_query_set(self):
        save_query_set(self.user, self.active_filter())
        self.client.force_authenticate(self.user)
        response = self.client.post(reverse("search-reset"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["query_set"], empty_query_set())
        self.assertEqual(get_saved_query_set(self.user), empty_query_set())

    def test_authenticated_search_saves_the_validated_query_set(self):
        self.client.force_authenticate(self.user)
        query_set = self.active_filter()
        response = self.client.post(reverse("search"), {"query_set": query_set}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(get_saved_query_set(self.user), query_set)
