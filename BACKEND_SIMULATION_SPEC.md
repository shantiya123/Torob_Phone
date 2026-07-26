# Backend Simulation and Validation Suite Specification

**Project:** Torob Phone Django backend  
**Specification date:** 2026-07-26  
**Status:** Proposed for approval; implementation has not started  
**Authoritative runtime:** PostgreSQL for concurrency certification  

## 1. Purpose

The suite validates the Torob Phone backend as a marketplace system rather
than as isolated endpoint examples. It combines five deliberately separate
layers:

1. deterministic API contract tests;
2. deterministic realistic data seeding;
3. real HTTP user journeys;
4. PostgreSQL concurrency and configurable load simulation;
5. post-run database and privacy auditing.

The suite must be reproducible, safe to interrupt, capable of producing
partial reports, and able to delete exactly the data owned by one simulation
run.

## 2. Current backend boundary

The suite tests the repository as implemented. It must not invent missing
business workflows.

Implemented roles:

- anonymous visitor;
- Customer through `AccountProfile.account_type=customer`;
- Store through `AccountProfile.account_type=store`;
- Staff through Django `User.is_staff`, without requiring an
  `AccountProfile`.

Implemented Store statuses:

- `pending`;
- `active`;
- `rejected`;
- `suspended`.

Implemented Order statuses:

- `pending`;
- `paid`;
- `cancelled`;
- `completed`.

Current limitations that define test expectations:

- no API creates or removes the `suspended` Store state;
- no reachable Store resubmission API performs `rejected -> pending`;
- no Store Order mutation or fulfilment endpoint exists;
- no HTTP transition performs `paid -> completed`;
- Offers have no independent hidden/deactivated field;
- logout invalidates the refresh token, but an issued access token remains
  valid until its normal expiry;
- `/api/catalog/phones/<id>/explanation/` is an alternate route whose view
  still resolves `<id>` as a DeviceVariant primary key;
- wallet top-up is a demo/internal operation, not a payment gateway.

Tests must describe these as unsupported or absent. They must not create new
production behavior merely to satisfy a scenario name.

## 3. Architecture

The implementation will add one isolated Django app:

```text
simulation/
├── __init__.py
├── apps.py
├── models.py
├── config.py
├── safety.py
├── presets.py
├── ownership.py
├── reporting.py
├── data_builders/
│   ├── __init__.py
│   ├── identities.py
│   ├── stores.py
│   ├── offers.py
│   └── shopping.py
├── http/
│   ├── __init__.py
│   ├── client.py
│   └── scenarios/
│       ├── anonymous.py
│       ├── customer.py
│       ├── store.py
│       └── staff.py
├── validation/
│   ├── __init__.py
│   ├── database.py
│   ├── inventory.py
│   ├── financial.py
│   ├── permissions.py
│   └── privacy.py
├── concurrency/
│   ├── __init__.py
│   └── scenarios.py
├── management/commands/
│   ├── seed_simulation_data.py
│   ├── run_backend_simulation.py
│   ├── validate_simulation_state.py
│   └── cleanup_simulation_data.py
├── tests/
│   ├── contracts/
│   ├── permissions/
│   ├── invariants/
│   └── concurrency/
└── locustfile.py
```

The final structure may combine very small modules, but it must retain the
boundaries between ownership/safety, data construction, HTTP journeys,
concurrency, validation, and reporting.

Existing Django `TestCase`, DRF `APITestCase`, and PostgreSQL-backed
`TransactionTestCase` remain the deterministic test infrastructure. The suite
must not migrate the repository to pytest merely for this feature.

## 4. Simulation ownership

The approved ownership strategy uses two simulation-only models.

### 4.1 SimulationRun

Required fields:

- `run_id`: unique immutable string;
- `seed`: integer;
- `preset`: `small`, `medium`, or `large`;
- `status`: `created`, `seeding`, `seeded`, `running`, `completed`, `failed`,
  `cleaning`, or `cleaned`;
