"""Deterministic hard-constraint filtering over canonical catalog variants."""

from dataclasses import dataclass
import re

from django.db.models import Exists, OuterRef, QuerySet

from marketplace.querysets import public_offer_queryset

from .models import CameraLens, CameraSystem, DeviceVariant, DisplaySpec, PhysicalSpec


_WIFI_RANKS = {
    "Wi-Fi 4": 4,
    "Wi-Fi 5": 5,
    "Wi-Fi 6": 6,
    "Wi-Fi 6E": 7,
    "Wi-Fi 7": 8,
}
_IP_RATING_PATTERN = re.compile(r"^IP([0-6X])([0-8X])$", re.IGNORECASE)


@dataclass(frozen=True)
class FilterRequirements:
    brand: str | None = None
    device_kind: str | None = None
    min_ram_gb: int | None = None
    max_ram_gb: int | None = None
    min_storage_gb: int | None = None
    max_storage_gb: int | None = None
    required_chipset: str | None = None
    required_gpu: str | None = None
    min_display_size_inches: float | None = None
    max_display_size_inches: float | None = None
    min_refresh_rate_hz: int | None = None
    min_resolution_width_px: int | None = None
    min_resolution_height_px: int | None = None
    min_brightness_nits: int | None = None
    requires_hdr: bool | None = None
    min_battery_capacity_mah: int | None = None
    min_charging_w: int | None = None
    requires_wireless_charging: bool | None = None
    min_main_camera_mp: int | None = None
    min_ultrawide_mp: int | None = None
    requires_ois: bool | None = None
    min_video_fps: int | None = None
    requires_5g: bool | None = None
    requires_nfc: bool | None = None
    required_wifi_standard: str | None = None
    max_weight_g: int | None = None
    required_ip_rating: str | None = None
    price_min: int | None = None
    price_max: int | None = None
    minimum_android_version: int | None = None
    minimum_major_updates: int | None = None

    def __post_init__(self):
        for minimum, maximum, label in (
            (self.min_ram_gb, self.max_ram_gb, "RAM"),
            (self.min_storage_gb, self.max_storage_gb, "storage"),
            (self.min_display_size_inches, self.max_display_size_inches, "display size"),
            (self.price_min, self.price_max, "price"),
        ):
            if minimum is not None and maximum is not None and minimum > maximum:
                raise ValueError(f"minimum {label} cannot exceed maximum {label}")


def _wifi_rank(value):
    if not isinstance(value, str):
        return None
    normalized = value.strip().casefold()
    return next((rank for standard, rank in _WIFI_RANKS.items() if standard.casefold() == normalized), None)


def _parse_ip_rating(value):
    if not isinstance(value, str):
        return None
    match = _IP_RATING_PATTERN.fullmatch(value.strip())
    if not match or "X" in match.groups():
        return None
    return int(match.group(1)), int(match.group(2))


def _accepted_ip_ratings(required_rating):
    required = _parse_ip_rating(required_rating)
    if required is None:
        raise ValueError("required_ip_rating must be a supported rating such as IP64 or IP68")
    accepted = []
    for rating in PhysicalSpec.objects.exclude(ip_rating__isnull=True).values_list("ip_rating", flat=True).distinct():
        parsed = _parse_ip_rating(rating)
        if parsed is not None and parsed[0] >= required[0] and parsed[1] >= required[1]:
            accepted.append(rating)
    return accepted


