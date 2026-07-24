"""Catalog and search serializers.

Implements docs/Serializers.md sections 8 (Catalog Serializers) and
9 (Search Serializers):

* ``DeviceVariantListSerializer`` - compact representation for search results.
* ``DeviceVariantDetailSerializer`` - complete customer-facing representation,
  reading only from the existing catalog domain models.
* ``SearchRequestSerializer`` - validates the shape of a search request
  without re-implementing QuerySet validation (that stays in ``query_set.py``).
* ``SearchResultSerializer`` - paginated ``DeviceVariant`` results, optionally
  annotated with marketplace pricing.

These serializers are read-only: the catalog is populated exclusively through
the importer boundary (see ``importer.py`` / ``docs/CANONICAL_DATA_ARCHITECTURE.md``),
never through a client-facing write API.
"""

from rest_framework import serializers

from .models import (
    BatterySpec,
    BenchmarkMeasurement,
    CameraSystem,
    ConnectivitySpec,
    DeviceVariant,
    DisplaySpec,
    PerformanceSpec,
    PhysicalSpec,
    SoftwareSpec,
)
from .query_set import QuerySetValidationError, validate_query_set

# Phase 6 (Search) has not defined its ordering contract yet. These are the
# two values illustrated in docs/Serializers.md 9.1; extend deliberately, not
# by inference, once the real search requirements are written.
SEARCH_ORDERING_CHOICES = (
    "price_asc",
    "price_desc",
    "newest",
    "oldest",
    "battery_high",
    "battery_low",
)


class DeviceVariantListSerializer(serializers.ModelSerializer):
    """Compact DeviceVariant representation for search results. See 8.1."""

    brand = serializers.CharField(source="device_model.brand.name", read_only=True)
    model_name = serializers.CharField(source="device_model.model_name", read_only=True)
    device_kind = serializers.CharField(source="device_model.device_kind", read_only=True)

    class Meta:
        model = DeviceVariant
        fields = [
            "id",
            "brand",
            "model_name",
            "device_kind",
            "storage_gb",
            "ram_gb",
            "storage_technology",
            "is_available",
        ]
        read_only_fields = fields


class _PerformanceSpecSerializer(serializers.ModelSerializer):
    class Meta:
        model = PerformanceSpec
        fields = ["chipset_name", "cpu_description", "gpu_name"]


class _DisplaySpecSerializer(serializers.ModelSerializer):
    class Meta:
        model = DisplaySpec
        fields = [
            "role",
            "size_inches",
            "resolution_width_px",
            "resolution_height_px",
            "technology",
            "refresh_rate_hz",
            "peak_brightness_nits",
            "supports_hdr",
        ]


class _BatterySpecSerializer(serializers.ModelSerializer):
    class Meta:
        model = BatterySpec
        fields = ["capacity_mah", "wired_charging_w", "supports_wireless_charging"]


class _CameraLensSerializer(serializers.ModelSerializer):
    class Meta:
        model = CameraSystem._meta.get_field("lenses").related_model
        fields = ["role", "megapixels", "has_ois"]


class _CameraSystemSerializer(serializers.ModelSerializer):
    lenses = _CameraLensSerializer(many=True, read_only=True)

    class Meta:
        model = CameraSystem
        fields = ["position", "max_video_resolution", "max_video_fps", "lenses"]


class _ConnectivitySpecSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConnectivitySpec
        fields = ["supports_5g", "wifi_standard", "bluetooth_version", "supports_nfc"]


class _PhysicalSpecSerializer(serializers.ModelSerializer):
    class Meta:
        model = PhysicalSpec
        fields = ["weight_g", "ip_rating"]


class _SoftwareSpecSerializer(serializers.ModelSerializer):
    class Meta:
        model = SoftwareSpec
        fields = ["platform_name", "platform_version", "promised_major_updates"]


class _BenchmarkMeasurementSerializer(serializers.ModelSerializer):
    class Meta:
        model = BenchmarkMeasurement
        fields = ["benchmark_name", "benchmark_version", "measurement_key", "score", "measured_at"]


