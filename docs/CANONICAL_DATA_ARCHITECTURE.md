# Canonical Mobile-Phone Data Architecture

**Design date:** 2026-07-19  
**Status:** Approved design baseline; no Django models, migrations, import commands, or APIs are implemented by this Task Group.

## Purpose

This document defines the canonical data boundary between imported source data and future deterministic product discovery and recommendation services.

```text
source file / provider response
        -> import run and source record ledger
        -> validation and canonicalization
        -> typed catalog and offer tables
        -> versioned derived feature data
        -> deterministic filtering, scoring, ranking, and API
```

`data/clean_data.json` is a normalized source artifact. It is not the database schema and must not be imported as a JSON blob in place of canonical records.

## Dataset findings that shape the design

The current `clean_data.json` contains 233 records from GSMArena, each with the same nested key shape and a unique source URL. It contains ten brands, no duplicate `(brand, model)` pairs, and source dates from 2019-10-22 through 2026-08-01.

Important limitations:

- 22 records have no memory variants; all are Nokia feature phones. Import must not reject or silently classify them as smartphones.
- Several values are incomplete: for example, 170 records lack AnTuTu and Geekbench scores, 87 lack storage type, and 53 lack display brightness.
- The current booleans are parser outputs. A `false` value can mean a verified absence or that a source field did not contain the matched text. Canonical feature flags therefore need an **unknown** state during import.
- `release_date` is derived from either a released-status date or an announcement date. It cannot be treated unconditionally as an actual release date.
- Storage type is sometimes variant-specific text; benchmark values do not preserve benchmark versions. Neither should be reduced to a misleading single canonical value.

## Canonical principles

1. Persist raw source evidence separately from canonical data.
2. Use typed, queryable columns for stable filtering and ranking inputs; do not use an EAV table or JSON fields as the primary recommendation store.
3. Model repeated values relationally: variants, displays, camera lenses, benchmark measurements, source links, and price observations are rows.
4. Store missing or unverified values as `NULL` / `unknown`, never as an invented default.
5. Keep products, purchasable variants, and store offers distinct.
6. Treat derived ranking features as rebuildable, versioned outputs, never source-of-truth product facts.
7. Retain source provenance and import history so canonical facts can be explained and corrected.

## Logical model

```text
ImportRun 1---* SourceRecord *---1 DataSource
                         |
                         *---* DeviceModel ---1 Brand
                                  |
                                  +---* DeviceVariant
                                  +---1 PerformanceSpec
                                  +---* DisplaySpec
                                  +---1 BatterySpec
                                  +---1 CameraSystem ---* CameraLens
                                  +---1 ConnectivitySpec
                                  +---1 PhysicalSpec
                                  +---1 SoftwareSpec
                                  +---* BenchmarkMeasurement
                                  +---* CanonicalFieldEvidence *---1 SourceRecord
                                  +---* DerivedFeatureSet

Store 1---* StoreOffer *---1 DeviceVariant
StoreOffer 1---* OfferPriceObservation
```

### Source and import ledger

| Entity | Essential fields | Responsibility |
| --- | --- | --- |
| `DataSource` | `id`, `name`, `base_url`, `is_active` | Identifies an external provider such as GSMArena. |
| `ImportRun` | `id`, `source_file`, `file_sha256`, `schema_version`, `normalizer_version`, `started_at`, `completed_at`, counts, status | Makes each dataset import auditable and repeatable. |
| `SourceRecord` | `id`, `data_source`, `source_url`, `external_id` nullable, `raw_payload`, `normalized_payload`, `payload_hash`, `observed_at`, `import_run`, validation status | Keeps source evidence and detects replay/changes. Unique `(data_source, source_url)` for the current source identity. |
| `CanonicalFieldEvidence` | `device_model`, `field_path`, `source_record`, `observed_value`, `confidence`, `is_selected`, timestamps | Links a chosen canonical fact to its evidence and supports future source conflicts. |

`raw_payload` may use JSON because provider content is intrinsically variable. It is an evidence/staging record, not the catalog query surface.

### Catalog identity and configuration

| Entity | Essential fields and constraints |
| --- | --- |
| `Brand` | `id`, `name`, normalized `slug`; unique `slug`. |
| `DeviceModel` | `id`, `brand`, `model_name`, normalized `model_key`, `device_kind` (`smartphone`, `feature_phone`, `tablet`, `other`, `unknown`), `announced_on` nullable, `released_on` nullable, `availability_status` nullable, `is_catalog_eligible`, timestamps; unique `(brand, model_key)`. |
| `DeviceVariant` | `id`, `device_model`, `storage_gb` nullable, `ram_gb` nullable, `storage_technology` nullable, `sku_or_region` nullable, `is_available`; unique over model plus normalized configuration when known. |

A source URL identifies a source record, not the product itself. The initial importer may create a model from `(brand, model_key)`, but later canonicalization must be able to merge, split, or link regional/revision records without changing source history.

`device_kind` prevents feature phones from being discarded simply because their memory variants are absent. Recommendation queries can explicitly target eligible smartphones instead of relying on incidental null checks.

### Typed specification profiles

The following tables are one-to-one with `DeviceModel` unless noted. Their fields are nullable unless the value is genuinely required for a catalog record.