def filter_catalog(requirements: FilterRequirements) -> QuerySet[DeviceVariant]:
    """Return catalog-eligible variants satisfying every specified hard constraint.

    The neutral ordering is by brand, model, storage, RAM, and primary key. It is
    deliberately not a recommendation ranking. `NULL` values never satisfy a
    specified constraint because ORM comparisons and exact `True` checks exclude them.
    """
    queryset = DeviceVariant.objects.filter(
        device_model__is_catalog_eligible=True,
        is_available=True,
    )

    if requirements.brand is not None:
        queryset = queryset.filter(device_model__brand__name__iexact=requirements.brand.strip())
    if requirements.device_kind is not None:
        queryset = queryset.filter(device_model__device_kind=requirements.device_kind)

    variant_filters = {
        "storage_gb__gte": requirements.min_storage_gb,
        "storage_gb__lte": requirements.max_storage_gb,
        "ram_gb__gte": requirements.min_ram_gb,
        "ram_gb__lte": requirements.max_ram_gb,
    }
    queryset = queryset.filter(**{key: value for key, value in variant_filters.items() if value is not None})

    if requirements.required_chipset is not None:
        queryset = queryset.filter(
            device_model__performance_spec__chipset_name__iexact=requirements.required_chipset.strip()
        )
    if requirements.required_gpu is not None:
        queryset = queryset.filter(device_model__performance_spec__gpu_name__iexact=requirements.required_gpu.strip())

    display_filters = {"device_model__display_specs__role": DisplaySpec.Role.PRIMARY}
    for name, value in {
        "device_model__display_specs__size_inches__gte": requirements.min_display_size_inches,
        "device_model__display_specs__size_inches__lte": requirements.max_display_size_inches,
        "device_model__display_specs__refresh_rate_hz__gte": requirements.min_refresh_rate_hz,
        "device_model__display_specs__resolution_width_px__gte": requirements.min_resolution_width_px,
        "device_model__display_specs__resolution_height_px__gte": requirements.min_resolution_height_px,
        "device_model__display_specs__peak_brightness_nits__gte": requirements.min_brightness_nits,
        "device_model__display_specs__supports_hdr": requirements.requires_hdr,
    }.items():
        if value is not None:
            display_filters[name] = value
    if len(display_filters) > 1:
        queryset = queryset.filter(**display_filters)

    battery_filters = {
        "device_model__battery_spec__capacity_mah__gte": requirements.min_battery_capacity_mah,
        "device_model__battery_spec__wired_charging_w__gte": requirements.min_charging_w,
        "device_model__battery_spec__supports_wireless_charging": requirements.requires_wireless_charging,
    }
    queryset = queryset.filter(**{key: value for key, value in battery_filters.items() if value is not None})

    if requirements.min_main_camera_mp is not None or requirements.requires_ois is not None:
        queryset = queryset.filter(
            device_model__camera_systems__position=CameraSystem.Position.REAR,
            device_model__camera_systems__lenses__role=CameraLens.Role.WIDE,
            **{
                key: value
                for key, value in {
                    "device_model__camera_systems__lenses__megapixels__gte": requirements.min_main_camera_mp,
                    "device_model__camera_systems__lenses__has_ois": requirements.requires_ois,
                }.items()
                if value is not None
            },
        )
    if requirements.min_ultrawide_mp is not None:
        queryset = queryset.filter(
            device_model__camera_systems__position=CameraSystem.Position.REAR,
            device_model__camera_systems__lenses__role=CameraLens.Role.ULTRAWIDE,
            device_model__camera_systems__lenses__megapixels__gte=requirements.min_ultrawide_mp,
        )
    if requirements.min_video_fps is not None:
        queryset = queryset.filter(
            device_model__camera_systems__position=CameraSystem.Position.REAR,
            device_model__camera_systems__max_video_fps__gte=requirements.min_video_fps,
        )

    connectivity_filters = {
        "device_model__connectivity_spec__supports_5g": requirements.requires_5g,
        "device_model__connectivity_spec__supports_nfc": requirements.requires_nfc,
    }
    queryset = queryset.filter(**{key: value for key, value in connectivity_filters.items() if value is not None})
    if requirements.required_wifi_standard is not None:
        required_rank = _wifi_rank(requirements.required_wifi_standard)
        if required_rank is None:
            raise ValueError("required_wifi_standard must be one of Wi-Fi 4, Wi-Fi 5, Wi-Fi 6, Wi-Fi 6E, or Wi-Fi 7")
        supported_values = [value for value, rank in _WIFI_RANKS.items() if rank >= required_rank]
        queryset = queryset.filter(device_model__connectivity_spec__wifi_standard__in=supported_values)

    if requirements.max_weight_g is not None:
        queryset = queryset.filter(device_model__physical_spec__weight_g__lte=requirements.max_weight_g)
    if requirements.required_ip_rating is not None:
        queryset = queryset.filter(
            device_model__physical_spec__ip_rating__in=_accepted_ip_ratings(requirements.required_ip_rating)
        )
    if requirements.price_min is not None or requirements.price_max is not None:
        eligible_offers = public_offer_queryset().filter(device_variant_id=OuterRef("pk"))
        if requirements.price_min is not None:
            eligible_offers = eligible_offers.filter(price__gte=requirements.price_min)
        if requirements.price_max is not None:
            eligible_offers = eligible_offers.filter(price__lte=requirements.price_max)
        queryset = queryset.annotate(has_matching_offer=Exists(eligible_offers)).filter(has_matching_offer=True)

    software_filters = {
        "device_model__software_spec__platform_name__iexact": "Android"
        if requirements.minimum_android_version is not None
        else None,
        "device_model__software_spec__platform_version__gte": requirements.minimum_android_version,
        "device_model__software_spec__promised_major_updates__gte": requirements.minimum_major_updates,
    }
    queryset = queryset.filter(**{key: value for key, value in software_filters.items() if value is not None})

    return (
        queryset.select_related(
            "device_model__brand",
            "device_model__performance_spec",
            "device_model__battery_spec",
            "device_model__connectivity_spec",
            "device_model__physical_spec",
            "device_model__software_spec",
        )
        .prefetch_related("device_model__display_specs", "device_model__camera_systems__lenses")
        .distinct()
        .order_by(
            "device_model__brand__name",
            "device_model__model_name",
            "storage_gb",
            "ram_gb",
            "pk",
        )
    )