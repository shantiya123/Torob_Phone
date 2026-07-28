# Architecture Decisions

## Decision: Empty Torobche searches return proposals, never silent relaxations

**Date:** 2026-07-28

Recovery runs only after a successful exact deterministic search returns zero
variants. TG019 considers only soft adapter-supported fields, tests one change
per candidate with bounded deterministic ranking, and returns no more than
three proposals. Original QuerySet persistence remains authoritative until a
future approved plan-acceptance workflow exists.

## Decision: Track simulation ownership with a run and artifact ledger

**Date:** 2026-07-26

### Context

The Backend Simulation and Validation Suite must create realistic marketplace
data, support multiple independent runs, recover from partial execution, and
delete only records created by one selected run. Username prefixes and the
`@example.test` email domain are useful safety checks, but they do not
unambiguously identify every generated BasketItem, Order, WalletTransaction,
CheckoutAttempt, or partially created object. Adding a simulation foreign key
to every business model would make the testing system unnecessarily invasive.

### Decision

Add a simulation-owned `SimulationRun` record for run configuration and
lifecycle metadata, plus a `SimulationArtifact` ledger containing the model
label and primary key of every object owned by that run. Generated usernames,
slugs, and emails will also contain deterministic simulation markers as a
second cleanup guard.

Existing catalog records and externally supplied Staff fixtures may be reused
without being recorded as owned artifacts. Cleanup must delete only ledgered
objects, in dependency-safe order, and must verify both ledger ownership and
the expected simulation identity marker before deleting identity-bearing
records.

### Alternatives considered

- Prefixes and email markers without durable ownership records.
- Adding a `simulation_run` foreign key to every existing domain model.

### Consequences

The suite can clean a specific run after success, failure, or interruption
without deleting unrelated developer data. It adds two isolated,
simulation-only models and one migration, but does not change existing API
contracts or business-domain models.

## Decision: Keep access tokens in memory and refresh tokens in HttpOnly cookies

**Date:** 2026-07-25

Login and refresh return access tokens only. Refresh tokens use an environment-configured, narrowly scoped HttpOnly cookie; SimpleJWT rotates and blacklists them. This preserves existing Bearer authorization while preventing frontend JavaScript from reading refresh credentials. Refresh/logout use exact origin allowlists for browser requests; cross-origin deployments require explicit HTTPS and cookie/CORS configuration.

## Decision: PostgreSQL is required outside lightweight development

**Date:** 2026-07-25

The settings use explicit `DB_*` configuration for PostgreSQL and permit SQLite only when selected for development. Staging and production fail fast without PostgreSQL configuration, avoiding an accidental SQLite deployment. No project migration is necessary for the engine change.

## Decision: Store one nullable parent-model image URL

**Date:** 2026-07-25

The collector already receives GSMArena listing-card image URLs but discarded
them. `DeviceModel.image_url` is the smallest durable place to retain that
optional value. Variants expose the parent's URL; no variant image field,
runtime scrape, media service, or gallery was introduced.

## Decision: Return a durable structured multi-order checkout response

**Date:** 2026-07-24

Checkout can create one paid order per store. The endpoint returns a durable
structured response containing a checkout identifier, order summaries,
aggregate count/total, and remaining wallet balance. The frontend confirmation
page can render all Store-specific orders without guessing response shape.

Order items reference protected offers and retain their own unit-price
snapshot. Presentation must use that snapshot, never a mutable offer price.

## Decision: Treat the Torobche wrapper as an outer provider contract

**Date:** 2026-07-24

GapGPT conversational output is a two-key wrapper: `message` and `queryset`.
Only the nested `queryset` enters the established strict validation,
persistence, and deterministic filtering pipeline. A bad conversational
message uses a safe fallback while retaining a valid QuerySet; an invalid
QuerySet never overwrites the prior saved state.

The durable backend state is the latest validated QuerySet, not a transcript.

## Decision: Persist validated search intent separately from catalog facts

**Date:** 2026-07-24

The latest QuerySet is stored once per authenticated user after strict
validation. This enables continuous search refinement and a later
personalized explanation without modifying product models or making the LLM
the source of truth. The reset endpoint stores the all-null QuerySet.

AI explanations remain generated on demand, are not persisted, and receive a
reduced product payload plus the saved filter only.

## Decision: Cancellation restores inventory and refunds paid wallet orders

**Date:** 2026-07-24

Cancellation atomically restores `OrderItem` quantities to their offers only
when a pending or paid order first becomes cancelled. Paid Orders created by
wallet checkout receive one linked refund transaction; legacy pending Orders
without a purchase transaction restore stock but do not create money.

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

## Decision: Store catalog browsing uses parent phones but selects variants

**Date:** 2026-07-25

### Context

Store offer creation needs an operational browser that is independent of conversational search. Offers reference `DeviceVariant`, while a browser is easier to navigate by parent `DeviceModel`.

### Decision

Expose catalog-eligible parent phones through Store-only, read-only list and detail endpoints. The detail endpoint returns available variants using the existing compact variant representation. Non-staff Store users may browse; customers, anonymous users, and staff may not. No Store offer state is included.

### Consequences

The frontend can browse a stable, paginated parent catalog and then submit a selected variant to the existing offer flow. The catalog endpoint remains independent of Torobche, QuerySet state, ranking, and marketplace offer data.
