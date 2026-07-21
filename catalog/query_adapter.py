"""Adapter from the LLM-facing QuerySet contract to filtering domain values."""

from dataclasses import replace

from .filtering import FilterRequirements
from .query_set import validate_query_set


class UnsupportedQuerySetFieldError(ValueError):
    pass


_BRAND_ALIASES = {
    "apple": "Apple", "آپل": "Apple", "اپل": "Apple", "آیفون": "Apple", "ايفون": "Apple",
    "samsung": "Samsung", "سامسونگ": "Samsung",
    "xiaomi": "Xiaomi", "شیائومی": "Xiaomi", "شاومی": "Xiaomi",
    "poco": "Poco", "پوکو": "Poco",
}
_OS_ALIASES = {"android": "Android", "ios": "iOS", "ipados": "iPadOS", "emui": "EMUI", "harmonyos": "HarmonyOS"}
_WIFI_ALIASES = {"wi-fi 4": "Wi-Fi 4", "wi-fi 5": "Wi-Fi 5", "wi-fi 6": "Wi-Fi 6", "wi-fi 6e": "Wi-Fi 6E", "wi-fi 7": "Wi-Fi 7"}


def _text(value):
    return value.strip() if isinstance(value, str) else value


def _normalise_lookup(value, aliases):
    if value is None:
        return None
    return aliases.get(value.strip().casefold(), value.strip())


def normalize_query_set(query_set):
    """Apply only explicit canonical vocabulary rules after strict validation."""
    normalized = validate_query_set(query_set)
    normalized["brand"] = _normalise_lookup(normalized["brand"], _BRAND_ALIASES)
    normalized["software"]["os"] = _normalise_lookup(normalized["software"]["os"], _OS_ALIASES)
    normalized["connectivity"]["wifi_version"] = _normalise_lookup(
        normalized["connectivity"]["wifi_version"], _WIFI_ALIASES
    )
    for path in (
        ("model",), ("performance", "chipset"), ("performance", "cpu"), ("performance", "gpu"),
        ("performance", "storage_type"), ("display", "technology"), ("camera", "video_max_resolution"),
        ("connectivity", "bluetooth_version"), ("physical", "ip_rating"), ("source", "name"), ("source", "url"),
    ):
        target = normalized
        for key in path[:-1]:
            target = target[key]
        target[path[-1]] = _text(target[path[-1]])
    if normalized["physical"]["ip_rating"] is not None:
        normalized["physical"]["ip_rating"] = normalized["physical"]["ip_rating"].upper()
    return normalized


def _range_is_set(query_set, *path):
    value = query_set
    for key in path:
        value = value[key]
    return value["min"] is not None or value["max"] is not None


def _ensure_unsupported_fields_are_empty(query_set):
    unsupported = []
    for path in (
        ("model",), ("release_date",), ("source", "name"), ("source", "url"),
        ("performance", "cpu"), ("performance", "storage_type"), ("display", "technology"),
        ("camera", "video_max_resolution"),
        ("connectivity", "bluetooth_version"), ("software", "os"),
    ):
        value = query_set
        for key in path:
            value = value[key]
        if value is not None:
            unsupported.append(".".join(path))
    unsupported_ranges = {
        ("display", "resolution_width"): ("max",), ("display", "resolution_height"): ("max",),
        ("display", "refresh_rate_hz"): ("max",), ("display", "brightness_peak_nits"): ("max",),
        ("battery", "capacity_mah"): ("max",), ("battery", "charging_w"): ("max",),
        ("camera", "main_mp"): ("max",), ("camera", "ultrawide_mp"): ("max",),
        ("camera", "macro_mp"): ("min", "max"), ("camera", "selfie_mp"): ("min", "max"),
        ("camera", "video_max_fps"): ("max",), ("physical", "weight_g"): ("min",),
        ("software", "android_version"): ("max",), ("software", "major_updates"): ("max",),
        ("benchmarks", "antutu"): ("min", "max"), ("benchmarks", "geekbench"): ("min", "max"),
        ("benchmarks", "3dmark"): ("min", "max"), ("price",): ("min", "max"),
    }
    for path, bounds in unsupported_ranges.items():
        value = query_set
        for key in path:
            value = value[key]
        for bound in bounds:
            if value[bound] is not None:
                unsupported.append(".".join(path) + f".{bound}")
    if unsupported:
        raise UnsupportedQuerySetFieldError("Unsupported QuerySet filters: " + ", ".join(unsupported))


def query_set_to_filter_requirements(query_set):
    """Create domain requirements, rejecting contract fields the filter cannot apply."""
    query_set = normalize_query_set(query_set)
    _ensure_unsupported_fields_are_empty(query_set)
    performance = query_set["performance"]
    display = query_set["display"]
    battery = query_set["battery"]
    camera = query_set["camera"]
    connectivity = query_set["connectivity"]
    physical = query_set["physical"]
    software = query_set["software"]
    return FilterRequirements(
        brand=query_set["brand"],
        min_ram_gb=performance["variants"]["ram_gb"]["min"], max_ram_gb=performance["variants"]["ram_gb"]["max"],
        min_storage_gb=performance["variants"]["storage_gb"]["min"], max_storage_gb=performance["variants"]["storage_gb"]["max"],
        required_chipset=performance["chipset"], required_gpu=performance["gpu"],
        min_display_size_inches=display["size_inches"]["min"], max_display_size_inches=display["size_inches"]["max"],
        min_refresh_rate_hz=display["refresh_rate_hz"]["min"],
        min_resolution_width_px=display["resolution_width"]["min"],
        min_resolution_height_px=display["resolution_height"]["min"],
        min_brightness_nits=display["brightness_peak_nits"]["min"], requires_hdr=display["hdr"],
        min_battery_capacity_mah=battery["capacity_mah"]["min"], min_charging_w=battery["charging_w"]["min"],
        requires_wireless_charging=battery["wireless_charging"],
        min_main_camera_mp=camera["main_mp"]["min"], min_ultrawide_mp=camera["ultrawide_mp"]["min"],
        requires_ois=camera["ois"], min_video_fps=camera["video_max_fps"]["min"],
        requires_5g=connectivity["5g"], requires_nfc=connectivity["nfc"],
        required_wifi_standard=connectivity["wifi_version"], max_weight_g=physical["weight_g"]["max"],
        required_ip_rating=physical["ip_rating"], minimum_android_version=software["android_version"]["min"],
        minimum_major_updates=software["major_updates"]["min"],
    )
