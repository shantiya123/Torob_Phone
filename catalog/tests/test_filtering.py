from pathlib import Path

from django.conf import settings
from django.test import TestCase

from catalog.filtering import FilterRequirements, filter_catalog
from catalog.importer import import_dataset
from catalog.models import DeviceModel


class CatalogFilteringTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        import_dataset(Path(settings.BASE_DIR) / "data" / "clean_data.json")

    @staticmethod
    def configurations(queryset, brand, model):
        return list(
            queryset.filter(device_model__brand__name=brand, device_model__model_name=model).values_list(
                "ram_gb", "storage_gb"
            )
        )

    def test_variant_ram_and_storage_constraints_select_only_matching_a57_variants(self):
        twelve_gb = filter_catalog(FilterRequirements(brand="Samsung", min_ram_gb=12))
        self.assertEqual(self.configurations(twelve_gb, "Samsung", "Galaxy A57"), [(12, 256), (12, 512)])

        five_twelve_gb = filter_catalog(FilterRequirements(brand="Samsung", min_storage_gb=512))
        self.assertEqual(self.configurations(five_twelve_gb, "Samsung", "Galaxy A57"), [(12, 512)])

        combined = filter_catalog(FilterRequirements(brand="Samsung", min_ram_gb=8, min_storage_gb=256))
        self.assertEqual(self.configurations(combined, "Samsung", "Galaxy A57"), [(8, 256), (12, 256), (12, 512)])

    def test_model_level_constraints_are_applied_to_each_variant_with_and_semantics(self):
        requirements = FilterRequirements(
            min_ram_gb=8,
            min_battery_capacity_mah=5000,
            min_refresh_rate_hz=120,
            min_resolution_width_px=1080,
            requires_5g=True,
            max_weight_g=200,
        )
        results = filter_catalog(requirements)
        self.assertTrue(results.exists())
        for variant in results:
            model = variant.device_model
            self.assertGreaterEqual(variant.ram_gb, 8)
            self.assertGreaterEqual(model.battery_spec.capacity_mah, 5000)
            self.assertGreaterEqual(model.display_specs.get(role="primary").refresh_rate_hz, 120)
            self.assertGreaterEqual(model.display_specs.get(role="primary").resolution_width_px, 1080)
            self.assertIs(model.connectivity_spec.supports_5g, True)
            self.assertLessEqual(model.physical_spec.weight_g, 200)

    def test_unknown_boolean_and_numeric_values_do_not_satisfy_hard_constraints(self):
        unknown_nfc_model = DeviceModel.objects.filter(connectivity_spec__supports_nfc__isnull=True).first()
        nfc_results = filter_catalog(FilterRequirements(requires_nfc=True))
        self.assertFalse(nfc_results.filter(device_model=unknown_nfc_model).exists())
        self.assertTrue(all(variant.device_model.connectivity_spec.supports_nfc is True for variant in nfc_results))

        unknown_brightness_model = DeviceModel.objects.filter(
            display_specs__role="primary", display_specs__peak_brightness_nits__isnull=True
        ).first()
        brightness_results = filter_catalog(FilterRequirements(min_brightness_nits=1000))
        self.assertFalse(brightness_results.filter(device_model=unknown_brightness_model).exists())

    def test_none_constraints_return_only_eligible_available_variants(self):
        results = filter_catalog(FilterRequirements())
        self.assertTrue(results.exists())
        self.assertTrue(all(variant.device_model.is_catalog_eligible and variant.is_available for variant in results))
        self.assertFalse(results.filter(device_model__device_kind=DeviceModel.DeviceKind.FEATURE_PHONE).exists())

    def test_camera_joins_do_not_duplicate_variants_and_results_are_deterministic(self):
        requirements = FilterRequirements(min_main_camera_mp=50, min_ultrawide_mp=5, min_video_fps=60)
        first_ids = list(filter_catalog(requirements).values_list("pk", flat=True))
        second_ids = list(filter_catalog(requirements).values_list("pk", flat=True))
        self.assertEqual(first_ids, second_ids)
        self.assertEqual(len(first_ids), len(set(first_ids)))

    def test_wifi_ip_and_android_constraints_use_deterministic_comparisons(self):
        wifi_results = filter_catalog(FilterRequirements(required_wifi_standard="Wi-Fi 6"))
        self.assertTrue(wifi_results.exists())
        allowed_wifi = {"Wi-Fi 6", "Wi-Fi 6E", "Wi-Fi 7"}
        self.assertTrue(all(variant.device_model.connectivity_spec.wifi_standard in allowed_wifi for variant in wifi_results))

        ip_results = filter_catalog(FilterRequirements(required_ip_rating="IP64"))
        self.assertTrue(ip_results.exists())
        self.assertTrue(all(variant.device_model.physical_spec.ip_rating in {"IP64", "IP65", "IP66", "IP67", "IP68"} for variant in ip_results))

        android_results = filter_catalog(FilterRequirements(minimum_android_version=15))
        self.assertTrue(android_results.exists())
        self.assertTrue(
            all(
                variant.device_model.software_spec.platform_name == "Android"
                and variant.device_model.software_spec.platform_version >= 15
                for variant in android_results
            )
        )

    def test_impossible_requirement_returns_an_empty_queryset(self):
        self.assertFalse(filter_catalog(FilterRequirements(min_ram_gb=1000)).exists())