- `environment`;
- `database_engine`;
- `database_name`;
- `base_url`, nullable;
- `configuration`: JSON without credentials;
- `initial_state`: JSON containing baselines required for reconciliation;
- `created_counts`: JSON;
- `cleaned_counts`: JSON;
- `started_at`, `finished_at`, and `updated_at`;
- `failure_summary`: redacted JSON.

Secrets, passwords, access tokens, refresh tokens, cookies, and legal
identifiers must never be stored in this model.

### 4.2 SimulationArtifact

Required fields:

- `run`: foreign key to `SimulationRun`;
- `app_label`;
- `model_name`;
- `object_pk`: string representation supporting integer or UUID keys;
- `identity_marker`, nullable;
- `metadata`: redacted JSON;
- `created_at`;
- unique constraint on `(run, app_label, model_name, object_pk)`.

This is an ownership ledger, not a generic business relationship. It does not
change existing domain models.

Artifact registration must occur in the same database transaction as object
creation wherever practical. Bulk creation must immediately ledger returned
primary keys before the seeding stage is marked successful.

### 4.3 Identity markers

Generated identity-bearing records use:

```text
sim-<run-id>-customer-0001
sim-<run-id>-store-0001
sim-<run-id>-staff-0001
```

Generated emails use only:

```text
<identity>@example.test
```

No real phone number, email address, national identifier, tax identifier, or
business registration identifier may be generated. Legal-looking values must
be clearly synthetic and include the run marker.

### 4.4 Shared and external fixtures

Existing catalog records may be reused but are not owned or removed by a run.
Configured Staff credentials may identify a pre-existing test fixture. Such a
user is ledgered only if the seed command created it; reused fixtures must
never be deleted by simulation cleanup.

## 5. Safety rules

### 5.1 Non-destructive commands

Read-only validation may run in development or test. It must still report the
database name, engine, and environment.

### 5.2 Destructive commands

Seeding that can overwrite a prior run and all cleanup operations require:

```text
SIMULATION_ALLOW_DESTRUCTIVE=true
DJANGO_ENV=development or test
--confirm-database <exact-current-database-name>
```

The database name must contain at least one explicit marker:

```text
test
simulation
sim
```

The confirmation value must exactly equal Django's resolved database name.
Substring confirmation is forbidden.

Destructive behavior must refuse to run when:

- `DJANGO_ENV=production`;
- `DJANGO_ENV=staging`;
- the database name lacks a test/simulation marker;
- the confirmation flag is absent or mismatched;
- `SIMULATION_ALLOW_DESTRUCTIVE` is not true;
- the selected `run_id` does not exist;
- artifact ownership cannot be verified.

Staging exceptions are outside this specification and require a later,
explicit architecture decision and dedicated environment.

An interactive confirmation is insufficient and must not replace these
guards.

### 5.3 Cleanup behavior

Cleanup must:

1. lock the selected `SimulationRun`;
2. load only that run's artifact ledger;
3. delete in dependency-safe order;
4. check identity markers before deleting Users, Stores, or other
   identity-bearing records;
5. leave reused catalog and Staff fixtures untouched;
6. record per-model deletion counts;
7. verify that no owned artifacts remain;
8. mark the run `cleaned` only after successful verification.

Cleanup must be idempotent. A second cleanup returns a successful no-op report.
It must not use broad prefix-only deletion or flush the database.

## 6. Configuration

Environment variables:

```text
SIMULATION_BASE_URL=http://127.0.0.1:8000
SIMULATION_STAFF_USERNAME=
SIMULATION_STAFF_PASSWORD=
SIMULATION_ALLOW_DESTRUCTIVE=false
SIMULATION_ALLOW_LIVE_EXTERNAL=false
SIMULATION_REPORT_DIR=simulation/reports
SIMULATION_HTTP_TIMEOUT_SECONDS=15
SIMULATION_RANDOM_SEED=20260726
SIMULATION_USER_COUNT=
SIMULATION_SPAWN_RATE=
SIMULATION_RUN_TIME=
```

