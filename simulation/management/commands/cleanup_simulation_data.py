from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone

from simulation.models import SimulationRun
from simulation.ownership import delete_owned_artifacts, mark_status
from simulation.safety import assert_safe_database


class Command(BaseCommand):
    help = "Delete only the records owned by one simulation run."

    def add_arguments(self, parser):
        parser.add_argument("--run-id", required=True)
        parser.add_argument("--confirm-database", required=True)
        parser.add_argument("--dry-run", action="store_true")

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

        if run.status == SimulationRun.Status.CLEANED:
            self.stdout.write("Run is already cleaned; no records changed.")
            return

        if options["dry_run"]:
            self.stdout.write(f"Would delete {run.artifacts.count()} owned artifacts.")
            return

        try:
            with transaction.atomic():
                mark_status(run, SimulationRun.Status.CLEANING)
                counts = delete_owned_artifacts(run)
                remaining = run.artifacts.count()
                if remaining:
                    raise RuntimeError(f"{remaining} owned artifacts remain after cleanup.")
                run.cleaned_counts = counts
                mark_status(
                    run,
                    SimulationRun.Status.CLEANED,
                    finished_at=timezone.now(),
                )
        except Exception as exc:
            run.refresh_from_db()
            run.failure_summary = {"cleanup_error": str(exc)[:500]}
            run.save(update_fields=["failure_summary", "updated_at"])
            raise CommandError(f"Simulation cleanup failed: {exc}") from exc

        self.stdout.write(self.style.SUCCESS(f"Cleaned run {run.run_id}: {counts}"))
