# Generated manually for the simulation-only ownership ledger.
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="SimulationRun",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("run_id", models.CharField(max_length=120, unique=True)),
                ("seed", models.BigIntegerField()),
                ("preset", models.CharField(max_length=20)),
                ("status", models.CharField(choices=[("created", "Created"), ("seeding", "Seeding"), ("seeded", "Seeded"), ("running", "Running"), ("completed", "Completed"), ("failed", "Failed"), ("cleaning", "Cleaning"), ("cleaned", "Cleaned")], default="created", max_length=20)),
                ("environment", models.CharField(max_length=40)),
                ("database_engine", models.CharField(max_length=80)),
                ("database_name", models.CharField(max_length=255)),
                ("base_url", models.URLField(blank=True, null=True)),
                ("configuration", models.JSONField(blank=True, default=dict)),
                ("initial_state", models.JSONField(blank=True, default=dict)),
                ("created_counts", models.JSONField(blank=True, default=dict)),
                ("cleaned_counts", models.JSONField(blank=True, default=dict)),
                ("failure_summary", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("started_at", models.DateTimeField(blank=True, null=True)),
                ("finished_at", models.DateTimeField(blank=True, null=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
        ),
        migrations.CreateModel(
            name="SimulationArtifact",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("app_label", models.CharField(max_length=80)),
                ("model_name", models.CharField(max_length=120)),
                ("object_pk", models.CharField(max_length=120)),
                ("identity_marker", models.CharField(blank=True, max_length=255, null=True)),
                ("metadata", models.JSONField(blank=True, default=dict)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("run", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="artifacts", to="simulation.simulationrun")),
            ],
            options={
                "indexes": [models.Index(fields=["run", "model_name"], name="simulation__run_id_0e82bb_idx")],
                "constraints": [
                    models.UniqueConstraint(fields=("run", "app_label", "model_name", "object_pk"), name="unique_simulation_artifact"),
                ],
            },
        ),
    ]
