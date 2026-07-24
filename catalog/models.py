from django.db import models
from django.conf import settings
from django.db.models import Q


class DataSource(models.Model):
    name = models.CharField(max_length=100, unique=True)
    base_url = models.URLField(max_length=500)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class ImportRun(models.Model):
    class Status(models.TextChoices):
        RUNNING = "running", "Running"
        COMPLETED = "completed", "Completed"
        FAILED = "failed", "Failed"

    source_file = models.CharField(max_length=500)
    file_sha256 = models.CharField(max_length=64, db_index=True)
    schema_version = models.CharField(max_length=50, default="clean-data-v1")
    importer_version = models.CharField(max_length=50, default="1.0")
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status, default=Status.RUNNING)
    records_seen = models.PositiveIntegerField(default=0)
    records_imported = models.PositiveIntegerField(default=0)
    records_rejected = models.PositiveIntegerField(default=0)
    records_skipped = models.PositiveIntegerField(default=0)
    validation_messages = models.JSONField(default=list, blank=True)


class Brand(models.Model):
    name = models.CharField(max_length=120)
    slug = models.SlugField(max_length=160, unique=True, allow_unicode=True)

    def __str__(self):
        return self.name


class DeviceModel(models.Model):
    class DeviceKind(models.TextChoices):
        SMARTPHONE = "smartphone", "Smartphone"
        FEATURE_PHONE = "feature_phone", "Feature phone"
        TABLET = "tablet", "Tablet"
        OTHER = "other", "Other"
        UNKNOWN = "unknown", "Unknown"

    brand = models.ForeignKey(Brand, on_delete=models.PROTECT, related_name="device_models")
    model_name = models.CharField(max_length=255)
    model_key = models.SlugField(max_length=300, allow_unicode=True)
    device_kind = models.CharField(max_length=20, choices=DeviceKind, default=DeviceKind.UNKNOWN)
    announced_on = models.DateField(null=True, blank=True)
    released_on = models.DateField(null=True, blank=True)
    availability_status = models.CharField(max_length=100, null=True, blank=True)
    is_catalog_eligible = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["brand", "model_key"], name="unique_brand_model_key"),
        ]

    def __str__(self):
        return f"{self.brand.name} {self.model_name}"


class SourceRecord(models.Model):
    class ValidationStatus(models.TextChoices):
        VALID = "valid", "Valid"
        REJECTED = "rejected", "Rejected"
        AMBIGUOUS = "ambiguous", "Ambiguous"

    data_source = models.ForeignKey(DataSource, on_delete=models.PROTECT, related_name="source_records")
    device_model = models.ForeignKey(
        DeviceModel, null=True, blank=True, on_delete=models.SET_NULL, related_name="source_records"
    )
    source_url = models.URLField(max_length=500)
    external_id = models.CharField(max_length=255, null=True, blank=True)
    raw_payload = models.JSONField()
    normalized_payload = models.JSONField(null=True, blank=True)
    payload_hash = models.CharField(max_length=64)
    payload_history = models.JSONField(default=list, blank=True)
    observed_at = models.DateTimeField(auto_now=True)
    first_import_run = models.ForeignKey(
        ImportRun, null=True, blank=True, on_delete=models.SET_NULL, related_name="first_seen_source_records"
    )
    last_import_run = models.ForeignKey(
        ImportRun, null=True, blank=True, on_delete=models.SET_NULL, related_name="last_seen_source_records"
    )
    validation_status = models.CharField(
        max_length=20, choices=ValidationStatus, default=ValidationStatus.VALID
    )

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["data_source", "source_url"], name="unique_source_identity"),
        ]


class CanonicalFieldEvidence(models.Model):
    class Confidence(models.TextChoices):
        SOURCE_NORMALIZED = "source_normalized", "Source-normalized"
        AMBIGUOUS = "ambiguous", "Ambiguous"

    device_model = models.ForeignKey(DeviceModel, on_delete=models.CASCADE, related_name="field_evidence")
    field_path = models.CharField(max_length=255)
    source_record = models.ForeignKey(SourceRecord, on_delete=models.CASCADE, related_name="field_evidence")
    observed_value = models.JSONField()
    confidence = models.CharField(max_length=30, choices=Confidence)
    is_selected = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["device_model", "field_path", "source_record"],
                name="unique_field_evidence_per_source",
            ),
        ]


class DeviceVariant(models.Model):
    device_model = models.ForeignKey(DeviceModel, on_delete=models.CASCADE, related_name="variants")
    storage_gb = models.PositiveIntegerField(null=True, blank=True)
    ram_gb = models.PositiveIntegerField(null=True, blank=True)
    storage_technology = models.CharField(max_length=120, null=True, blank=True)
    sku_or_region = models.CharField(max_length=120, null=True, blank=True)
    configuration_key = models.CharField(max_length=400)
    is_available = models.BooleanField(default=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["device_model", "configuration_key"], name="unique_variant_configuration"
            ),
            models.CheckConstraint(
                condition=Q(storage_gb__isnull=True) | Q(storage_gb__gte=1),
                name="variant_storage_positive",
            ),
            models.CheckConstraint(
                condition=Q(ram_gb__isnull=True) | Q(ram_gb__gte=1), name="variant_ram_positive"
            ),
        ]


