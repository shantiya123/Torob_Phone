from django.db import models


class SimulationRun(models.Model):
    class Status(models.TextChoices):
        CREATED = "created", "Created"
        SEEDING = "seeding", "Seeding"
        SEEDED = "seeded", "Seeded"
        RUNNING = "running", "Running"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"
        CLEANING = "cleaning", "Cleaning"
        CLEANED = "cleaned", "Cleaned"

    run_id = models.CharField(max_length=120, unique=True)
    seed = models.BigIntegerField()
    preset = models.CharField(max_length=20)
    status = models.CharField(max_length=20, choices=Status, default=Status.CREATED)
    environment = models.CharField(max_length=40)
    database_engine = models.CharField(max_length=80)
    database_name = models.CharField(max_length=255)
    base_url = models.URLField(null=True, blank=True)
    configuration = models.JSONField(default=dict, blank=True)
    initial_state = models.JSONField(default=dict, blank=True)
    created_counts = models.JSONField(default=dict, blank=True)
    cleaned_counts = models.JSONField(default=dict, blank=True)
    failure_summary = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    started_at = models.DateTimeField(null=True, blank=True)
    finished_at = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.run_id


class SimulationArtifact(models.Model):
    run = models.ForeignKey(SimulationRun, on_delete=models.CASCADE, related_name="artifacts")
    app_label = models.CharField(max_length=80)
    model_name = models.CharField(max_length=120)
    object_pk = models.CharField(max_length=120)
    identity_marker = models.CharField(max_length=255, null=True, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["run", "app_label", "model_name", "object_pk"],
                name="unique_simulation_artifact",
            )
        ]
        indexes = [
            models.Index(fields=["run", "model_name"]),
        ]

    def __str__(self):
        return f"{self.run.run_id}:{self.app_label}.{self.model_name}:{self.object_pk}"
