from pathlib import Path

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError

from catalog.importer import RecordValidationError, import_dataset
from catalog.models import (
    BenchmarkMeasurement,
    Brand,
    CameraLens,
    CameraSystem,
    DeviceModel,
    DeviceVariant,
    DisplaySpec,
    SourceRecord,
)


class Command(BaseCommand):
    help = "Import the approved normalized mobile-phone dataset into the canonical catalog."

    def add_arguments(self, parser):
        parser.add_argument(
            "--path",
            type=Path,
            default=Path(settings.BASE_DIR) / "data" / "clean_data.json",
            help="Path to the clean dataset (defaults to data/clean_data.json).",
        )

    def handle(self, *args, **options):
        path = options["path"]
        if not path.is_file():
            raise CommandError(f"Dataset does not exist: {path}")
        try:
            import_run, stats = import_dataset(path)
        except RecordValidationError as exc:
            raise CommandError(str(exc)) from exc

        self.stdout.write(
            self.style.SUCCESS(
                "Import run {run_id} completed: {imported}/{seen} records imported, {rejected} rejected.".format(
                    run_id=import_run.pk,
                    imported=stats["records_imported"],
                    seen=stats["records_seen"],
                    rejected=stats["records_rejected"],
                )
            )
        )
        self.stdout.write(
            "Created in this run: {sources} source records, {brands} brands, {models} device models.".format(
                sources=stats["source_records_created"],
                brands=stats["brands_created"],
                models=stats["models_created"],
            )
        )
        self.stdout.write(
            "Catalog totals: {sources} source records, {brands} brands, {models} models, "
            "{variants} variants, {displays} displays, {systems} camera systems, "
            "{lenses} lenses, {benchmarks} benchmark measurements.".format(
                sources=SourceRecord.objects.count(),
                brands=Brand.objects.count(),
                models=DeviceModel.objects.count(),
                variants=DeviceVariant.objects.count(),
                displays=DisplaySpec.objects.count(),
                systems=CameraSystem.objects.count(),
                lenses=CameraLens.objects.count(),
                benchmarks=BenchmarkMeasurement.objects.count(),
            )
        )
        if import_run.validation_messages:
            self.stdout.write(self.style.WARNING(f"Validation messages: {len(import_run.validation_messages)}"))
