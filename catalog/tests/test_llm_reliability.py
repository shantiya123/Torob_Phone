from unittest.mock import patch
from urllib.error import URLError

from django.contrib.auth import get_user_model
from rest_framework.test import APIRequestFactory, APITestCase, force_authenticate

from accounts.models import AccountProfile
from catalog.llm_provider import GapGptProvider, LLMProviderError
from catalog.query_set import empty_query_set
from catalog.views import SearchView


class GapGptReliabilityTests(APITestCase):
    @patch("catalog.llm_provider.urlopen", side_effect=URLError("offline"))
    @patch("catalog.llm_provider.time.sleep")
    def test_provider_retries_transient_failures(self, sleep, urlopen):
        provider = GapGptProvider(api_key="key", model="model", retries=2)
        with self.assertRaises(LLMProviderError):
            provider.modify(empty_query_set(), "find a phone")
        self.assertEqual(urlopen.call_count, 3)
        self.assertEqual(sleep.call_count, 2)

    @patch("catalog.views.GapGptProvider.modify", side_effect=LLMProviderError("unavailable"))
    def test_search_uses_deterministic_fallback_when_llm_fails(self, _modify):
        request = APIRequestFactory().post("/api/search/", {"message": "find a phone", "query_set": empty_query_set()}, format="json")
        user = get_user_model().objects.create_user(username="customer", password="pass")
        AccountProfile.objects.create(user=user, account_type=AccountProfile.AccountType.CUSTOMER)
        force_authenticate(request, user=user)
        response = SearchView.as_view()(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["queryset"], empty_query_set())
        self.assertEqual(response.data["warning_code"], "llm_interpretation_unavailable")
