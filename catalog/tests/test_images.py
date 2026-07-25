import json
import tempfile
from pathlib import Path
from unittest.mock import patch

from django.conf import settings
from django.core.management import call_command
from django.test import TestCase

from catalog.image_extraction import extract_gsmarena_image
from catalog.importer import import_dataset
from catalog.models import Brand, DataSource, DeviceModel, DeviceVariant, SourceRecord
from catalog.serializers import DeviceVariantListSerializer


class ImageSupportTests(TestCase):
    def make_variant(self, image_url=None):
        suffix = DeviceModel.objects.count() + 1
        brand = Brand.objects.create(name=f"Example {suffix}", slug=f"example-{suffix}")
        model = DeviceModel.objects.create(
            brand=brand, model_name="Phone", model_key=f"phone-{suffix}", image_url=image_url
        )
        return DeviceVariant.objects.create(
            device_model=model, configuration_key="8-128", ram_gb=8, storage_gb=128
        )

    def test_variant_serialization_inherits_nullable_parent_image(self):
        variant = self.make_variant("https://fdn.gsmarena.com/img.jpg")
        self.assertEqual(DeviceVariantListSerializer(variant).data["image_url"], "https://fdn.gsmarena.com/img.jpg")
        missing = self.make_variant()
        self.assertIsNone(DeviceVariantListSerializer(missing).data["image_url"])

    def test_import_retains_image_without_changing_source_url(self):
        records = json.loads((Path(settings.BASE_DIR) / "data" / "clean_data.json").read_text(encoding="utf-8"))
        record = records[0]
        record["image_url"] = "https://fdn.gsmarena.com/example.jpg"
        with tempfile.NamedTemporaryFile(mode="w", suffix=".json", encoding="utf-8", delete=False) as handle:
            json.dump([record], handle)
            path = Path(handle.name)
        try:
            import_dataset(path)
        finally:
            path.unlink(missing_ok=True)
        model = DeviceModel.objects.get()
        source = SourceRecord.objects.get()
        self.assertEqual(model.image_url, "https://fdn.gsmarena.com/example.jpg")
        self.assertEqual(source.source_url, record["source"]["url"])

    @patch("catalog.image_extraction._is_safe_public_url", return_value=True)
    @patch("catalog.image_extraction.build_opener")
    def test_extraction_prefers_og_image_and_normalizes_protocol_relative_url(self, opener_factory, _safe):
        class Response:
            status = 200
            headers = {}

            def read(self, _limit):
                return b'<meta property="og:image" content="//fdn.gsmarena.com/phone.jpg">'

            def __enter__(self):
                return self

            def __exit__(self, *args):
                return False

        opener_factory.return_value.open.return_value = Response()
        self.assertEqual(
            extract_gsmarena_image("https://www.gsmarena.com/example.php"),
            "https://fdn.gsmarena.com/phone.jpg",
        )

    @patch("catalog.management.commands.backfill_phone_images.extract_gsmarena_image", return_value="https://fdn.gsmarena.com/backfill.jpg")
    def test_backfill_dry_run_preserves_missing_value(self, _extract):
        variant = self.make_variant()
        source = DataSource.objects.create(name="GSMArena", base_url="https://www.gsmarena.com")
        SourceRecord.objects.create(
            data_source=source, device_model=variant.device_model,
            source_url="https://www.gsmarena.com/example.php", raw_payload={}, payload_hash="a" * 64,
        )
        call_command("backfill_phone_images", "--dry-run", verbosity=0)
        variant.device_model.refresh_from_db()
        self.assertIsNone(variant.device_model.image_url)
