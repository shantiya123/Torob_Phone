"""
normalize_phone_specs.py

Converts raw GSMArena-style scraped phone spec dicts (messy, all-string
"Section.Key" -> "free text value" pairs) into a clean, typed schema
that's easy to filter/score/query against in a recommendation backend.

Usage:
    python normalize_phone_specs.py raw_input.json clean_data.json

Or import and call `normalize_phone(raw_entry)` / `normalize_all(list_of_entries)`
directly from your pipeline.
"""

import json
import re
import sys
from datetime import datetime
from typing import Any, Optional


# ---------------------------------------------------------------------------
# small generic helpers
# ---------------------------------------------------------------------------

def _get(specs: dict, key: str) -> str:
    """Fetch a raw spec field, always returning a string (never None)."""
    return specs.get(key, "") or ""


def _first_number(text: str) -> Optional[float]:
    """First numeric token in a string, as float (or None)."""
    m = re.search(r"[\d]+(?:\.\d+)?", text)
    return float(m.group()) if m else None


def _first_int(text: str) -> Optional[int]:
    n = _first_number(text)
    return int(n) if n is not None else None


def _all_numbers(text: str, pattern: str) -> list:
    """All numbers matching a regex pattern with one capture group, as ints."""
    return [int(m) for m in re.findall(pattern, text)]


# ---------------------------------------------------------------------------
# section parsers
# ---------------------------------------------------------------------------

def parse_brand_model(model_title: str, brand: str) -> tuple:
    model = model_title
    if brand and model_title.startswith(brand):
        model = model_title[len(brand):].strip()
    return brand, model


def parse_release_date(specs: dict) -> Optional[str]:
    """
    Prefer the 'Released' date from Launch.Status; fall back to
    Launch.Announced. Returns an ISO date string 'YYYY-MM-DD' or None.
    """
    status = _get(specs, "Launch.Status")
    announced = _get(specs, "Launch.Announced")

    for source in (status, announced):
        m = re.search(r"(\d{4}),\s*([A-Za-z]+)\s+(\d{1,2})", source)
        if m:
            year, month_name, day = m.groups()
            try:
                dt = datetime.strptime(f"{year} {month_name} {day}", "%Y %B %d")
                return dt.strftime("%Y-%m-%d")
            except ValueError:
                continue
    return None


def parse_memory(specs: dict) -> dict:
    """
    Memory.Internal often lists several RAM/storage variants, e.g.
    '128GB 6GB RAM, 256GB 8GB RAM, 256GB 12GB RAM'.
    We surface the *top* (max storage) variant as the headline ram_gb /
    storage_gb, and keep every variant in `variants` for callers that
    need the full range.
    """
    raw = _get(specs, "Memory.Internal")
    variants = []
    for storage_str, ram_str in re.findall(r"(\d+)GB\s+(\d+)GB\s*RAM", raw):
        variants.append({"storage_gb": int(storage_str), "ram_gb": int(ram_str)})

    top = max(variants, key=lambda v: (v["storage_gb"], v["ram_gb"])) if variants else {}

    return {
        "ram_gb": top.get("ram_gb"),
        "storage_gb": top.get("storage_gb"),
        "storage_type": _get(specs, "Memory.").strip() or None,
        "variants": variants,
    }


def parse_chipset(specs: dict) -> dict:
    chipset_raw = _get(specs, "Platform.Chipset")
    chipset = re.sub(r"\s*\(\d+\s*nm\)\s*$", "", chipset_raw).strip() or None
    return {
        "chipset": chipset,
        "cpu": _get(specs, "Platform.CPU").strip() or None,
        "gpu": _get(specs, "Platform.GPU").strip() or None,
    }