class PerformanceSpec(models.Model):
    device_model = models.OneToOneField(DeviceModel, on_delete=models.CASCADE, related_name="performance_spec")
    chipset_name = models.CharField(max_length=255, null=True, blank=True)
    cpu_description = models.TextField(null=True, blank=True)
    gpu_name = models.CharField(max_length=255, null=True, blank=True)


class DisplaySpec(models.Model):
    class Role(models.TextChoices):
        PRIMARY = "primary", "Primary"
        COVER = "cover", "Cover"
        EXTERNAL = "external", "External"
        UNKNOWN = "unknown", "Unknown"

    device_model = models.ForeignKey(DeviceModel, on_delete=models.CASCADE, related_name="display_specs")
    role = models.CharField(max_length=20, choices=Role, default=Role.PRIMARY)
    size_inches = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    resolution_width_px = models.PositiveIntegerField(null=True, blank=True)
    resolution_height_px = models.PositiveIntegerField(null=True, blank=True)
    technology = models.CharField(max_length=120, null=True, blank=True)
    refresh_rate_hz = models.PositiveIntegerField(null=True, blank=True)
    peak_brightness_nits = models.PositiveIntegerField(null=True, blank=True)
    supports_hdr = models.BooleanField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["device_model", "role"], name="unique_display_role"),
            models.CheckConstraint(condition=Q(size_inches__isnull=True) | Q(size_inches__gt=0), name="display_size_positive"),
        ]


class BatterySpec(models.Model):
    device_model = models.OneToOneField(DeviceModel, on_delete=models.CASCADE, related_name="battery_spec")
    capacity_mah = models.PositiveIntegerField(null=True, blank=True)
    wired_charging_w = models.PositiveIntegerField(null=True, blank=True)
    supports_wireless_charging = models.BooleanField(null=True, blank=True)


class CameraSystem(models.Model):
    class Position(models.TextChoices):
        REAR = "rear", "Rear"
        FRONT = "front", "Front"

    device_model = models.ForeignKey(DeviceModel, on_delete=models.CASCADE, related_name="camera_systems")
    position = models.CharField(max_length=10, choices=Position)
    max_video_resolution = models.CharField(max_length=20, null=True, blank=True)
    max_video_fps = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["device_model", "position"], name="unique_camera_position"),
        ]


class CameraLens(models.Model):
    class Role(models.TextChoices):
        WIDE = "wide", "Wide"
        ULTRAWIDE = "ultrawide", "Ultrawide"
        TELEPHOTO = "telephoto", "Telephoto"
        MACRO = "macro", "Macro"
        DEPTH = "depth", "Depth"
        UNKNOWN = "unknown", "Unknown"

    camera_system = models.ForeignKey(CameraSystem, on_delete=models.CASCADE, related_name="lenses")
    role = models.CharField(max_length=20, choices=Role)
    megapixels = models.PositiveIntegerField(null=True, blank=True)
    has_ois = models.BooleanField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["camera_system", "role"], name="unique_camera_lens_role"),
        ]


class ConnectivitySpec(models.Model):
    device_model = models.OneToOneField(DeviceModel, on_delete=models.CASCADE, related_name="connectivity_spec")
    supports_5g = models.BooleanField(null=True, blank=True)
    wifi_standard = models.CharField(max_length=30, null=True, blank=True)
    bluetooth_version = models.CharField(max_length=20, null=True, blank=True)
    supports_nfc = models.BooleanField(null=True, blank=True)


class PhysicalSpec(models.Model):
    device_model = models.OneToOneField(DeviceModel, on_delete=models.CASCADE, related_name="physical_spec")
    weight_g = models.PositiveIntegerField(null=True, blank=True)
    ip_rating = models.CharField(max_length=20, null=True, blank=True)


class SoftwareSpec(models.Model):
    device_model = models.OneToOneField(DeviceModel, on_delete=models.CASCADE, related_name="software_spec")
    platform_name = models.CharField(max_length=100, null=True, blank=True)
    platform_version = models.PositiveIntegerField(null=True, blank=True)
    promised_major_updates = models.PositiveIntegerField(null=True, blank=True)


class BenchmarkMeasurement(models.Model):
    device_model = models.ForeignKey(DeviceModel, on_delete=models.CASCADE, related_name="benchmark_measurements")
    source_record = models.ForeignKey(SourceRecord, on_delete=models.PROTECT, related_name="benchmark_measurements")
    benchmark_name = models.CharField(max_length=80)
    benchmark_version = models.CharField(max_length=40, null=True, blank=True)
    measurement_key = models.CharField(max_length=160)
    score = models.PositiveIntegerField()
    measured_at = models.DateField(null=True, blank=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["device_model", "source_record", "measurement_key"],
                name="unique_benchmark_measurement",
            ),
            models.CheckConstraint(condition=Q(score__gte=0), name="benchmark_score_nonnegative"),
        ]


class UserQuerySet(models.Model):
    """The latest validated search filters for one authenticated user.

    This stores filter intent only. It is deliberately separate from catalog
    facts and never stores LLM output other than the validated QuerySet.
    """

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="saved_query_set"
    )
    query_set = models.JSONField()
    updated_at = models.DateTimeField(auto_now=True)
