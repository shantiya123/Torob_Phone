import json
from os import getenv
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from simulation.marketplace_scenario import MarketplaceScenario
from simulation.models import SimulationRun
from simulation.safety import assert_safe_database, database_engine, database_name


class Command(BaseCommand):
    help = "Run the resumable frontend-ready marketplace lifecycle scenario."

    def add_arguments(self, parser):
        parser.add_argument("--run-id", required=True)
        parser.add_argument("--seed", type=int, default=20260726)
        parser.add_argument("--base-url", default=getenv("SIMULATION_BASE_URL", "http://127.0.0.1:8000"))
        parser.add_argument("--stores", type=int, default=6)
        parser.add_argument("--approved-stores", type=int, default=5)
        parser.add_argument("--customers", type=int, default=10)
        parser.add_argument("--offers-per-store-min", type=int, default=250)
        parser.add_argument("--offers-per-store-max", type=int, default=300)
        parser.add_argument("--mode", choices=("api", "hybrid", "factory"), default="hybrid")
        parser.add_argument("--keep-data", action="store_true")
        parser.add_argument("--confirm-database")
        parser.add_argument("--output-dir", default="reports")

    def handle(self, *args, **options):
        try:
            assert_safe_database(
                confirm_database=options.get("confirm_database"),
                destructive=True,
            )
        except Exception as exc:
            raise CommandError(str(exc)) from exc

        run, created = SimulationRun.objects.get_or_create(
            run_id=options["run_id"],
            defaults={
                "seed": options["seed"],
                "preset": "marketplace",
                "status": SimulationRun.Status.CREATED,
                "environment": getenv("DJANGO_ENV", "development"),
                "database_engine": database_engine(),
                "database_name": database_name(),
                "base_url": options["base_url"],
                "configuration": {"scenario": "marketplace", "keep_data": options["keep_data"]},
                "started_at": timezone.now(),
            },
        )
        if not created:
            if run.seed != options["seed"]:
                raise CommandError("Existing run_id has a different seed; choose a new run_id.")
            saved = run.configuration.get("marketplace_options", {})
            requested = {
                "stores": options["stores"], "approved_stores": options["approved_stores"],
                "customers": options["customers"], "offers_min": options["offers_per_store_min"],
                "offers_max": options["offers_per_store_max"], "mode": options["mode"],
            }
            if saved and saved != requested:
                raise CommandError("Existing run_id has different marketplace options.")

        scenario = MarketplaceScenario(
            run,
            base_url=options["base_url"],
            seed=options["seed"],
            stores=options["stores"],
            approved_stores=options["approved_stores"],
            customers=options["customers"],
            offers_min=options["offers_per_store_min"],
            offers_max=options["offers_per_store_max"],
            mode=options["mode"],
        )
        try:
            manifest = scenario.run_all()
        except Exception as exc:
            run.failure_summary = {"type": type(exc).__name__, "detail": str(exc)[:1000]}
            run.status = SimulationRun.Status.FAILED
            run.finished_at = timezone.now()
            run.save(update_fields=["failure_summary", "status", "finished_at", "updated_at"])
            raise CommandError(f"Marketplace scenario failed: {exc}") from exc

        output_dir = Path(options["output_dir"])
        output_dir.mkdir(parents=True, exist_ok=True)
        report = {
            "run_id": run.run_id,
            "scenario": "frontend-ready-marketplace",
            "database_engine": run.database_engine,
            "database_name": run.database_name,
            "base_url": run.base_url,
            "mode": options["mode"],
            "keep_data": options["keep_data"],
            "generated_at": timezone.now().isoformat(),
            "validation": manifest.get("validation", {}),
            "stages": manifest.get("stages", {}),
            "stores": manifest.get("reviewed_stores", []),
            "customers": manifest.get("customers_created", []),
            "offers": manifest.get("offers_created", {}),
            "wallets": manifest.get("wallets_charged", []),
            "baskets": manifest.get("basket_scenarios_complete", []),
            "checkouts": manifest.get("checkout_scenarios_complete", []),
            "cancellations": manifest.get("cancellation_scenarios_complete", []),
        }
        json_path = output_dir / f"{run.run_id}-marketplace.json"
        md_path = output_dir / f"{run.run_id}-marketplace.md"
        json_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
        validation = report["validation"]
        md_path.write_text(
            "\n".join([
                f"# Marketplace scenario report: `{run.run_id}`", "",
                f"- Database: `{run.database_engine}` / `{run.database_name}`",
                f"- Mode: `{options['mode']}`",
                f"- Retained for frontend development: `{options['keep_data']}`",
                f"- Validation: **{'PASS' if validation.get('passed') else 'FAIL'}**",
                f"- Stores: {validation.get('approved_stores', 0)} approved, {validation.get('rejected_stores', 0)} rejected",
                f"- Customers: {validation.get('customers', 0)}",
                f"- Offers: {validation.get('offers', 0)}",
                f"- Orders: {validation.get('orders', 0)}", "",
                "## Findings", "",
                *(f"- {finding}" for finding in validation.get("findings", [])),
                *(["- None"] if not validation.get("findings") else []),
            ]) + "\n",
            encoding="utf-8",
        )
        self.stdout.write(self.style.SUCCESS(
            f"Marketplace run {run.run_id} completed. Reports: {json_path}, {md_path}"
        ))