def parse_display(specs: dict) -> dict:
    size_text = _get(specs, "Display.Size")
    size_inches = _first_number(size_text)

    res_text = _get(specs, "Display.Resolution")
    res_match = re.search(r"(\d+)\s*x\s*(\d+)", res_text)
    width, height = (int(res_match.group(1)), int(res_match.group(2))) if res_match else (None, None)

    type_text = _get(specs, "Display.Type")
    technology = type_text.split(",")[0].strip() or None

    refresh_match = re.search(r"(\d+)\s*Hz", type_text)
    refresh_rate = int(refresh_match.group(1)) if refresh_match else None

    # brightness: prefer explicit "(peak)", then "(HBM)", then "(typ)", else max of all nits values found
    brightness = None
    peak_match = re.search(r"(\d+)\s*nits\s*\(peak\)", type_text)
    hbm_match = re.search(r"(\d+)\s*nits\s*\(HBM\)", type_text)
    typ_match = re.search(r"(\d+)\s*nits\s*\(typ\)", type_text)
    if peak_match:
        brightness = int(peak_match.group(1))
    elif hbm_match:
        brightness = int(hbm_match.group(1))
    elif typ_match:
        brightness = int(typ_match.group(1))
    else:
        nits_all = _all_numbers(type_text, r"(\d+)\s*nits")
        brightness = max(nits_all) if nits_all else None

    hdr = bool(re.search(r"HDR", type_text, re.IGNORECASE))

    return {
        "size_inches": size_inches,
        "resolution_width": width,
        "resolution_height": height,
        "technology": technology,
        "refresh_rate_hz": refresh_rate,
        "brightness_peak_nits": brightness,
        "hdr": hdr,
    }


def parse_battery(specs: dict) -> dict:
    type_text = _get(specs, "Battery.Type")
    capacity_match = re.search(r"(\d+)\s*mAh", type_text, re.IGNORECASE)
    capacity = int(capacity_match.group(1)) if capacity_match else None

    charging_text = _get(specs, "Battery.Charging")
    charging_match = re.search(r"(\d+)\s*W", charging_text)
    charging_w = int(charging_match.group(1)) if charging_match else None

    wireless = bool(re.search(r"wireless", charging_text, re.IGNORECASE))

    return {
        "capacity_mah": capacity,
        "charging_w": charging_w,
        "wireless_charging": wireless,
    }


_LENS_KEYS = ["Main Camera.Triple", "Main Camera.Dual", "Main Camera.Single", "Main Camera.Quad"]


def parse_camera(specs: dict) -> dict:
    main_text = ""
    for key in _LENS_KEYS:
        if specs.get(key):
            main_text = specs[key]
            break

    segments = [seg.strip() for seg in main_text.split("|")]

    def mp_for(keyword: str) -> Optional[int]:
        for seg in segments:
            if keyword.lower() in seg.lower():
                m = re.search(r"(\d+)\s*MP", seg)
                if m:
                    return int(m.group(1))
        return None

    # main sensor = first MP figure in the whole string (wide lens is always listed first)
    main_mp = None
    if segments:
        m = re.search(r"(\d+)\s*MP", segments[0])
        main_mp = int(m.group(1)) if m else None

    ultrawide_mp = mp_for("ultrawide")
    macro_mp = mp_for("macro")

    selfie_text = _get(specs, "Selfie camera.Single") or _get(specs, "Selfie camera.Dual")
    selfie_match = re.search(r"(\d+)\s*MP", selfie_text)
    selfie_mp = int(selfie_match.group(1)) if selfie_match else None

    ois = bool(re.search(r"\bOIS\b", main_text, re.IGNORECASE))

    video_text = _get(specs, "Main Camera.Video")
    video_max_resolution = None
    for res in ("8K", "4K", "1080p", "720p", "480p"):
        if res.lower() in video_text.lower():
            video_max_resolution = res
            break

    fps_all = _all_numbers(video_text, r"(\d+)\s*fps")
    video_max_fps = max(fps_all) if fps_all else None

    return {
        "main_mp": main_mp,
        "ultrawide_mp": ultrawide_mp,
        "macro_mp": macro_mp,
        "selfie_mp": selfie_mp,
        "ois": ois,
        "video_max_resolution": video_max_resolution,
        "video_max_fps": video_max_fps,
    }


