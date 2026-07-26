import json
import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import close_old_connections
from django.utils import timezone

from catalog.models import DeviceVariant
from marketplace.models import Offer, Store
from simulation.http.client import ApiClient
from simulation.http.scenarios import anonymous, customer, staff, store
from simulation.models import SimulationRun
from simulation.reporting import journey_report, write_journey_reports

User = get_user_model()


def password_for(seed, index):
    return f"SimPass!{seed}_{index}"


class Command(BaseCommand):
    help = "Run real HTTP role journeys against a running Django server."

    def add_arguments(self, parser):
        parser.add_argument("--run-id", required=True)
        parser.add_argument("--base-url", default=os.getenv("SIMULATION_BASE_URL", "http://127.0.0.1:8000"))
        parser.add_argument("--scenario", choices=("all", "anonymous", "customer", "store", "staff"), default="all")
        parser.add_argument("--timeout", type=float, default=float(os.getenv("SIMULATION_HTTP_TIMEOUT_SECONDS", "15")))
        parser.add_argument("--output-dir", default=os.getenv("SIMULATION_REPORT_DIR", "simulation/reports"))

    def handle(self, *args, **options):
        try:
            run = SimulationRun.objects.get(run_id=options["run_id"])
        except SimulationRun.DoesNotExist as exc:
            raise CommandError("Unknown simulation run.") from exc
        context = self._context(run)
        run.status = SimulationRun.Status.RUNNING
        run.base_url = options["base_url"]
        run.save(update_fields=["status", "base_url", "updated_at"])
        results = []
        try:
            scenarios = {
                "anonymous": (anonymous.run, "anonymous"),
                "customer": (customer.run, "customer"),
                "store": (store.run, "store"),
                "staff": (staff.run, "staff"),
            }
            selected = [options["scenario"]] if options["scenario"] != "all" else list(scenarios)
            for name in selected:
                close_old_connections()
                fn, role = scenarios[name]
                client = ApiClient(options["base_url"], timeout=options["timeout"])
                results.append(fn(client, context))
        except Exception as exc:
            run.failure_summary = {"http_simulation_error": f"{type(exc).__name__}: {exc}"[:500]}
            run.status = SimulationRun.Status.FAILED
            run.finished_at = timezone.now()
            run.save(update_fields=["failure_summary", "status", "finished_at", "updated_at"])
            raise CommandError(f"HTTP simulation failed: {exc}") from exc

        report = journey_report(run.run_id, options["base_url"], results)
        write_journey_reports(report, options["output_dir"])
        run.status = SimulationRun.Status.COMPLETED if report["failure_count"] == 0 else SimulationRun.Status.FAILED
        run.finished_at = timezone.now()
        run.failure_summary = {
            "http_failure_count": report["failure_count"],
            "failures_by_endpoint": report["failures_by_endpoint"],
        }
        run.save(update_fields=["status", "finished_at", "failure_summary", "updated_at"])
        self.stdout.write(json.dumps(report, indent=2, ensure_ascii=False))
        if report["failure_count"]:
            raise CommandError("One or more HTTP journey assertions failed.")

    def _context(self, run):
        marker = f"sim-{run.run_id}-"
        customer = User.objects.filter(username__startswith=marker + "customer-").order_by("username").first()
        store_owner = User.objects.filter(username__startswith=marker + "store-").order_by("username").first()
        staff_user = User.objects.filter(
            username__startswith=marker + "staff-",
            is_staff=True,
        ).order_by("username").first()
        active_store = Store.objects.filter(
            account_profile__user=store_owner,
            status=Store.Status.ACTIVE,
        ).first()
        owned_offer_ids = [
            int(value)
            for value in run.artifacts.filter(
            app_label="marketplace",
            model_name="offer",
            ).values_list("object_pk", flat=True)
            if str(value).isdigit()
        ]
        active_offer = Offer.objects.filter(
            pk__in=owned_offer_ids,
            store__status=Store.Status.ACTIVE,
            quantity__gt=0,
            device_variant__is_available=True,
            device_variant__device_model__is_catalog_eligible=True,
        ).select_related("device_variant").order_by("pk").first()
        customer_offer = None
        if customer:
            customer_offer = Offer.objects.filter(
                pk__in=owned_offer_ids,
                store__status=Store.Status.ACTIVE,
                quantity__gt=0,
                device_variant__is_available=True,
                device_variant__device_model__is_catalog_eligible=True,
            ).exclude(basket_items__basket__user=customer).first()
            if customer_offer is None:
                customer_offer = active_offer
        pending = Store.objects.filter(
            slug__startswith=marker,
            status=Store.Status.PENDING,
        ).order_by("pk").first()
        rejected = Store.objects.filter(
            slug__startswith=marker,
            status=Store.Status.REJECTED,
        ).order_by("pk").first()
        catalog_variant = DeviceVariant.objects.filter(
            is_available=True,
            device_model__is_catalog_eligible=True,
        ).order_by("pk").first()
        from catalog.query_set import empty_query_set

        return {
            "run_id": run.run_id,
            "username": customer.username if customer else "",
            "password": password_for(run.seed, 1),
            "store_username": store_owner.username if store_owner else "",
            "store_password": password_for(run.seed, 10_001),
            "staff_username": staff_user.username if staff_user else os.getenv("SIMULATION_STAFF_USERNAME", ""),
            "staff_password": password_for(run.seed, 20_001) if staff_user else os.getenv("SIMULATION_STAFF_PASSWORD", ""),
            "active_store_id": active_store.pk if active_store else None,
            "offer_id": active_offer.pk if active_offer else None,
            "customer_offer_id": customer_offer.pk if customer_offer else None,
            "variant_id": active_offer.device_variant_id if active_offer else None,
            "catalog_phone_id": catalog_variant.device_model_id if catalog_variant else None,
            "pending_store_id": pending.pk if pending else None,
            "rejected_store_id": rejected.pk if rejected else None,
            "empty_query_set": empty_query_set(),
        }
