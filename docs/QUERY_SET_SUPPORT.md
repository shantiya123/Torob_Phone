# QuerySet Support Matrix

TG-005 defines the stable LLM-facing QuerySet contract. The adapter maps only fields the deterministic filter can apply today. A non-null unsupported field raises `UnsupportedQuerySetFieldError`; it is never silently ignored.

| QuerySet field(s) | Dataset | FilterRequirements / filter | Action |
| --- | --- | --- | --- |
| `brand` | Yes | Yes | Supported; explicit English/Persian aliases normalize to canonical casing. |
| `model`, `release_date`, `source.*` | Present in source evidence | No | Unsupported. Model matching and source-provenance filtering are not part of the current candidate filter; canonical release dates are intentionally unresolved. |
| `performance.chipset`, `performance.gpu` | Yes | Yes | Supported as case-insensitive exact constraints. |
| `performance.cpu`, `performance.storage_type` | Yes | No | Unsupported; storage technology is only safely mapped for some variants and CPU parsing/matching is not defined. |
| `performance.variants.ram_gb`, `storage_gb` min/max | Yes | Yes | Supported on `DeviceVariant`. |
| `display.size_inches` min/max | Yes | Yes | Supported on the primary display. |
| `display.resolution_*`, `refresh_rate_hz`, `brightness_peak_nits` min | Yes | Yes | Supported on the primary display. |
| Those display fields’ max bounds | Yes | No | Explicitly unsupported until corresponding domain maximum constraints are added. |
| `display.technology` | Yes | No | Unsupported; canonical vocabulary exists but no deterministic requirement has been approved. |
| `display.hdr` | Yes / sometimes unknown | Yes | Supported; only explicit `True` can satisfy `true`. |
| `battery.capacity_mah`, `charging_w` min | Yes | Yes | Supported. |
| Those battery fields’ max bounds | Yes | No | Explicitly unsupported. |
| `battery.wireless_charging` | Yes / often unknown | Yes | Supported; unknown never satisfies `true`. |
| `camera.main_mp`, `ultrawide_mp`, `video_max_fps` min; `ois` | Yes / incomplete | Yes | Supported through rear camera/lens records. |
| Camera max bounds, `macro_mp`, `selfie_mp`, `video_max_resolution` | Yes / incomplete | No | Explicitly unsupported; the current canonical camera summary cannot safely provide all requested semantics. |
| `connectivity.5g`, `nfc`, `wifi_version` | Yes / booleans may be unknown | Yes | Supported. Wi-Fi uses the documented 4 < 5 < 6 < 6E < 7 ordering. |
| `connectivity.bluetooth_version` | Yes | No | Unsupported; a version comparison policy is not yet defined. |
| `physical.weight_g.max`, `ip_rating` | Yes / incomplete | Yes | Supported. IP ratings compare dust and water protection numerically. |
| `physical.weight_g.min` | Yes | No | Explicitly unsupported. |
| `software.android_version.min`, `major_updates.min` | Yes / incomplete | Yes | Supported; Android version requires canonical platform `Android`. |
| `software.os`, software max bounds | Yes | No | Unsupported; the existing deterministic filter exposes Android minima only. |
| `benchmarks.*` | Yes / frequently missing | No | Unsupported. Benchmark versions are absent in current data, so comparison semantics are not safe yet. |
| `price.min`, `price.max` | Yes | Yes | Supported through eligible public marketplace offers. `price` is handled as non-negative integer money values and is filtered through public offer visibility rules. |

Unsupported conditions are preserved in the QuerySet contract for future development, but they cannot be used to obtain catalog candidates in TG-005.