def parse_connectivity(specs: dict) -> dict:
    network_text = _get(specs, "Network.Technology")
    has_5g = bool(re.search(r"\b5G\b", network_text, re.IGNORECASE))

    wlan_text = _get(specs, "Comms.WLAN")
    if re.search(r"\b6e\b", wlan_text, re.IGNORECASE):
        wifi_version = "Wi-Fi 6E"
    elif re.search(r"/6\b", wlan_text, re.IGNORECASE) or re.search(r"\b6\b", wlan_text):
        wifi_version = "Wi-Fi 6"
    elif re.search(r"\bac\b", wlan_text, re.IGNORECASE):
        wifi_version = "Wi-Fi 5"
    elif re.search(r"\bn\b", wlan_text, re.IGNORECASE):
        wifi_version = "Wi-Fi 4"
    else:
        wifi_version = None

    bt_text = _get(specs, "Comms.Bluetooth")
    bt_match = re.search(r"(\d+(?:\.\d+)?)", bt_text)
    bluetooth_version = bt_match.group(1) if bt_match else None

    nfc_text = _get(specs, "Comms.NFC").strip().lower()
    nfc = nfc_text.startswith("yes")

    return {
        "5g": has_5g,
        "wifi_version": wifi_version,
        "bluetooth_version": bluetooth_version,
        "nfc": nfc,
    }


def parse_physical(specs: dict) -> dict:
    weight_text = _get(specs, "Body.Weight")
    weight_match = re.search(r"(\d+)\s*g\b", weight_text)
    weight_g = int(weight_match.group(1)) if weight_match else None

    body_misc = _get(specs, "Body.")
    ip_match = re.search(r"\bIP\d{2}[A-Za-z]?\b", body_misc)
    ip_rating = ip_match.group(0) if ip_match else None

    return {
        "weight_g": weight_g,
        "ip_rating": ip_rating,
    }


def parse_software(specs: dict) -> dict:
    os_text = _get(specs, "Platform.OS")
    os_match = re.match(r"([A-Za-z]+)\s+(\d+)", os_text)
    os_name = os_match.group(1) if os_match else None
    android_version = int(os_match.group(2)) if os_match else None

    updates_match = re.search(r"up to\s+(\d+)\s+major", os_text, re.IGNORECASE)
    major_updates = int(updates_match.group(1)) if updates_match else None

    return {
        "os": os_name,
        "android_version": android_version,
        "major_updates": major_updates,
    }


def parse_benchmarks(specs: dict) -> dict:
    perf_text = _get(specs, "Our Tests.Performance")

    antutu_scores = _all_numbers(perf_text, r"AnTuTu:\s*(\d+)")
    antutu = max(antutu_scores) if antutu_scores else None
    # second AnTuTu score in the same string (different benchmark version, e.g. "885852 (v11)")
    if not antutu_scores:
        antutu_scores = _all_numbers(perf_text, r"(\d{5,})\s*\(v\d+\)")
        antutu = max(antutu_scores) if antutu_scores else None

    geekbench_match = re.search(r"GeekBench:\s*(\d+)", perf_text)
    geekbench = int(geekbench_match.group(1)) if geekbench_match else None

    dmark_match = re.search(r"3DMark:\s*(\d+)", perf_text)
    threedmark = int(dmark_match.group(1)) if dmark_match else None

    return {
        "antutu": antutu,
        "geekbench": geekbench,
        "3dmark": threedmark,
    }


# ---------------------------------------------------------------------------
# top-level entry point
# ---------------------------------------------------------------------------

def normalize_phone(entry: dict) -> dict:
    specs = entry.get("raw_specs", {})
    brand = entry.get("brand", "")
    model_title = entry.get("model_title", "")
    _, model = parse_brand_model(model_title, brand)

    memory = parse_memory(specs)
    chipset_info = parse_chipset(specs)

    return {
        "brand": brand,
        "model": model,
        "image_url": entry.get("image_url"),
        "release_date": parse_release_date(specs),
        "source": {
            "name": "GSMArena",
            "url": entry.get("source_url"),
        },
        "performance": {
            "chipset": chipset_info["chipset"],
            "cpu": chipset_info["cpu"],
            "gpu": chipset_info["gpu"],
            "storage_type": memory["storage_type"],
            "variants": memory["variants"],
        },
        "display": parse_display(specs),
        "battery": parse_battery(specs),
        "camera": parse_camera(specs),
        "connectivity": parse_connectivity(specs),
        "physical": parse_physical(specs),
        "software": parse_software(specs),
        "benchmarks": parse_benchmarks(specs),
    }


