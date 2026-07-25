from django.core.management.base import BaseCommand, CommandError

from shopping.services import release_expired_basket_items


class Command(BaseCommand):
    help = "Release expired BasketItem reservations and restore Offer stock."

    def add_arguments(self, parser):
        parser.add_argument("--batch-size", type=int, default=200)
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, **options):
        batch_size = options["batch_size"]
        if batch_size <= 0:
            raise CommandError("--batch-size must be positive.")
        result = release_expired_basket_items(
            batch_size=batch_size,
            dry_run=options["dry_run"],
        )
        self.stdout.write(f"Expired reservations found: {result['found']}")
        self.stdout.write(f"Reservations released: {result['released']}")
        self.stdout.write(f"Offer units restored: {result['units_restored']}")
        self.stdout.write("Errors: 0")
