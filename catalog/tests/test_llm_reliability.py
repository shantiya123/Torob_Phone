from unittest.mock import patch
from urllib.error import URLError

from rest_framework.test import APIRequestFactory
from rest_framework.test import APITestCase

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
        request = APIRequestFactory().post(
            "/api/search/", {"message": "find a phone", "query_set": empty_query_set()}, format="json"
        )
        response = SearchView.as_view()(request)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["query_set"], empty_query_set())
        self.assertIn("warning", response.data)
