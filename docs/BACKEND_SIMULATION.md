# Backend Simulation

Stage 4 provides run-owned deterministic seed data, safety guards, cleanup,
and database invariant validation. HTTP journeys, PostgreSQL race scenarios,
and Locust load profiles are subsequent stages.

## Safety first

Use a dedicated database such as `torob_phone_simulation`. Destructive
commands require:

```text
DJANGO_ENV=development or test
SIMULATION_ALLOW_DESTRUCTIVE=true
--confirm-database <exact database name>
```

Production and staging are rejected. The database name must contain `test`,
`simulation`, or `sim`.

## Stage 4 commands

```powershell
python manage.py migrate

$env:DJANGO_ENV = "development"
$env:SIMULATION_ALLOW_DESTRUCTIVE = "true"

python manage.py seed_simulation_data `
  --preset small `
  --seed 20260726 `
  --run-id sim-20260726-001 `
  --confirm-database torob_phone_simulation
```

```powershell
python manage.py validate_simulation_state `
  --run-id sim-20260726-001 `
  --format markdown,json
```

```powershell
python manage.py cleanup_simulation_data `
  --run-id sim-20260726-001 `
  --confirm-database torob_phone_simulation
```

Cleanup is idempotent and only follows the selected run's artifact ledger.

## Stage 5 HTTP journeys

With a seeded run and a running server:

```powershell
python manage.py run_backend_simulation `
  --run-id sim-20260726-001 `
  --base-url http://127.0.0.1:8000 `
  --scenario all
```

The client uses a cookie jar for refresh tokens and keeps access tokens only
in memory. Reports are written as both JSON and Markdown. The journey runner
expects the backend's deterministic Torobche fallback when no GapGPT
credentials are configured.

## Frontend-ready marketplace scenario

The standard marketplace run registers six Store companies through the public
API, reviews them with the configured Staff account, creates 250–300 Offers for
each of five approved Stores, creates ten Customers, and exercises wallet,
Basket, checkout, cancellation, and refund flows. It is resumable by `run_id`
and uses the existing `SimulationArtifact` ownership ledger.

```powershell
python manage.py run_marketplace_scenario `
  --run-id frontend-demo-001 `
  --seed 20260726 `
  --stores 6 `
  --approved-stores 5 `
  --customers 10 `
  --offers-per-store-min 250 `
  --offers-per-store-max 300 `
  --mode hybrid `
  --keep-data `
  --confirm-database torob_phone_simulation
```

`hybrid` is the default: representative Offers are created through HTTP and
the bounded bulk is created through the simulation-owned service path. `api`
performs all Offer creation through HTTP; `factory` is development-only and is
not an end-to-end certification.

The command requires `SIMULATION_STAFF_USERNAME` and
`SIMULATION_STAFF_PASSWORD`. Credentials are read from the environment only
and are never written to reports. Reports are written to `reports/` as
`<run-id>-marketplace.json` and `<run-id>-marketplace.md`.
