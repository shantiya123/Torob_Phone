"""Strict application-level QuerySet contract for LLM query modification."""

from copy import deepcopy
import math


class QuerySetValidationError(ValueError):
    pass


def _range():
    return {"min": None, "max": None}


QUERY_SET_TEMPLATE = {
    "brand": None,
    "model": None,
    "release_date": None,
    "source": {"name": None, "url": None},
    "performance": {
        "chipset": None, "cpu": None, "gpu": None, "storage_type": None,
        "variants": {"ram_gb": _range(), "storage_gb": _range()},
    },
    "display": {
        "size_inches": _range(), "resolution_width": _range(), "resolution_height": _range(),
        "technology": None, "refresh_rate_hz": _range(), "brightness_peak_nits": _range(), "hdr": None,
    },
    "battery": {"capacity_mah": _range(), "charging_w": _range(), "wireless_charging": None},
    "camera": {
        "main_mp": _range(), "ultrawide_mp": _range(), "macro_mp": _range(), "selfie_mp": _range(),
        "ois": None, "video_max_resolution": None, "video_max_fps": _range(),
    },
    "connectivity": {"5g": None, "wifi_version": None, "bluetooth_version": None, "nfc": None},
    "physical": {"weight_g": _range(), "ip_rating": None},
    "software": {"os": None, "android_version": _range(), "major_updates": _range()},
    "benchmarks": {"antutu": _range(), "geekbench": _range(), "3dmark": _range()},
    "price": _range(),
}

BOOLEAN_PATHS = {
    ("display", "hdr"), ("battery", "wireless_charging"), ("camera", "ois"),
    ("connectivity", "5g"), ("connectivity", "nfc"),
}


def empty_query_set():
    return deepcopy(QUERY_SET_TEMPLATE)


def _validate(value, template, path=()):
    label = ".".join(path) or "root"
    if isinstance(template, dict):
        if not isinstance(value, dict):
            raise QuerySetValidationError(f"{label} must be an object")
        expected, actual = set(template), set(value)
        if expected != actual:
            unknown = sorted(actual - expected)
            missing = sorted(expected - actual)
            detail = []
            if unknown:
                detail.append(f"unknown fields: {', '.join(unknown)}")
            if missing:
                detail.append(f"missing fields: {', '.join(missing)}")
            raise QuerySetValidationError(f"{label} has invalid structure ({'; '.join(detail)})")
        for key in template:
            _validate(value[key], template[key], path + (key,))
        if set(template) == {"min", "max"}:
            minimum, maximum = value["min"], value["max"]
            if minimum is not None and maximum is not None and minimum > maximum:
                raise QuerySetValidationError(f"{label}.min cannot exceed {label}.max")
        return
    if path[-1] in {"min", "max"} and value is not None:
        if (
            isinstance(value, bool)
            or not isinstance(value, (int, float))
            or not math.isfinite(value)
            or value < 0
        ):
            raise QuerySetValidationError(f"{label} must be a non-negative finite number or null")
    elif path in BOOLEAN_PATHS:
        if value is not None and not isinstance(value, bool):
            raise QuerySetValidationError(f"{label} must be boolean or null")
    elif template is None and value is not None and not isinstance(value, str):
        raise QuerySetValidationError(f"{label} must be text or null")


def validate_query_set(query_set):
    """Validate and deep-copy a value before it crosses into the domain layer."""
    _validate(query_set, QUERY_SET_TEMPLATE)
    return deepcopy(query_set)
