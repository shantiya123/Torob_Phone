from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import AccountProfile
from catalog.llm_provider import LLMProviderError
from catalog.models import Brand, DeviceModel, DeviceVariant
from catalog.query_set import empty_query_set
from catalog.query_set_storage import get_saved_query_set, save_query_set
from marketplace.models import Offer, Store


class PhoneExplanationTests(APITestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(username="customer", password="pass")
        AccountProfile.objects.create(user=self.user, account_type=AccountProfile.AccountType.CUSTOMER)
        seller = get_user_model().objects.create_user(username="seller", password="pass")
        profile = AccountProfile.objects.create(user=seller, account_type=AccountProfile.AccountType.STORE)
        store = Store.objects.create(account_profile=profile, name="Store", slug="store", business_phone="1", address="address", status=Store.Status.ACTIVE)
        brand = Brand.objects.create(name="Example", slug="example")
        model = DeviceModel.objects.create(brand=brand, model_name="Phone", model_key="phone", is_catalog_eligible=True)
        self.variant = DeviceVariant.objects.create(device_model=model, configuration_key="8-128", ram_gb=8, storage_gb=128)
        Offer.objects.create(store=store, device_variant=self.variant, price=900, quantity=1)
        self.url = reverse("device-variant-explanation", args=[self.variant.pk])

    def active_filter(self):
        query_set = empty_query_set()
        query_set["performance"]["variants"]["ram_gb"]["min"] = 8
        return query_set

    def test_anonymous_user_cannot_access_explanation(self):
        self.assertEqual(self.client.get(self.url).status_code, status.HTTP_401_UNAUTHORIZED)

    def test_missing_context_requires_torobche_state_without_ai_call(self):
        self.client.force_authenticate(self.user)
        with patch("catalog.views.ExplanationService.explain") as explain:
            response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
        self.assertEqual(response.data["code"], "torobche_context_required")
        explain.assert_not_called()

    @patch("catalog.views.ExplanationService.explain", return_value="توضیح شخصی سازی شده")
    def test_saved_filter_and_minimum_available_price_are_used(self, explain):
        save_query_set(self.user, self.active_filter())
        self.client.force_authenticate(self.user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user_filter, product = explain.call_args.args
        self.assertEqual(user_filter, self.active_filter())
        self.assertEqual(product["price"]["lowest_available_price"], 900)

    @patch("catalog.views.ExplanationService.explain", side_effect=LLMProviderError("down"))
    def test_ai_failure_does_not_crash_endpoint(self, _explain):
        save_query_set(self.user, self.active_filter())
        self.client.force_authenticate(self.user)
        response = self.client.get(self.url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["description"])

    def test_reset_returns_canonical_query_set(self):
        save_query_set(self.user, self.active_filter())
        self.client.force_authenticate(self.user)
        response = self.client.post(reverse("search-reset"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["queryset"], empty_query_set())
        self.assertEqual(get_saved_query_set(self.user), empty_query_set())
