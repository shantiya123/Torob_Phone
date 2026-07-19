import json
import tempfile
from pathlib import Path

from django.conf import settings
from django.core.management import call_command
from django.db import IntegrityError, transaction
from django.test import TestCase

from catalog.importer import import_dataset
from catalog.models import (
    BatterySpec,
    BenchmarkMeasurement,
    Brand,
    DeviceModel,
    DeviceVariant,
    ImportRun,
    SourceRecord,
)


DATASET_PATH = Path(settings.BASE_DIR) / "data" / "clean_data.json"


class CatalogImportTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.records = json.loads(DATASET_PATH.read_text(encoding="utf-8"))

    def import_approved_dataset(self):
        call_command("import_catalog", path=DATASET_PATH, verbosity=0)

    def test_approved_dataset_loads_into_typed_catalog_and_preserves_source_payload(self):
        self.import_approved_dataset()

        self.assertEqual(ImportRun.objects.get().records_imported, len(self.records))
        self.assertEqual(ImportRun.objects.get().records_rejected, 0)
        self.assertEqual(SourceRecord.objects.count(), len(self.records))
        self.assertEqual(DeviceModel.objects.count(), len(self.records))
        self.assertEqual(Brand.objects.count(), len({record["brand"] for record in self.records}))

        source_record = SourceRecord.objects.get(source_url=self.records[0]["source"]["url"])
        self.assertEqual(source_record.raw_payload, self.records[0])
        self.assertEqual(source_record.device_model.model_name, self.records[0]["model"])

    def test_reimport_is_idempotent_for_catalog_records(self):
        self.import_approved_dataset()
        before = {
            "sources": SourceRecord.objects.count(),
            "models": DeviceModel.objects.count(),
            "variants": DeviceVariant.objects.count(),
            "benchmarks": BenchmarkMeasurement.objects.count(),
        }

        self.import_approved_dataset()

        self.assertEqual(ImportRun.objects.count(), 2)
        self.assertEqual(SourceRecord.objects.count(), before["sources"])
        self.assertEqual(DeviceModel.objects.count(), before["models"])
        self.assertEqual(DeviceVariant.objects.count(), before["variants"])
        self.assertEqual(BenchmarkMeasurement.objects.count(), before["benchmarks"])
        self.assertEqual(ImportRun.objects.order_by("id").last().records_imported, len(self.records))

    def test_missing_optional_values_and_false_parser_flags_remain_unknown(self):
        self.import_approved_dataset()
        model = DeviceModel.objects.get(brand__name="Samsung", model_name="Galaxy A27")
        self.assertIsNone(model.battery_spec.supports_wireless_charging)
        self.assertIsNone(model.display_specs.get(role="primary").peak_brightness_nits)
        false_nfc_record = next(record for record in self.records if record["connectivity"]["nfc"] is False)
        false_nfc_model = DeviceModel.objects.get(
            brand__name=false_nfc_record["brand"], model_name=false_nfc_record["model"]
        )
        self.assertIsNone(false_nfc_model.connectivity_spec.supports_nfc)

    def test_feature_phones_are_imported_without_variants(self):
        self.import_approved_dataset()
        feature_phone = DeviceModel.objects.get(brand__name="Nokia", model_name="235 4G (2026)")
        self.assertEqual(feature_phone.device_kind, DeviceModel.DeviceKind.FEATURE_PHONE)
        self.assertFalse(feature_phone.is_catalog_eligible)
        self.assertEqual(feature_phone.variants.count(), 0)

    def test_duplicate_source_identity_is_rejected_without_duplicate_catalog_data(self):
        duplicate_payload = [self.records[0], self.records[0]]
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", suffix=".json", delete=False) as temporary_file:
            json.dump(duplicate_payload, temporary_file)
            temporary_path = Path(temporary_file.name)
        try:
            import_run, stats = import_dataset(temporary_path)
        finally:
            temporary_path.unlink(missing_ok=True)

        self.assertEqual(stats["records_imported"], 1)
        self.assertEqual(stats["records_rejected"], 1)
        self.assertEqual(import_run.records_rejected, 1)
        self.assertEqual(SourceRecord.objects.count(), 1)
        self.assertEqual(DeviceModel.objects.count(), 1)

    def test_invalid_optional_number_is_not_coerced_into_a_fact(self):
        invalid_record = json.loads(json.dumps(self.records[0]))
        invalid_record["battery"]["capacity_mah"] = "6000"
        with tempfile.NamedTemporaryFile(mode="w", encoding="utf-8", suffix=".json", delete=False) as temporary_file:
            json.dump([invalid_record], temporary_file)
            temporary_path = Path(temporary_file.name)
        try:
            import_run, stats = import_dataset(temporary_path)
        finally:
            temporary_path.unlink(missing_ok=True)

        self.assertEqual(stats["records_imported"], 1)
        self.assertIsNone(BatterySpec.objects.get().capacity_mah)
        self.assertEqual(SourceRecord.objects.get().raw_payload["battery"]["capacity_mah"], "6000")
        self.assertTrue(any("capacity_mah" in item.get("warning", "") for item in import_run.validation_messages))

    def test_variant_identity_and_versionless_benchmarks_are_supported(self):
        self.import_approved_dataset()
        model = DeviceModel.objects.get(brand__name="Samsung", model_name="Galaxy A27")
        variant = model.variants.first()
        with transaction.atomic():
            with self.assertRaises(IntegrityError):
                DeviceVariant.objects.create(
                    device_model=model,
                    storage_gb=variant.storage_gb,
                    ram_gb=variant.ram_gb,
                    storage_technology=variant.storage_technology,
                    configuration_key=variant.configuration_key,
                )
        self.assertTrue(BenchmarkMeasurement.objects.filter(benchmark_version__isnull=True).exists())

    def test_model_key_preserves_meaningful_plus_suffixes(self):
        self.import_approved_dataset()
        samsung_s26_models = DeviceModel.objects.filter(
            brand__name="Samsung", model_name__in=["Galaxy S26", "Galaxy S26+"]
        )
        self.assertEqual(samsung_s26_models.count(), 2)
        self.assertSetEqual(set(samsung_s26_models.values_list("model_key", flat=True)), {"galaxy-s26", "galaxy-s26-plus"})
