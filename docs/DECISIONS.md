# Architecture Decisions

## Decision: Persist validated search intent separately from catalog facts

**Date:** 2026-07-24

The latest QuerySet is stored once per authenticated user after strict
validation. This enables continuous search refinement and a later
personalized explanation without modifying product models or making the LLM
the source of truth. The reset endpoint stores the all-null QuerySet.

AI explanations remain generated on demand, are not persisted, and receive a
reduced product payload plus the saved filter only.

## Decision: Cancellation returns inventory, not funds

**Date:** 2026-07-24

Cancellation atomically restores `OrderItem` quantities to their offers only
when a pending or paid order first becomes cancelled. It does not recreate
basket items or create wallet refund transactions because checkout currently
does not debit a wallet or process payment.

## Decision: Preserve the generated Django baseline

**Date:** 2026-07-18

### Context

The repository contains only Django project configuration and no product-domain implementation. Replacing the layout or adding applications before a concrete domain Task Group would be speculative.

### Decision

Keep the existing Django project package, its SQLite development database configuration, and the built-in admin-only URL configuration unchanged for Task Group 001.

### Alternatives considered

- Create a full set of anticipated product, offer, search, recommendation, and AI apps now.
- Replace SQLite or introduce a production infrastructure stack now.

### Reason

Neither alternative is required to document and validate the present foundation. Deferring those choices avoids locking the project into an unvalidated design.

### Consequences

The baseline is intentionally minimal. A later Task Group should introduce reproducible dependency management and the first domain application(s) once their ownership and data model are approved.

## Decision: Canonicalize project-control document locations

**Date:** 2026-07-18

### Context

Earlier drafts of project-control documents exist under `docs/` as `Agents.md`, `Rules.md`, and `Workflow.md`, while the repository convention requested for this project uses root-level uppercase filenames.

### Decision

Create canonical root-level `AGENTS.md`, `RULES.md`, and `WORKFLOW.md`. Preserve the existing `docs/` drafts as historical references.

### Consequences

Future work should follow the root-level documents and maintain the focused architecture, decision, and roadmap documents under `docs/`.

## Decision: Separate source evidence from canonical catalog facts

**Date:** 2026-07-19

### Context

`data/clean_data.json` contains a useful normalized GSMArena dataset, but it has incomplete values, source-derived booleans, ambiguous lifecycle dates, and fields that may vary by product variant. It is not a stable database schema.

### Decision

Use an import ledger and source-record evidence layer alongside a typed relational catalog. Keep products, variants, specifications, benchmark measurements, store offers, and rebuildable derived recommendation features separate.

### Alternatives considered

- Store each cleaned record as one JSON document and query it directly.
- Use a generic entity-attribute-value table for all specifications.
- Flatten all source fields into a single product table.

### Reason

The selected design preserves provenance and supports evolving sources while keeping deterministic filtering and ranking queryable, typed, and explainable.

### Consequences

The future importer must validate and map data deliberately. It cannot equate missing source matches with false capabilities or assume an ambiguous source date is a release date.

## Decision: Preserve ambiguous negative parser outputs as unknown

**Date:** 2026-07-19

### Context

The approved normalized dataset represents several capability fields as booleans, but the normalizer emits `false` when its source-text pattern is absent. That does not establish that the product lacks the capability.

### Decision

The importer maps positive boolean signals to `True` and parser-generated negative signals to `NULL`. It preserves the original source value in `CanonicalFieldEvidence` with ambiguous confidence.

### Consequences

Filtering can safely require an explicit `True`, while an unknown value cannot be falsely presented as a verified absence. A future importer using stronger source evidence may populate verified `False` values.

## Decision: Preserve plus signs in canonical model identity

**Date:** 2026-07-19

### Context

The first import attempt showed that punctuation-only normalization merged distinct source models such as `Galaxy S26` and `Galaxy S26+`.

### Decision

The deterministic model-key normalizer expands `+` to the word `plus` before punctuation normalization.

### Consequences

The database unique constraint remains effective without merging models whose meaningful names differ by a plus suffix.

## Decision: Hard filtering returns eligible device variants

**Date:** 2026-07-19

### Context

RAM and storage belong to a `DeviceVariant`; the remaining currently supported requirements belong to the parent `DeviceModel` and its typed specification profiles. Returning models would incorrectly imply that every configuration satisfies a variant-level requirement.

### Decision

The filtering service starts from available, catalog-eligible `DeviceVariant` rows and applies every supplied requirement with AND semantics. It returns a neutral, deterministic order only; it does not score or rank candidates.

### Consequences

One device model may occur more than once when multiple configurations satisfy constraints. `NULL` is excluded by any specified hard constraint. Wi-Fi and IP-rating requirements use explicit comparison rules rather than lexical ordering.

## Decision: Treat LLM output as untrusted QuerySet input

**Date:** 2026-07-21

### Context

Natural-language modification must be stateful without allowing an LLM to query the catalog, infer facts, or bypass deterministic hard constraints.

### Decision

Use a stable, strictly validated QuerySet contract. The stateful service replaces its current QuerySet only after provider output passes JSON/schema validation, canonical normalization, and adaptation to supported `FilterRequirements`. Unsupported non-null fields raise an error; they are never silently dropped.

### Consequences

The LLM remains an input translation layer. State is currently held in process memory by the internal service; a future HTTP/conversation layer must explicitly decide how to persist or scope it. Price, benchmark, source, and other unsupported criteria cannot claim to have been applied.