Passwords and tokens are read only at runtime. They are never logged or
included in reports.

Command-line values override non-secret environment defaults. Secrets must not
be accepted as ordinary command-line flags because process listings can expose
them.

## 7. Data presets

Preset counts are defaults and remain configurable.

| Preset | Customers | Stores | Generated Staff | Offers | Historical Orders |
|---|---:|---:|---:|---:|---:|
| small | 10 | 4 | 2 | 30 | 20 |
| medium | 100 | 20 | 4 | 500 | 300 |
| large | 1,000 | 100 | 10 | configurable, default 3,000 | configurable, default 2,000 |

Store status distribution must include pending, active, rejected, and
suspended records. At least half of Stores in ordinary presets should be
active so user journeys have enough operational data.

Offer data must include:

- positive-stock public Offers;
- zero-stock Offers;
- Offers hidden by inactive Store status;
- Offers hidden by unavailable DeviceVariant;
- Offers hidden by ineligible DeviceModel where the existing catalog permits
  a controlled test fixture;
- multiple Stores offering the same DeviceVariant;
- distinct prices and quantities;
- at most one Offer per Store/DeviceVariant.

Shopping data must include:

- empty and populated Baskets;
- active reservations;
- expired reservations;
- Wallets with zero, low, and sufficient balances;
- charge, purchase, and refund transaction histories;
- paid, cancelled/refunded, completed, and legacy pending Orders.

Completed and legacy pending Orders may be built directly as seed fixtures
because no HTTP route creates those states. Reports must label them as seeded
state fixtures, not simulated API outcomes.

The same seed and clean catalog state must create logically equivalent data.
Primary-key values and timestamps need not be identical.

## 8. Authentication client contract

The real HTTP client must use a cookie-aware session.

For Customer and Store journeys it must:

1. call `POST /api/auth/login/`;
2. read only the access token from JSON;
3. retain the HttpOnly refresh cookie in the session cookie jar;
4. send `Authorization: Bearer <access>` to protected endpoints;
5. refresh with an empty-body `POST /api/auth/token/refresh/`;
6. replace the in-memory access token;
7. logout with `POST /api/auth/logout/`;
8. prove the prior refresh cookie/token cannot be replayed.

The suite must not claim that logout immediately revokes an already issued
access token. It should record whether that token remains valid until expiry,
which is the current JWT contract.

Real HTTP journeys must not create tokens directly. Direct authentication
helpers remain acceptable inside deterministic unit/contract tests.

## 9. Deterministic API contract scenarios

Every test must define expected status, response shape, state change, and
rollback expectation.

### 9.1 Authentication

- Customer registration success.
- Store registration atomically creates User, AccountProfile, Store, and legal
  profile with `pending` status.
- Invalid account type.
- Duplicate username and duplicate email.
- Password validation.
- Login success and invalid credentials.
- Access-only JSON response and refresh-cookie attributes.
- Missing, invalid, rotated, and blacklisted refresh cookie.
- Body-only refresh rejection.
- Trusted and untrusted Origin/Referer behavior.
- Idempotent logout and refresh replay rejection.
- `/api/auth/me/` for Customer, Store, and Staff without AccountProfile.
- Writable email and rejection of role/privilege changes.

### 9.2 Anonymous/public

- Store list search and pagination.
- Active Store detail.
- Pending, rejected, suspended, and missing Store return 404 publicly.
- Store-scoped Offer ordering and pagination.
- DeviceVariant detail.
- DeviceVariant Offer list.
- Offer detail.
- Empty result sets.
- Invalid and out-of-range pagination.
- Recursive private-key inspection for every public JSON response.

### 9.3 Customer

- Torobche access, saved state isolation, reset, ordering, zero results, strict
  QuerySet validation, and controlled provider fallback.
- Contextual explanation requires active filters.
- Basket creation on first read.
- Add, re-add, increase, decrease, delete, insufficient stock, nonpositive
  quantities, and ownership isolation.
