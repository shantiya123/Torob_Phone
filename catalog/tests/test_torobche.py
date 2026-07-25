import json
from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import AccountProfile
from catalog.models import Brand, DeviceModel, DeviceVariant
from catalog.provider_response import FALLBACK_MESSAGE, ProviderQueryResponse, parse_provider_query_response
from catalog.query_set import empty_query_set
from catalog.query_set_storage import get_saved_query_set, save_query_set


class ProviderWrapperTests(APITestCase):
    def wrapper(self, message="اعمال شد", query_set=None):
        return json.dumps({"message": message, "queryset": query_set or empty_query_set()})

    def test_valid_wrapper_extracts_only_nested_queryset(self):
        query_set = empty_query_set()
        query_set["brand"] = "Apple"
        parsed = parse_provider_query_response(self.wrapper(query_set=query_set))
        self.assertEqual(parsed.message, "اعمال شد")
        self.assertEqual(parsed.query_set, query_set)

    def test_invalid_message_preserves_valid_queryset_with_fallback(self):
        parsed = parse_provider_query_response(self.wrapper(message="   "))
        self.assertEqual(parsed.message, FALLBACK_MESSAGE)
        self.assertTrue(parsed.message_fallback)

    def test_invalid_wrapper_or_nested_queryset_is_rejected(self):
        with self.assertRaises(ValueError):
            parse_provider_query_response('{"message":"x"}')
        with self.assertRaises(ValueError):
            parse_provider_query_response('{"message":"x","queryset":{}}')
        with self.assertRaises(ValueError):
            parse_provider_query_response('```json {} ```')


class TorobcheEndpointTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.customer = user_model.objects.create_user(username="customer", password="pass")
        AccountProfile.objects.create(user=self.customer, account_type=AccountProfile.AccountType.CUSTOMER)
        self.store = user_model.objects.create_user(username="store", password="pass")
        AccountProfile.objects.create(user=self.store, account_type=AccountProfile.AccountType.STORE)
        self.staff = user_model.objects.create_user(username="staff", password="pass", is_staff=True)
        brand = Brand.objects.create(name="Example", slug="example")
        model = DeviceModel.objects.create(brand=brand, model_name="Phone", model_key="phone", is_catalog_eligible=True)
        self.variant = DeviceVariant.objects.create(device_model=model, configuration_key="8-128", ram_gb=8, storage_gb=128)
        self.search_url = reverse("search")
        self.state_url = reverse("search-state")
        self.reset_url = reverse("search-reset")
        self.explanation_url = reverse("device-variant-explanation", args=[self.variant.pk])

    def active_query_set(self):
        query_set = empty_query_set()
        query_set["performance"]["variants"]["ram_gb"]["min"] = 8
        return query_set

    def test_anonymous_and_staff_are_rejected_from_all_torobche_endpoints(self):
        for url, method in ((self.search_url, "post"), (self.state_url, "get"), (self.reset_url, "post"), (self.explanation_url, "get")):
            response = getattr(self.client, method)(url, {"message": "ram"} if method == "post" and url == self.search_url else None, format="json")
            self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        self.client.force_authenticate(self.staff)
        for url, method in ((self.search_url, "post"), (self.state_url, "get"), (self.reset_url, "post"), (self.explanation_url, "get")):
            response = getattr(self.client, method)(url, {"message": "ram"} if method == "post" and url == self.search_url else None, format="json")
            self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_customer_and_store_can_read_and_reset_only_their_own_state(self):
        save_query_set(self.customer, self.active_query_set())
        self.client.force_authenticate(self.customer)
        response = self.client.get(self.state_url)
        self.assertTrue(response.data["has_active_filters"])
        self.assertIsNotNone(response.data["updated_at"])
        self.client.post(self.reset_url)
        self.assertEqual(get_saved_query_set(self.customer), empty_query_set())
        self.client.force_authenticate(self.store)
        response = self.client.get(self.state_url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["queryset"], empty_query_set())

    @patch("catalog.views.GapGptProvider.modify")
    def test_search_returns_message_queryset_and_saves_valid_wrapper_result(self, modify):
        updated = self.active_query_set()
        modify.return_value = ProviderQueryResponse("حداقل رم را اعمال کردم.", updated)
        self.client.force_authenticate(self.customer)
        response = self.client.post(self.search_url, {"message": "حداقل رم ۸ گیگ"}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["message"], "حداقل رم را اعمال کردم.")
        self.assertEqual(response.data["queryset"], updated)
        self.assertEqual(get_saved_query_set(self.customer), updated)
