from copy import deepcopy
from pathlib import Path

from django.conf import settings
from django.test import SimpleTestCase, TestCase
from unittest.mock import patch

from catalog.importer import import_dataset
from catalog.llm_provider import GapGptProvider, LLMProviderError
from catalog.query_adapter import UnsupportedQuerySetFieldError, query_set_to_filter_requirements
from catalog.query_service import QuerySetModificationService
from catalog.query_set import QuerySetValidationError, empty_query_set, validate_query_set


def set_path(query_set, path, value):
    for key in path[:-1]:
        query_set = query_set[key]
    query_set[path[-1]] = value


class ScriptedProvider:
    def __init__(self, changes):
        self.changes = list(changes)
        self.calls = []

    def modify(self, current_query_set, user_request):
        self.calls.append((deepcopy(current_query_set), user_request))
        change = self.changes.pop(0)
        if isinstance(change, Exception):
            raise change
        if callable(change):
            return change(deepcopy(current_query_set))
        return change


class QuerySetContractTests(SimpleTestCase):
    def test_empty_query_set_brand_and_numeric_ranges_are_adapted(self):
        query_set = empty_query_set()
        query_set["brand"] = "xiaomi"
        query_set["performance"]["variants"]["ram_gb"]["min"] = 8
        query_set["performance"]["variants"]["storage_gb"]["min"] = 256
        requirements = query_set_to_filter_requirements(query_set)
        self.assertEqual(requirements.brand, "Xiaomi")
        self.assertEqual(requirements.min_ram_gb, 8)
        self.assertEqual(requirements.min_storage_gb, 256)

    def test_validator_rejects_invalid_json_shape_unknown_missing_and_bad_ranges(self):
        with self.assertRaises(QuerySetValidationError):
            validate_query_set("not an object")
        unknown = empty_query_set()
        unknown["unexpected"] = None
        with self.assertRaises(QuerySetValidationError):
            validate_query_set(unknown)
        missing = empty_query_set()
        del missing["price"]
        with self.assertRaises(QuerySetValidationError):
            validate_query_set(missing)
        invalid_range = empty_query_set()
        invalid_range["battery"]["capacity_mah"] = {"min": 6000, "max": 5000}
        with self.assertRaises(QuerySetValidationError):
            validate_query_set(invalid_range)
        invalid_numeric = empty_query_set()
        invalid_numeric["price"]["min"] = -1
        with self.assertRaises(QuerySetValidationError):
            validate_query_set(invalid_numeric)

    def test_unsupported_price_is_not_silently_adapted(self):
        query_set = empty_query_set()
        query_set["price"]["max"] = 500
        with self.assertRaisesRegex(UnsupportedQuerySetFieldError, "price.max"):
            query_set_to_filter_requirements(query_set)

    def test_gapgpt_invalid_json_response_is_rejected_without_a_real_request(self):
        class Response:
            def read(self):
                return b'{"choices": [{"message": {"content": "{\\\"message\\\": \\\"x\\\", \\\"queryset\\\": {}}"}}]}'

            def __enter__(self):
                return self

            def __exit__(self, *args):
                return False

        provider = GapGptProvider(api_key="test", model="test-model")
        with patch("catalog.llm_provider.urlopen", return_value=Response()):
            with self.assertRaisesRegex(LLMProviderError, "invalid QuerySet"):
                provider.modify(empty_query_set(), "test")


class QuerySetModificationServiceTests(TestCase):
    def test_sequential_changes_preserve_unrelated_requirements_and_normalize_brands(self):
        def set_xiaomi(current):
            current["brand"] = "Xiaomi"
            return current

        def set_ram(current):
            current["performance"]["variants"]["ram_gb"]["min"] = 8
            return current

        def set_apple(current):
            current["brand"] = "apple"
            return current

        provider = ScriptedProvider([set_xiaomi, set_ram, set_apple])
        service = QuerySetModificationService(provider)
        service.process_user_query("I want Xiaomi")
        service.process_user_query("At least 8GB RAM")
        final = service.process_user_query("Make the brand Apple")

        self.assertEqual(final.query_set["brand"], "Apple")
        self.assertEqual(final.query_set["performance"]["variants"]["ram_gb"]["min"], 8)
        self.assertEqual(provider.calls[2][0]["brand"], "Xiaomi")
        self.assertEqual(provider.calls[2][0]["performance"]["variants"]["ram_gb"]["min"], 8)

    def test_complete_reset_and_removing_brand_are_represented_by_nulls(self):
        initial = empty_query_set()
        initial["brand"] = "Samsung"
        initial["performance"]["variants"]["ram_gb"]["min"] = 8

        def reset(current):
            return empty_query_set()

        def remove_brand(current):
            current["brand"] = None
            return current

        service = QuerySetModificationService(ScriptedProvider([reset, remove_brand]), initial)
        reset_result = service.process_user_query("reset everything")
        self.assertIsNone(reset_result.query_set["brand"])
        self.assertIsNone(reset_result.query_set["performance"]["variants"]["ram_gb"]["min"])
        removed = service.process_user_query("remove brand")
        self.assertIsNone(removed.query_set["brand"])

    def test_persian_and_case_variant_brands_are_normalized(self):
        def persian(current):
            current["brand"] = "شیائومی"
            return current

        service = QuerySetModificationService(ScriptedProvider([persian]))
        self.assertEqual(service.process_user_query("شیائومی").query_set["brand"], "Xiaomi")
        for value in ("Apple", "apple", "APPLE"):
            query_set = empty_query_set()
            query_set["brand"] = value
            self.assertEqual(query_set_to_filter_requirements(query_set).brand, "Apple")

    def test_invalid_response_provider_failure_and_unsupported_field_preserve_previous_state(self):
        invalid = "not json"

        def price(current):
            current["price"]["max"] = 10
            return current

        provider = ScriptedProvider([invalid, LLMProviderError("network failed"), price])
        service = QuerySetModificationService(provider)
        previous = service.current_query_set
        with self.assertRaises(QuerySetValidationError):
            service.process_user_query("bad response")
        self.assertEqual(service.current_query_set, previous)
        with self.assertRaises(LLMProviderError):
            service.process_user_query("provider failure")
        self.assertEqual(service.current_query_set, previous)
        with self.assertRaises(UnsupportedQuerySetFieldError):
            service.process_user_query("under 10 price")
        self.assertEqual(service.current_query_set, previous)


class QuerySetFilteringIntegrationTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        import_dataset(Path(settings.BASE_DIR) / "data" / "clean_data.json")

    def test_actual_chipset_query_adapts_to_deterministic_catalog_filter(self):
        def chipset_request(current):
            current["performance"]["chipset"] = "Qualcomm SM6475-AB Snapdragon 6 Gen 3"
            current["performance"]["variants"]["ram_gb"]["min"] = 8
            return current

        service = QuerySetModificationService(ScriptedProvider([chipset_request]))
        result = service.process_user_query("Snapdragon 6 Gen 3 with at least 8GB RAM")
        self.assertTrue(result.candidates.exists())
        self.assertTrue(
            all(
                variant.ram_gb >= 8
                and variant.device_model.performance_spec.chipset_name == "Qualcomm SM6475-AB Snapdragon 6 Gen 3"
                for variant in result.candidates
            )
        )
