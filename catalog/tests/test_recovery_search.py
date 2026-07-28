from unittest.mock import patch

from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from accounts.models import AccountProfile
from catalog.models import Brand, DeviceModel, DeviceVariant, DisplaySpec
from catalog.query_set import empty_query_set
from catalog.query_set_storage import get_saved_query_set
from catalog.recovery_search import SearchRecoveryService


class RecoverySearchServiceTests(APITestCase):
    def test_generates_single_soft_field_plan_without_mutating_original(self):
        original = empty_query_set()
        original["display"]["refresh_rate_hz"]["min"] = 144
        with patch("catalog.recovery_search.filter_catalog") as filter_catalog:
            filter_catalog.return_value.count.side_effect = [0, 3, 9, 20]
            result = SearchRecoveryService().generate_plans(original_query_set=original)

        self.assertEqual(original["display"]["refresh_rate_hz"]["min"], 144)
        self.assertLessEqual(result.candidates_tested, 20)
        self.assertEqual(len(result.plans), 1)
        self.assertEqual(result.plans[0].changes[0].proposed_value, 90)
        self.assertEqual(result.plans[0].result_count, 3)


class TorobcheRecoveryEndpointTests(APITestCase):
    def setUp(self):
        user_model = get_user_model()
        self.user = user_model.objects.create_user(username="customer", password="pass")
        AccountProfile.objects.create(user=self.user, account_type=AccountProfile.AccountType.CUSTOMER)
        brand = Brand.objects.create(name="Example", slug="example")
        model = DeviceModel.objects.create(brand=brand, model_name="Phone", model_key="phone", is_catalog_eligible=True)
        DeviceVariant.objects.create(device_model=model, configuration_key="8-128", ram_gb=8, storage_gb=128)
        DisplaySpec.objects.create(device_model=model, role=DisplaySpec.Role.PRIMARY, refresh_rate_hz=120)
        self.url = reverse("search")
        self.client.force_authenticate(self.user)

    @staticmethod
    def query_set(refresh_rate):
        query_set = empty_query_set()
        query_set["display"]["refresh_rate_hz"]["min"] = refresh_rate
        return query_set

    def test_empty_exact_search_returns_proposal_and_saves_original_queryset(self):
        original = self.query_set(144)
        response = self.client.post(self.url, {"query_set": original}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 0)
        self.assertEqual(response.data["search_mode"], "recovery_required")
        self.assertEqual(response.data["recovery"]["plans"][0]["changes"][0], {
            "field": "display.refresh_rate_hz.min", "operation": "decrease_minimum", "from": 144, "to": 120,
        })
        self.assertEqual(get_saved_query_set(self.user), original)

    @patch("catalog.views.SearchRecoveryService.generate_plans")
    def test_exact_results_remain_unchanged_and_skip_recovery(self, generate_plans):
        response = self.client.post(self.url, {"query_set": self.query_set(120)}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertNotIn("search_mode", response.data)
        self.assertNotIn("recovery", response.data)
        generate_plans.assert_not_called()

    @patch("catalog.views.SearchRecoveryService.generate_plans")
    @patch("catalog.views.GapGptProvider.modify", side_effect=__import__("catalog.llm_provider", fromlist=["LLMProviderError"]).LLMProviderError("offline"))
    def test_llm_failure_does_not_trigger_recovery(self, _modify, generate_plans):
        response = self.client.post(self.url, {"message": "find a phone", "query_set": self.query_set(144)}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["warning_code"], "llm_interpretation_unavailable")
        generate_plans.assert_not_called()

    @patch("catalog.views.SearchRecoveryService.generate_plans")
    @patch("catalog.views.filter_catalog", side_effect=ValueError("filter failure"))
    def test_filter_failure_does_not_trigger_recovery(self, _filter_catalog, generate_plans):
        response = self.client.post(self.url, {"query_set": self.query_set(144)}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        generate_plans.assert_not_called()
