import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import connection
from django.conf import settings
from django.utils import timezone

from simulation.models import SimulationRun
from simulation.validation import audit_run


class Command(BaseCommand):
    help = "Audit inventory, financial, order, ownership, and state invariants."

    def add_arguments(self, parser):
        parser.add_argument("--run-id", required=True)
        parser.add_argument("--format", default="markdown,json")
        parser.add_argument("--output-dir", default="simulation/reports")

    def handle(self, *args, **options):
        try:
            run = SimulationRun.objects.get(run_id=options["run_id"])
        except SimulationRun.DoesNotExist as exc:
            raise CommandError("Unknown simulation run.") from exc

        result = audit_run(run)
        result["generated_at"] = timezone.now().isoformat()
        result["database_engine"] = connection.vendor
        result["database_name"] = str(connection.settings_dict.get("NAME") or "")
        result["environment"] = getattr(settings, "DJANGO_ENV", "unknown")
        output_dir = Path(options["output_dir"])
        output_dir.mkdir(parents=True, exist_ok=True)
        formats = {item.strip().lower() for item in options["format"].split(",")}
        if "json" in formats:
            (output_dir / f"{run.run_id}-validation.json").write_text(
                json.dumps(result, indent=2, ensure_ascii=False),
                encoding="utf-8",
            )
        if "markdown" in formats or "md" in formats:
            lines = [
                f"# Simulation validation: `{run.run_id}`",
                "",
                f"- Passed: **{result['passed']}**",
                f"- Generated: `{result['generated_at']}`",
                "",
                "## Counts",
                "",
            ]
            lines.extend(f"- {key}: {value}" for key, value in result["counts"].items())
            lines.extend(["", "## Findings", ""])
            if result["findings"]:
                lines.extend(
                    f"- **{item['severity']}** `{item['code']}` — {item['detail']}"
                    for item in result["findings"]
                )
            else:
                lines.append("- No critical findings.")
            (output_dir / f"{run.run_id}-validation.md").write_text(
                "\n".join(lines) + "\n",
                encoding="utf-8",
            )

        self.stdout.write(json.dumps(result, indent=2, ensure_ascii=False))
        if not result["passed"]:
            raise CommandError("Critical simulation invariants failed.")
