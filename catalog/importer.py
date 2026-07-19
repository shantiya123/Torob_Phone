"""Deterministic importer for the approved clean mobile-phone dataset."""

import hashlib
import json
import re
import unicodedata
from datetime import date
from decimal import Decimal
from pathlib import Path
from urllib.parse import urlparse

from django.db import transaction
from django.utils import timezone

from .models import (
    BatterySpec,
    BenchmarkMeasurement,
    Brand,
    CameraLens,
    CameraSystem,
    CanonicalFieldEvidence,
    ConnectivitySpec,
    DataSource,
    DeviceModel,
    DeviceVariant,
    DisplaySpec,
    ImportRun,
    PerformanceSpec,
    PhysicalSpec,
    SoftwareSpec,
    SourceRecord,
)


IMPORTER_VERSION = "1.0"
SCHEMA_VERSION = "clean-data-v1"


class RecordValidationError(ValueError):
    """A record lacks a safe canonical identity or source identity."""


def sha256_file(path):
    digest = hashlib.sha256()
    with Path(path).open("rb") as source_file:
        for chunk in iter(lambda: source_file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def payload_hash(payload):
    encoded = json.dumps(payload, sort_keys=True, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def normalize_key(value):
    value = unicodedata.normalize("NFKC", value).casefold().strip()
    # A plus sign is a meaningful model-name character (for example, S26+).
    # Preserve it before reducing punctuation to separator characters.
    value = value.replace("+", " plus ")
    return re.sub(r"[^\w]+", "-", value, flags=re.UNICODE).strip("-")


def _nested(record, *keys):
    value = record
    for key in keys:
        if not isinstance(value, dict):
            return None
        value = value.get(key)
    return value


def _required_text(record, *keys):
    value = _nested(record, *keys)
    if not isinstance(value, str) or not value.strip():
        raise RecordValidationError(f"{'.'.join(keys)} is required and must be non-empty text")
    return value.strip()


def _optional_text(record, warnings, *keys, max_length=None):
    value = _nested(record, *keys)
    if value is None:
        return None
    if not isinstance(value, str):
        warnings.append(f"{'.'.join(keys)} is not text; ignored")
        return None
    value = value.strip()
    if not value:
        return None
    if max_length is not None and len(value) > max_length:
        warnings.append(f"{'.'.join(keys)} exceeds {max_length} characters; ignored")
        return None
    return value


def _optional_int(record, warnings, *keys, minimum=0, maximum=1_000_000):
    value = _nested(record, *keys)
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, int) or not minimum <= value <= maximum:
        warnings.append(f"{'.'.join(keys)} is outside accepted numeric range; ignored")
        return None
    return value


def _optional_decimal(record, warnings, *keys, minimum=Decimal("0"), maximum=Decimal("1000")):
    value = _nested(record, *keys)
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        warnings.append(f"{'.'.join(keys)} is not numeric; ignored")
        return None
    decimal_value = Decimal(str(value))
    if not minimum < decimal_value <= maximum:
        warnings.append(f"{'.'.join(keys)} is outside accepted numeric range; ignored")
        return None
    return decimal_value


def _explicit_true(record, warnings, *keys):
    """False values in this dataset are parser absences, so map them to unknown."""
    value = _nested(record, *keys)
    if value is None:
        return None
    if not isinstance(value, bool):
        warnings.append(f"{'.'.join(keys)} is not boolean; ignored")
        return None
    return True if value else None


def _valid_url(value):
    parsed = urlparse(value)
    return parsed.scheme in {"http", "https"} and bool(parsed.netloc)


def _parse_ambiguous_date(record, warnings):
    value = _nested(record, "release_date")
    if value is None:
        return None
    if not isinstance(value, str):
        warnings.append("release_date is not ISO text; retained only as invalid source data")
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        warnings.append("release_date is not an ISO date; retained only as invalid source data")
        return None


def _classify_device_kind(record):
    platform = _nested(record, "software", "os")
    model = _nested(record, "model") or ""
    variants = _nested(record, "performance", "variants") or []
    display_size = _nested(record, "display", "size_inches")
    if platform == "iPadOS" or "ipad" in model.casefold():
        return DeviceModel.DeviceKind.TABLET
    if variants:
        return DeviceModel.DeviceKind.SMARTPHONE
    if platform is None and isinstance(display_size, (int, float)) and display_size <= 4:
        return DeviceModel.DeviceKind.FEATURE_PHONE
    return DeviceModel.DeviceKind.UNKNOWN


def _configuration_key(storage_gb, ram_gb, storage_technology):
    return f"storage={storage_gb if storage_gb is not None else ''};ram={ram_gb if ram_gb is not None else ''};tech={storage_technology or ''}"


def _evidence(device_model, source_record, field_path, observed_value, selected=True, ambiguous=False):
    CanonicalFieldEvidence.objects.update_or_create(
        device_model=device_model,
        source_record=source_record,
        field_path=field_path,
        defaults={
            "observed_value": observed_value,
            "confidence": (
                CanonicalFieldEvidence.Confidence.AMBIGUOUS
                if ambiguous
                else CanonicalFieldEvidence.Confidence.SOURCE_NORMALIZED
            ),
            "is_selected": selected,
        },
    )


def _save_source_record(data_source, import_run, record, source_url):
    current_hash = payload_hash(record)
    source_record, created = SourceRecord.objects.get_or_create(
        data_source=data_source,
        source_url=source_url,
        defaults={
            "raw_payload": record,
            "normalized_payload": record,
            "payload_hash": current_hash,
            "first_import_run": import_run,
            "last_import_run": import_run,
            "validation_status": SourceRecord.ValidationStatus.VALID,
        },
    )
    if not created:
        if source_record.payload_hash != current_hash:
            history = list(source_record.payload_history)
            history.append(
                {
                    "payload_hash": source_record.payload_hash,
                    "raw_payload": source_record.raw_payload,
                    "replaced_at": timezone.now().isoformat(),
                }
            )
            source_record.payload_history = history
            source_record.raw_payload = record
            source_record.normalized_payload = record
            source_record.payload_hash = current_hash
        source_record.last_import_run = import_run
        source_record.validation_status = SourceRecord.ValidationStatus.VALID
        source_record.save()
    return source_record, created


def _sync_variants(device_model, record, warnings):
    variants = _nested(record, "performance", "variants")
    if not isinstance(variants, list):
        warnings.append("performance.variants is not an array; ignored")
        variants = []
    storage_type = _optional_text(record, warnings, "performance", "storage_type", max_length=120)
    safe_storage_type = None
    if len(variants) == 1 and storage_type and "|" not in storage_type and "only" not in storage_type.casefold():
        safe_storage_type = storage_type

    keys = []
    for position, variant in enumerate(variants):
        if not isinstance(variant, dict):
            warnings.append(f"performance.variants[{position}] is not an object; ignored")
            continue
        storage = variant.get("storage_gb")
        ram = variant.get("ram_gb")
        if isinstance(storage, bool) or not isinstance(storage, int) or not 1 <= storage <= 4096:
            warnings.append(f"performance.variants[{position}].storage_gb is invalid; variant ignored")
            continue
        if isinstance(ram, bool) or not isinstance(ram, int) or not 1 <= ram <= 256:
            warnings.append(f"performance.variants[{position}].ram_gb is invalid; variant ignored")
            continue
        technology = safe_storage_type
        key = _configuration_key(storage, ram, technology)
        keys.append(key)
        DeviceVariant.objects.update_or_create(
            device_model=device_model,
            configuration_key=key,
            defaults={
                "storage_gb": storage,
                "ram_gb": ram,
                "storage_technology": technology,
                "is_available": True,
            },
        )
    device_model.variants.exclude(configuration_key__in=keys).delete()
    return storage_type, safe_storage_type


def _sync_camera(device_model, record, warnings):
    camera = _nested(record, "camera") or {}
    rear_lenses = {
        CameraLens.Role.WIDE: _optional_int(record, warnings, "camera", "main_mp", minimum=1, maximum=1000),
        CameraLens.Role.ULTRAWIDE: _optional_int(record, warnings, "camera", "ultrawide_mp", minimum=1, maximum=1000),
        CameraLens.Role.MACRO: _optional_int(record, warnings, "camera", "macro_mp", minimum=1, maximum=1000),
    }
    video_resolution = _optional_text(record, warnings, "camera", "video_max_resolution", max_length=20)
    video_fps = _optional_int(record, warnings, "camera", "video_max_fps", minimum=1, maximum=1000)
    if any(value is not None for value in rear_lenses.values()) or video_resolution or video_fps is not None:
        rear, _ = CameraSystem.objects.update_or_create(
            device_model=device_model,
            position=CameraSystem.Position.REAR,
            defaults={"max_video_resolution": video_resolution, "max_video_fps": video_fps},
        )
        roles = []
        for role, megapixels in rear_lenses.items():
            if megapixels is None:
                continue
            roles.append(role)
            CameraLens.objects.update_or_create(
                camera_system=rear,
                role=role,
                defaults={
                    "megapixels": megapixels,
                    "has_ois": _explicit_true(record, warnings, "camera", "ois") if role == CameraLens.Role.WIDE else None,
                },
            )
        rear.lenses.exclude(role__in=roles).delete()
    else:
        CameraSystem.objects.filter(device_model=device_model, position=CameraSystem.Position.REAR).delete()

    selfie = _optional_int(record, warnings, "camera", "selfie_mp", minimum=1, maximum=1000)
    if selfie is not None:
        front, _ = CameraSystem.objects.update_or_create(
            device_model=device_model,
            position=CameraSystem.Position.FRONT,
        )
        CameraLens.objects.update_or_create(
            camera_system=front,
            role=CameraLens.Role.WIDE,
            defaults={"megapixels": selfie, "has_ois": None},
        )
        front.lenses.exclude(role=CameraLens.Role.WIDE).delete()
    else:
        CameraSystem.objects.filter(device_model=device_model, position=CameraSystem.Position.FRONT).delete()


def _sync_benchmarks(device_model, source_record, record, warnings):
    names = ("antutu", "geekbench", "3dmark")
    keys = []
    for name in names:
        score = _optional_int(record, warnings, "benchmarks", name, minimum=0, maximum=100_000_000)
        if score is None:
            continue
        measurement_key = f"{name}:"
        keys.append(measurement_key)
        BenchmarkMeasurement.objects.update_or_create(
            device_model=device_model,
            source_record=source_record,
            measurement_key=measurement_key,
            defaults={"benchmark_name": name, "benchmark_version": None, "score": score},
        )
    BenchmarkMeasurement.objects.filter(device_model=device_model, source_record=source_record).exclude(
        measurement_key__in=keys
    ).delete()


def import_record(import_run, record):
    if not isinstance(record, dict):
        raise RecordValidationError("record must be an object")
    warnings = []
    brand_name = _required_text(record, "brand")
    model_name = _required_text(record, "model")
    source_name = _required_text(record, "source", "name")
    source_url = _required_text(record, "source", "url")
    if not _valid_url(source_url):
        raise RecordValidationError("source.url must be an absolute HTTP(S) URL")
    if not normalize_key(brand_name) or not normalize_key(model_name):
        raise RecordValidationError("brand/model normalize to an empty identity")

    parsed_url = urlparse(source_url)
    base_url = f"{parsed_url.scheme}://{parsed_url.netloc}"
    with transaction.atomic():
        data_source, _ = DataSource.objects.update_or_create(
            name=source_name, defaults={"base_url": base_url, "is_active": True}
        )
        source_record, source_created = _save_source_record(data_source, import_run, record, source_url)
        brand, brand_created = Brand.objects.get_or_create(
            slug=normalize_key(brand_name), defaults={"name": brand_name}
        )
        device_kind = _classify_device_kind(record)
        device_model, model_created = DeviceModel.objects.update_or_create(
            brand=brand,
            model_key=normalize_key(model_name),
            defaults={
                "model_name": model_name,
                "device_kind": device_kind,
                "is_catalog_eligible": device_kind == DeviceModel.DeviceKind.SMARTPHONE,
                "announced_on": None,
                "released_on": None,
                "availability_status": None,
            },
        )
        source_record.device_model = device_model
        source_record.save(update_fields=["device_model", "observed_at"])
        CanonicalFieldEvidence.objects.filter(device_model=device_model, source_record=source_record).update(is_selected=False)

        PerformanceSpec.objects.update_or_create(
            device_model=device_model,
            defaults={
                "chipset_name": _optional_text(record, warnings, "performance", "chipset", max_length=255),
                "cpu_description": _optional_text(record, warnings, "performance", "cpu"),
                "gpu_name": _optional_text(record, warnings, "performance", "gpu", max_length=255),
            },
        )
        DisplaySpec.objects.update_or_create(
            device_model=device_model,
            role=DisplaySpec.Role.PRIMARY,
            defaults={
                "size_inches": _optional_decimal(record, warnings, "display", "size_inches", maximum=20),
                "resolution_width_px": _optional_int(record, warnings, "display", "resolution_width", minimum=100, maximum=20000),
                "resolution_height_px": _optional_int(record, warnings, "display", "resolution_height", minimum=100, maximum=20000),
                "technology": _optional_text(record, warnings, "display", "technology", max_length=120),
                "refresh_rate_hz": _optional_int(record, warnings, "display", "refresh_rate_hz", minimum=1, maximum=1000),
                "peak_brightness_nits": _optional_int(record, warnings, "display", "brightness_peak_nits", minimum=1, maximum=100000),
                "supports_hdr": _explicit_true(record, warnings, "display", "hdr"),
            },
        )
        BatterySpec.objects.update_or_create(
            device_model=device_model,
            defaults={
                "capacity_mah": _optional_int(record, warnings, "battery", "capacity_mah", minimum=100, maximum=100000),
                "wired_charging_w": _optional_int(record, warnings, "battery", "charging_w", minimum=1, maximum=10000),
                "supports_wireless_charging": _explicit_true(record, warnings, "battery", "wireless_charging"),
            },
        )
        ConnectivitySpec.objects.update_or_create(
            device_model=device_model,
            defaults={
                "supports_5g": _explicit_true(record, warnings, "connectivity", "5g"),
                "wifi_standard": _optional_text(record, warnings, "connectivity", "wifi_version", max_length=30),
                "bluetooth_version": _optional_text(record, warnings, "connectivity", "bluetooth_version", max_length=20),
                "supports_nfc": _explicit_true(record, warnings, "connectivity", "nfc"),
            },
        )
        PhysicalSpec.objects.update_or_create(
            device_model=device_model,
            defaults={
                "weight_g": _optional_int(record, warnings, "physical", "weight_g", minimum=1, maximum=10000),
                "ip_rating": _optional_text(record, warnings, "physical", "ip_rating", max_length=20),
            },
        )
        SoftwareSpec.objects.update_or_create(
            device_model=device_model,
            defaults={
                "platform_name": _optional_text(record, warnings, "software", "os", max_length=100),
                "platform_version": _optional_int(record, warnings, "software", "android_version", minimum=1, maximum=100),
                "promised_major_updates": _optional_int(record, warnings, "software", "major_updates", minimum=0, maximum=20),
            },
        )
        storage_type, safe_storage_type = _sync_variants(device_model, record, warnings)
        _sync_camera(device_model, record, warnings)
        _sync_benchmarks(device_model, source_record, record, warnings)

        # Provenance is stored for every supplied field that the catalog maps, including ambiguity.
        mapped_paths = (
            ("performance.chipset_name", _nested(record, "performance", "chipset"), True),
            ("performance.cpu_description", _nested(record, "performance", "cpu"), True),
            ("performance.gpu_name", _nested(record, "performance", "gpu"), True),
            ("display.primary.size_inches", _nested(record, "display", "size_inches"), True),
            ("display.primary.refresh_rate_hz", _nested(record, "display", "refresh_rate_hz"), True),
            ("battery.capacity_mah", _nested(record, "battery", "capacity_mah"), True),
            ("battery.supports_wireless_charging", _nested(record, "battery", "wireless_charging"), _nested(record, "battery", "wireless_charging") is True),
            ("connectivity.supports_5g", _nested(record, "connectivity", "5g"), _nested(record, "connectivity", "5g") is True),
            ("connectivity.supports_nfc", _nested(record, "connectivity", "nfc"), _nested(record, "connectivity", "nfc") is True),
            ("camera.rear.wide.has_ois", _nested(record, "camera", "ois"), _nested(record, "camera", "ois") is True),
        )
        for field_path, observed_value, selected in mapped_paths:
            if observed_value is not None:
                _evidence(device_model, source_record, field_path, observed_value, selected=selected, ambiguous=not selected)
        if storage_type is not None:
            _evidence(
                device_model,
                source_record,
                "performance.storage_type",
                storage_type,
                selected=safe_storage_type is not None,
                ambiguous=safe_storage_type is None,
            )
        lifecycle_date = _parse_ambiguous_date(record, warnings)
        if lifecycle_date is not None:
            _evidence(
                device_model,
                source_record,
                "source.lifecycle_date",
                lifecycle_date.isoformat(),
                selected=False,
                ambiguous=True,
            )

    return {
        "warnings": warnings,
        "source_created": source_created,
        "brand_created": brand_created,
        "model_created": model_created,
        "device_model": device_model,
    }


def import_dataset(path):
    path = Path(path)
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise RecordValidationError(f"could not load dataset: {exc}") from exc
    if not isinstance(payload, list):
        raise RecordValidationError("top-level dataset must be a JSON array")

    import_run = ImportRun.objects.create(
        source_file=str(path),
        file_sha256=sha256_file(path),
        schema_version=SCHEMA_VERSION,
        importer_version=IMPORTER_VERSION,
    )
    messages = []
    stats = {
        "records_seen": len(payload),
        "records_imported": 0,
        "records_rejected": 0,
        "records_skipped": 0,
        "source_records_created": 0,
        "brands_created": 0,
        "models_created": 0,
    }
    seen_source_urls = set()
    try:
        for index, record in enumerate(payload):
            source_url = _nested(record, "source", "url") if isinstance(record, dict) else None
            if source_url and source_url in seen_source_urls:
                stats["records_rejected"] += 1
                messages.append({"record": index, "error": "duplicate source.url in dataset"})
                continue
            if source_url:
                seen_source_urls.add(source_url)
            try:
                result = import_record(import_run, record)
            except RecordValidationError as exc:
                stats["records_rejected"] += 1
                messages.append({"record": index, "error": str(exc)})
                continue
            stats["records_imported"] += 1
            stats["source_records_created"] += int(result["source_created"])
            stats["brands_created"] += int(result["brand_created"])
            stats["models_created"] += int(result["model_created"])
            for warning in result["warnings"]:
                messages.append({"record": index, "warning": warning})
        import_run.records_seen = stats["records_seen"]
        import_run.records_imported = stats["records_imported"]
        import_run.records_rejected = stats["records_rejected"]
        import_run.records_skipped = stats["records_skipped"]
        import_run.validation_messages = messages
        import_run.status = ImportRun.Status.COMPLETED
        import_run.completed_at = timezone.now()
        import_run.save()
    except Exception as exc:
        import_run.status = ImportRun.Status.FAILED
        import_run.completed_at = timezone.now()
        import_run.validation_messages = messages + [{"fatal_error": str(exc)}]
        import_run.save()
        raise
    return import_run, stats