- Reservation deadline creation and refresh.
- Passive basket GET does not refresh active expiration.
- Expired reservation release and re-add at current Offer price.
- Wallet lazy creation, valid/invalid top-up, transaction scoping, and
  idempotent top-up.
- Checkout for one and multiple Stores.
- Missing/oversized/duplicate idempotency key.
- Empty Basket and insufficient balance.
- Inactive Store, unavailable variant, ineligible phone, expired reservation,
  and invalid BasketItem context.
- Reservation-time price remains authoritative after Offer price changes.
- One Order per represented Store within the checkout.
- Customer order list/detail/status filtering.
- Cross-Customer order denial.
- First and repeated cancellation.
- Single stock restoration, single refund, and single refund transaction.
- Completed Order cancellation rejection.

### 9.4 Store

- Atomic Store registration and legal profile.
- Pending Store profile and restricted dashboard.
- Allowed profile fields and forbidden review/ownership fields.
- Active Store catalog list/detail.
- Catalog `owned_offer` and aggregate market price guidance.
- Store dashboard counts and recent records.
- Create, duplicate, update, zero-stock, restore-stock, and delete Offer.
- Inactive Store Offer-write denial.
- Own Offer list search and stock filters.
- Own Store Order list/detail and status filter.
- Cross-Store Offer and Order isolation.
- Rejected and suspended dashboard restrictions.
- Absence of resubmission and Order mutation routes is documented rather than
  treated as a failed implemented scenario.

### 9.5 Staff

- Staff login and `/api/auth/me/` without AccountProfile.
- Customer, Store, anonymous, and authenticated non-Staff denial.
- Review queue default status, explicit status, search, ordering, and
  pagination.
- Private review detail.
- Pending approval.
- Pending rejection with trimmed nonblank reason.
- Empty rejection reason.
- Invalid transition.
- Repeated same decision preserves original reviewer metadata.
- Approval makes Store and eligible Offers public.
- Rejection keeps Store and Offers private.

## 10. Real HTTP journeys

HTTP journeys run against `SIMULATION_BASE_URL` and use only public API
contracts.

Each role scenario must emit structured step results:

- scenario and step name;
- method and normalized route template;
- expected and actual status;
- duration;
- expected failure flag;
- redacted error category;
- created resource IDs where safe;
- correlation/run ID.

Expected validation failures count as successful scenario assertions.
Unexpected transport errors, 5xx responses, shape mismatches, and invariant
failures count as failures.

Journey ordering must allow independent execution where possible. A failed
journey must not prevent unrelated roles from continuing. Critical database
corruption indicators stop mutation scenarios and trigger a partial audit.

## 11. Concurrency scenarios

Authoritative concurrency tests require PostgreSQL and
`TransactionTestCase` or real concurrent HTTP requests with separate database
connections. SQLite runs must skip these with a clear non-authoritative result.

Required scenarios:

1. Same Customer, Basket, and checkout key:
   - one Wallet deduction;
   - one checkout result;
   - one Order per represented Store;
   - replay or controlled in-progress response.
2. Same Basket with different checkout keys:
   - only one execution succeeds;
   - no double charge or duplicate purchase.
3. Concurrent cancellation:
   - stock restored once;
   - Wallet refunded once;
   - one refund transaction.
4. Concurrent top-up with the same key:
   - Wallet credited once;
   - one charge transaction.
5. Final-unit reservation race:
   - total successful reservation never exceeds starting stock;
   - available quantity never becomes negative.
6. Expiration cleanup versus checkout:
   - expired stock is released or checkout is rejected according to lock
     acquisition;
   - no double restoration or purchase of expired stock.
7. Staff approval versus rejection:
   - one legal transition wins;
   - reviewer metadata matches the winning transition.
8. Offer update while Customers browse:
   - reads remain valid;
   - no partial representation or server error;
   - checkout continues to use reservation snapshot price.

Each scenario must use a barrier so workers reach the contested operation
together. Thread start timing without a barrier is insufficient.

## 12. Load testing

Locust profiles:

| Profile | Users | Duration | Purpose |
|---|---:|---:|---|
| smoke | 1–3 | 1–2 minutes | connectivity and script validation |
| development | 10–25 | 5 minutes | ordinary local behavior |
| standard | 50–100 | 10–20 minutes | dedicated PostgreSQL environment |
| stress | 200+ | explicitly configured | controlled environment only |

User count, spawn rate, run time, host, and wait-time range must remain
configurable. Default user behavior uses realistic pauses and weighted reads;
it must not be a maximum-rate denial-of-service script.

Locust user classes:

- anonymous browsing;
- Customer browsing and Basket activity;
- Customer checkout against prepared disposable Baskets;
- Store catalog/dashboard/Offer reads;
- Staff review queue reads.

Destructive Staff decisions and financial writes require prepared,
run-owned targets. Load tests must never act on arbitrary records returned by
an unscoped list.

## 13. External-service isolation

Deterministic tests and normal simulation runs must not make live requests to:

- GapGPT;
- GSMArena;
- DeepSeek;
- image hosts;
- payment, email, or SMS providers.

Torobche and explanation scenarios use a controlled fake provider in
deterministic tests. Real HTTP simulation either exercises deterministic
fallback behavior or enables a local stub endpoint.

Live external mode requires:

```text
SIMULATION_ALLOW_LIVE_EXTERNAL=true
```

It remains disabled by default and is excluded from CI certification.
Credentials and provider payloads must be redacted.

## 14. Database audit

### 14.1 Inventory

- every `Offer.quantity >= 0`;
- BasketItem quantity and unit price are positive;
- no duplicate Basket/Offer item;
- active reservations are future-dated;
- expired reservations are not counted as active;
- reservation release does not restore stock twice.

For run-owned Offers with recorded initial stock:

```text
available + active_reserved + sold_not_cancelled = initial_stock + explicit_restock
```

The validator must adapt the equation for seeded history and record all
adjustments in `SimulationRun.initial_state`.

### 14.2 Wallet

- every run-owned Wallet balance is nonnegative;
- transaction signs match types;
- each transaction's `balance_after` follows the chronological sequence;
- initial balance + charges - purchases + refunds equals current balance;
- purchase amount equals the linked Order total;
- no more than one refund exists per Order;
- cancelled paid Orders are refunded exactly once;
- no refund exceeds its purchase.

### 14.3 Orders and checkout

- each Order belongs to one Basket Customer and one Store;
- every OrderItem Offer belongs to the Order Store;
- Order total equals snapshot line totals;
- paid run-generated Orders have one purchase transaction;
- purchase transactions reference an Order;
- cancelled Orders do not produce duplicate restoration/refund effects;
- completed Orders are not cancelled;
- one successful checkout creates at most one Order per Store;
- one Customer/operation/idempotency key performs at most one financial
  execution.

### 14.4 Privacy

Recursively reject these keys in public Store and Offer responses:

```text
business_phone
business_email
address
legal_profile
owner
rejection_reason
reviewed_by
reviewed_at
national_identifier
tax_identifier
business_registration_number
legal_representative_national_identifier
```

The check applies at every nesting depth and to paginated results.

### 14.5 Permissions

The audit performs explicit negative access attempts:

- Customer A reading Customer B's BasketItem or Order;
- Store A modifying Store B's Offer;
- Store A reading Store B's Store Order;
- Customer/Store calling Staff review APIs;
- Staff calling Customer wallet, Basket, Torobche, and Store catalog APIs;
- anonymous access to all protected collections.

### 14.6 State consistency

- publicly returned Stores are active;
- publicly returned Offers satisfy all shared eligibility rules;
- inactive Stores receive restricted dashboards;
- review metadata is internally consistent with reviewed status;
- Store accounts have exactly one Store;
- Customer/Store AccountProfiles use only declared role values;
- Staff fixtures need not have AccountProfile.

## 15. Reporting

Every command produces JSON and Markdown. CSV is optional for request metrics.

Reports include:

- run ID, seed, preset, start/end timestamps;
- environment, database name, and engine;
- authoritative/non-authoritative concurrency status;
- configured and created user/data counts;
- request totals and status distribution;
- response-time minimum, median, p90, p95, p99, maximum, and mean;
- success, expected failure, unexpected failure, and skipped counts;
- failures grouped by scenario and normalized endpoint;
- concurrency outcomes;
- invariant results with severity;
- privacy and permission results;
- external-service mode;
- created and cleaned counts;
- warnings and unresolved failures;
- interruption/partial-report marker.

Reports must not include passwords, authentication headers, tokens, cookies,
secret environment values, complete legal identifiers, or raw provider
payloads.

Critical invariant failure returns a nonzero process exit code. Expected API
validation failures do not.

## 16. Commands

Proposed PowerShell usage:

```powershell
python manage.py seed_simulation_data `
  --preset medium `
  --seed 20260726 `
  --run-id sim-20260726-001 `
  --confirm-database torob_phone_simulation
```

```powershell
python manage.py run_backend_simulation `
  --run-id sim-20260726-001 `
  --base-url http://127.0.0.1:8000
```

```powershell
python manage.py validate_simulation_state `
  --run-id sim-20260726-001 `
  --format markdown,json
```

```powershell
locust `
  -f simulation/locustfile.py `
  --host http://127.0.0.1:8000
```

```powershell
python manage.py cleanup_simulation_data `
  --run-id sim-20260726-001 `
  --confirm-database torob_phone_simulation
```

Seed and cleanup additionally require
`SIMULATION_ALLOW_DESTRUCTIVE=true`.

## 17. CI subset

Normal CI:

1. Django checks and migration consistency.
2. Existing repository tests.
3. Simulation deterministic API contracts.
4. Privacy and permission tests.
5. Inventory and financial invariant tests.
6. Small PostgreSQL concurrency suite.
7. Seed, HTTP smoke simulation, audit, and cleanup verification.

Large and stress Locust profiles are manual or scheduled and are not ordinary
pull-request gates.

SQLite CI may run deterministic tests, but it must skip PostgreSQL locking
certification and label the result non-authoritative.

## 18. Documentation deliverables

Implementation must create or update:

- `docs/BACKEND_SIMULATION.md`;
- `docs/TEST_DATA_GUIDE.md`;
- `docs/LOAD_TESTING.md`;
- `docs/SIMULATION_INVARIANTS.md`;
- `.env.example`;
- `requirements.txt`;
- `.gitignore` for generated reports when appropriate.

## 19. Acceptance criteria

The suite is complete only when:

1. all 37 business API route patterns have an explicit coverage disposition;
2. deterministic tests pass on PostgreSQL;
3. existing backend tests remain passing;
4. small preset seeding is reproducible;
5. generated identities contain no real personal data;
6. every created record is owned or explicitly documented as a reused fixture;
7. cleanup removes one selected run without changing unrelated records;
8. cleanup is idempotent;
9. all required concurrency scenarios pass on PostgreSQL;
10. SQLite reports do not claim concurrency certification;
11. public privacy-key scans pass recursively;
12. cross-role and cross-owner permission checks pass;
13. inventory, wallet, Order, refund, and idempotency audits pass;
14. live external requests remain disabled by default;
15. HTTP authentication proves refresh rotation and replay rejection;
16. reports are produced in JSON and Markdown, including partial reports after
    controlled interruption;
17. critical invariant failures return a nonzero exit code;
18. seed → simulate → validate → cleanup is documented for PowerShell;
19. no production/staging destructive execution is possible through ordinary
    command configuration;
20. no existing public API contract or production-domain model is changed
    solely to support simulation.

## 20. Approval gate

Approval of this specification authorizes Stage 4 implementation:

- simulation models and migration;
- safety and ownership layer;
- deterministic builders and presets;
- seed and cleanup commands;
- contract tests;
- invariant validator;
- initial documentation.

HTTP journeys, PostgreSQL concurrency scenarios, and Locust implementation
remain subsequent controlled stages, validated after the Stage 4 foundation.
