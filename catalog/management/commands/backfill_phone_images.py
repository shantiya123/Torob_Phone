from django.core.management.base import BaseCommand

from catalog.image_extraction import extract_gsmarena_image
from catalog.models import DeviceModel


class Command(BaseCommand):
    help = "Backfill missing catalog phone images from existing source pages."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")
        parser.add_argument("--phone-id", type=int)

    def handle(self, *args, **options):
        models = DeviceModel.objects.filter(image_url__isnull=True).order_by("pk")
        if options["phone_id"] is not None:
            models = models.filter(pk=options["phone_id"])
        checked = saved = failed = 0
        for model in models.prefetch_related("source_records"):
            source = model.source_records.order_by("pk").first()
            if source is None:
                failed += 1
                continue
            checked += 1
            image_url = extract_gsmarena_image(source.source_url)
            if not image_url:
                failed += 1
                continue
            if not options["dry_run"]:
                model.image_url = image_url
                model.save(update_fields=["image_url"])
            saved += 1
        action = "would save" if options["dry_run"] else "saved"
        self.stdout.write(f"Checked {checked}; {action} {saved}; unavailable {failed}.")