class DeviceVariantDetailSerializer(serializers.ModelSerializer):
    """Complete customer-facing DeviceVariant representation. See 8.2.

    Reads exclusively from the existing catalog domain (brand, device model,
    variant configuration, and typed specification profiles). Does not
    duplicate or re-derive any of this data into a marketplace model.
    """

    brand = serializers.CharField(source="device_model.brand.name", read_only=True)
    model_name = serializers.CharField(source="device_model.model_name", read_only=True)
    device_kind = serializers.CharField(source="device_model.device_kind", read_only=True)
    announced_on = serializers.DateField(source="device_model.announced_on", read_only=True)
    released_on = serializers.DateField(source="device_model.released_on", read_only=True)

    performance = serializers.SerializerMethodField()
    displays = serializers.SerializerMethodField()
    battery = serializers.SerializerMethodField()
    cameras = serializers.SerializerMethodField()
    connectivity = serializers.SerializerMethodField()
    physical = serializers.SerializerMethodField()
    software = serializers.SerializerMethodField()
    benchmarks = serializers.SerializerMethodField()

    class Meta:
        model = DeviceVariant
        fields = [
            "id",
            "brand",
            "model_name",
            "device_kind",
            "announced_on",
            "released_on",
            "storage_gb",
            "ram_gb",
            "storage_technology",
            "sku_or_region",
            "is_available",
            "performance",
            "displays",
            "battery",
            "cameras",
            "connectivity",
            "physical",
            "software",
            "benchmarks",
        ]
        read_only_fields = fields

    def get_performance(self, instance):
        spec = getattr(instance.device_model, "performance_spec", None)
        return _PerformanceSpecSerializer(spec).data if spec else None

    def get_displays(self, instance):
        return _DisplaySpecSerializer(instance.device_model.display_specs.all(), many=True).data

    def get_battery(self, instance):
        spec = getattr(instance.device_model, "battery_spec", None)
        return _BatterySpecSerializer(spec).data if spec else None

    def get_cameras(self, instance):
        cameras = instance.device_model.camera_systems.prefetch_related("lenses").all()
        return _CameraSystemSerializer(cameras, many=True).data

    def get_connectivity(self, instance):
        spec = getattr(instance.device_model, "connectivity_spec", None)
        return _ConnectivitySpecSerializer(spec).data if spec else None

    def get_physical(self, instance):
        spec = getattr(instance.device_model, "physical_spec", None)
        return _PhysicalSpecSerializer(spec).data if spec else None

    def get_software(self, instance):
        spec = getattr(instance.device_model, "software_spec", None)
        return _SoftwareSpecSerializer(spec).data if spec else None

    def get_benchmarks(self, instance):
        return _BenchmarkMeasurementSerializer(
            instance.device_model.benchmark_measurements.all(), many=True
        ).data


class SearchRequestSerializer(serializers.Serializer):
    """Validates the structure of a search request. See 9.1.

    ``query_set`` is delegated to the existing strict QuerySet contract in
    ``query_set.py`` rather than re-implemented here, so the two never drift
    apart. ``ordering`` is restricted to a fixed whitelist; arbitrary
    database field names or ordering expressions are never accepted.
    """

    message = serializers.CharField(required=False, allow_blank=False)
    query_set = serializers.JSONField(required=False, allow_null=True, default=None)
    ordering = serializers.ChoiceField(choices=SEARCH_ORDERING_CHOICES, required=False, default="newest")

    def validate_query_set(self, value):
        if value is None:
            return None
        try:
            return validate_query_set(value)
        except QuerySetValidationError as exc:
            raise serializers.ValidationError(str(exc))

    def validate(self, attrs):
        if not attrs.get("message") and attrs.get("query_set") is None:
            raise serializers.ValidationError(
                "Provide a message for a search or query_set to re-sort existing results."
            )
        return attrs


class SearchResultSerializer(DeviceVariantListSerializer):
    """Paginated DeviceVariant search result. See 9.2.

    Extends the list representation with marketplace pricing computed from
    currently available offers. ``minimum_available_price`` is ``None`` when
    no store currently has an available offer for this variant.
    """

    minimum_available_price = serializers.SerializerMethodField()

    class Meta(DeviceVariantListSerializer.Meta):
        fields = DeviceVariantListSerializer.Meta.fields + ["minimum_available_price"]
        read_only_fields = fields

    def get_minimum_available_price(self, instance):
        annotated_price = getattr(instance, "minimum_available_price", None)
        if annotated_price is not None:
            return annotated_price
        cheapest = (
            instance.offers.filter(quantity__gt=0, store__status="active")
            .order_by("price")
            .values_list("price", flat=True)
            .first()
        )
        return cheapest