def normalize_all(entries: list) -> list:
    return [normalize_phone(e) for e in entries]


def find_incomplete_entries(entries: list) -> list:
    """
    Flag raw entries that are missing the data normalize_phone() actually
    needs -- an empty/missing `raw_specs` dict and/or an empty/missing
    `model_title`. These typically come from scraper failures (blocked
    request, unexpected page layout, 404, etc.) rather than the phone
    genuinely having no specs. Returns a list of
    {"index", "brand", "model_title", "source_url", "reason"} dicts.
    """
    problems = []
    for i, e in enumerate(entries):
        specs = e.get("raw_specs") or {}
        model_title = (e.get("model_title") or "").strip()
        reasons = []
        if not specs:
            reasons.append("raw_specs is empty/missing")
        if not model_title:
            reasons.append("model_title is empty/missing")
        if reasons:
            problems.append({
                "index": i,
                "brand": e.get("brand"),
                "model_title": e.get("model_title"),
                "source_url": e.get("source_url"),
                "reason": "; ".join(reasons),
            })
    return problems


def load_entries(path: str) -> list:
    """
    Load raw phone entries from any of:
      - a standard JSON file containing a single JSON array,
      - strict JSON Lines (.jsonl): one compact JSON object per line, or
      - "loose" / pretty-printed JSONL: JSON objects concatenated back to
        back (optionally comma- or newline-separated), each spanning
        multiple lines -- e.g. output from `json.dump(obj, indent=2)`
        called once per record.
    Auto-detects the format so the CLI works with any of these without
    the caller needing to know which one they have.
    """
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()

    stripped = text.strip()
    if not stripped:
        return []

    # Fast path: the whole file is one JSON array or one JSON object.
    try:
        data = json.loads(stripped)
        return data if isinstance(data, list) else [data]
    except json.JSONDecodeError:
        pass

    # General path: scan the file and decode consecutive JSON values
    # wherever they occur, ignoring whitespace/newlines/commas between
    # them. This handles strict JSONL, pretty-printed multi-line JSONL,
    # and "almost an array but missing [ ]" files all the same way.
    decoder = json.JSONDecoder()
    entries = []
    idx = 0
    n = len(stripped)
    while idx < n:
        while idx < n and stripped[idx] in " \t\r\n,":
            idx += 1
        if idx >= n:
            break
        try:
            obj, end = decoder.raw_decode(stripped, idx)
        except json.JSONDecodeError as e:
            snippet = stripped[idx: idx + 120].replace("\n", "\\n")
            raise ValueError(
                f"Could not parse JSON in {path} at character {idx} "
                f"(near: {snippet!r}): {e}"
            ) from e
        entries.append(obj)
        idx = end
    return entries


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    if len(sys.argv) not in (3, 4):
        print(
            "Usage: python normalize_phone_specs.py <raw_input.json|.jsonl> "
            "<clean_data.json> [--skip-incomplete]"
        )
        sys.exit(1)

    in_path, out_path = sys.argv[1], sys.argv[2]
    skip_incomplete = "--skip-incomplete" in sys.argv[3:]

    raw_data = load_entries(in_path)

    incomplete = find_incomplete_entries(raw_data)
    if incomplete:
        print(f"WARNING: {len(incomplete)} of {len(raw_data)} raw entries look incomplete "
              f"(likely scraper failures) and will normalize to mostly null fields:", file=sys.stderr)
        for p in incomplete:
            print(f"  [{p['index']}] brand={p['brand']!r} model_title={p['model_title']!r} "
                  f"url={p['source_url']!r} -- {p['reason']}", file=sys.stderr)
        if skip_incomplete:
            skip_idx = {p["index"] for p in incomplete}
            raw_data = [e for i, e in enumerate(raw_data) if i not in skip_idx]
            print(f"--skip-incomplete: excluded {len(incomplete)} entr(y/ies) from output.", file=sys.stderr)
        else:
            print("(They are still included in the output. Re-run with --skip-incomplete "
                  "to drop them, or re-scrape these URLs.)", file=sys.stderr)

    normalized = normalize_all(raw_data)

    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(normalized, f, indent=2, ensure_ascii=False)

    print(f"Normalized {len(normalized)} phone(s) -> {out_path}")