| Table | Typed canonical fields |
| --- | --- |
| `PerformanceSpec` | `chipset_name`, `cpu_description`, `gpu_name`; storage technology belongs on `DeviceVariant` when source evidence supports it. |
| `DisplaySpec` (one-to-many) | `role` (`primary`, `cover`, `external`, `unknown`), `size_inches` decimal, `resolution_width_px`, `resolution_height_px`, `technology`, `refresh_rate_hz`, `peak_brightness_nits`, `supports_hdr` nullable boolean. |
| `BatterySpec` | `capacity_mah`, `wired_charging_w`, `supports_wireless_charging` nullable boolean. |
| `CameraSystem` | `position` (`rear`, `front`); `CameraLens` rows carry `role` (`wide`, `ultrawide`, `telephoto`, `macro`, `depth`, `unknown`), `megapixels`, `has_ois` nullable boolean. A system also stores `max_video_resolution` and `max_video_fps`. |
| `ConnectivitySpec` | `supports_5g`, `wifi_standard`, `bluetooth_version` decimal/text, `supports_nfc`; each support flag is nullable boolean. |
| `PhysicalSpec` | `weight_g`, `ip_rating`, with later extensibility for dimensions and materials. |
| `SoftwareSpec` | `platform_name`, `platform_version`, `promised_major_updates`. |
| `BenchmarkMeasurement` (one-to-many) | `benchmark_name`, `benchmark_version` nullable, `score`, `measured_at` nullable, `source_record`. Unique by product, benchmark name, version, and source measurement where known. |

The initial cleaned dataset has one display and summary camera fields. The model intentionally permits multiple displays and lenses so foldables and fuller future sources do not require a schema replacement. Its importer must create only facts actually supported by the source.

### Offers and price history

The current dataset contains no store or price data. When introduced, it must remain separate from specifications:

| Entity | Essential fields |
| --- | --- |
| `Store` | identity, name, normalized domain, active state. |
| `StoreOffer` | `store`, `device_variant`, external listing ID/URL, seller SKU nullable, condition, currency, availability, last_seen_at. |
| `OfferPriceObservation` | `store_offer`, amount in minor currency units, currency, observed_at. |

Use the specific `DeviceVariant` when a listing identifies RAM/storage. An offer whose exact configuration is unknown may temporarily target the model with an explicit `configuration_confidence`; it must not be represented as a falsely precise variant.

### Derived features and deterministic recommendation

`DerivedFeatureSet` contains rebuildable, versioned outputs associated with a model or variant: feature schema version, source-data revision, computed values, computed timestamp, and completeness state. Examples include normalized display area, benchmark-derived performance tier, camera capability flags, or value metrics once offers exist.

The deterministic engine reads typed canonical specs and, where appropriate, a named feature-set version. It must record the input data/feature version used for a recommendation so filtering, ranking, and explanations remain reproducible. It does not read raw source JSON or let an LLM establish factual scores.

## Validation and import contract

1. Create an `ImportRun` and compute the source-file hash before canonical writes.
2. Validate the source payload shape, required identity fields, URL, units, numeric bounds, enum candidates, and duplicate source URLs.
3. Classify each field as valid, missing, invalid, or ambiguous. Reject invalid records to a review queue rather than silently coercing them.
4. Upsert `SourceRecord` by source identity and preserve payload history through hash/revision metadata.
5. Resolve or create `Brand` and `DeviceModel`; classify `device_kind` with a rule whose outcome is reviewable.
6. Map only validated facts to canonical typed tables and add field evidence.
7. Write variants, repeated hardware rows, and benchmark measurements independently.
8. Generate derived features only after canonicalization succeeds; mark incomplete profiles so recommendations can explain missing evidence.

### Required safeguards for the current source

- Import `release_date` into a source lifecycle observation. Populate `released_on` only when the source status confirms release; otherwise populate `announced_on` or leave both canonical dates unresolved.
- Do not write a canonical `False` for HDR, wireless charging, OIS, 5G, or NFC solely because the normalized file contains `false`. Confirm explicit negative evidence from raw source data; otherwise use `NULL` and a low-confidence observation.
- Preserve the original storage-type text in source evidence. Assign it to a variant only if the source unambiguously maps it to that variant.
- Store benchmark name/version with each measurement. Existing version-less scores are importable only as version `NULL` and should not be directly compared across versions.
- A record with no memory variants is valid but cannot satisfy a future RAM/storage hard constraint; it is not a failed import.

## Indexes and query paths

Start with indexes that support known catalog lookups, not speculative tuning:

- unique `Brand.slug` and `DeviceModel(brand_id, model_key)`;
- unique current-source identity `SourceRecord(data_source_id, source_url)`;
- `DeviceVariant(device_model_id, storage_gb, ram_gb)` for constraint filtering;
- individual/filter-oriented indexes on high-use nullable fields such as release date, 5G support, display refresh rate, battery capacity, weight, and benchmark score, added after query patterns are confirmed;
- `StoreOffer(device_variant_id, availability, last_seen_at)` and `OfferPriceObservation(store_offer_id, observed_at)` once offers exist.

For the local starter project, SQLite remains sufficient for model development and fixture import. Production database selection and operational indexing are deliberately deferred.

## Explicit non-goals of this Task Group

- No Django app, model, migration, importer, fixtures, API, recommendation algorithm, or offer scraper is implemented.
- No source record is treated as authoritative simply because it appears in `clean_data.json`.
- No production database replacement or dependency change is proposed.
