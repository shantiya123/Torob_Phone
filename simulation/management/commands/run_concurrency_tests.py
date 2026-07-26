import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import connection
from django.utils import timezone

from simulation.concurrency import run_concurrency_suite
from simulation.models import SimulationRun
from simulation.safety import assert_safe_database


class Command(BaseCommand):
    help = "Run PostgreSQL-authoritative concurrency scenarios for one simulation run."

    def add_arguments(self, parser):
        parser.add_argument("--run-id", required=True)
        parser.add_argument("--confirm-database", required=True)
        parser.add_argument("--output-dir", default="simulation/reports")

    def handle(self, *args, **options):
        try:
            assert_safe_database(
                confirm_database=options["confirm_database"],
                destructive=True,
            )
        except Exception as exc:
            raise CommandError(str(exc)) from exc
        try:
            run = SimulationRun.objects.get(run_id=options["run_id"])
        except SimulationRun.DoesNotExist as exc:
            raise CommandError("Unknown simulation run.") from exc
        results = run_concurrency_suite(run)
        report = {
            "run_id": run.run_id,
            "generated_at": timezone.now().isoformat(),
            "database_engine": connection.vendor,
            "authoritative": connection.vendor == "postgresql",
            "passed": all(item["passed"] for item in results if item["status"] != "skipped"),
            "results": results,
        }
        directory = Path(options["output_dir"])
        directory.mkdir(parents=True, exist_ok=True)
        (directory / f"{run.run_id}-concurrency.json").write_text(
            json.dumps(report, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
        lines = [
            f"# Concurrency report: `{run.run_id}`",
            "",
            f"- Database engine: `{connection.vendor}`",
            f"- Authoritative: **{report['authoritative']}**",
            f"- Passed: **{report['passed']}**",
            "",
        ]
        for result in results:
            lines.append(
                f"- **{result['status']}** `{result['name']}` — "
                f"{'PASS' if result['passed'] else 'FAIL/SKIPPED'}: {result['detail']}"
            )
        (directory / f"{run.run_id}-concurrency.md").write_text(
            "\n".join(lines) + "\n",
            encoding="utf-8",
        )
        self.stdout.write(json.dumps(report, indent=2, ensure_ascii=False))
        if connection.vendor == "postgresql" and not report["passed"]:
            raise CommandError("One or more PostgreSQL concurrency scenarios failed.")
