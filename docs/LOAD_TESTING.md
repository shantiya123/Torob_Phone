# Load testing

Locust and real HTTP journeys are Stage 5/6 deliverables. They must run
against a dedicated PostgreSQL-backed environment and must never use
production or ordinary developer data.

| Profile | Users | Duration |
|---|---:|---:|
| smoke | 1–3 | 1–2 minutes |
| development | 10–25 | 5 minutes |
| standard | 50–100 | 10–20 minutes |
| stress | 200+ | explicitly controlled |

User counts, spawn rates, durations, host, and wait times remain configurable.
Large profiles will not run in ordinary CI.

Stage 5's HTTP journey command is a low-volume correctness runner. It is not a
load generator and should complete before Locust is started in a later stage.

## Stage 6 commands

Run the PostgreSQL concurrency suite:

```powershell
python manage.py run_concurrency_tests `
  --run-id sim-20260726-001 `
  --confirm-database torob_phone_simulation
```

SQLite reports the suite as skipped and non-authoritative. It must never be
used to claim row-lock certification.

Run Locust against a dedicated simulation server:

```powershell
locust `
  -f simulation/locustfile.py `
  --host http://127.0.0.1:8000 `
  --users 10 `
  --spawn-rate 2 `
  --run-time 5m `
  --headless
```

Locust credentials and target IDs are supplied through environment variables:

```text
SIMULATION_CUSTOMER_USERNAME
SIMULATION_CUSTOMER_PASSWORD
SIMULATION_STORE_USERNAME
SIMULATION_STORE_PASSWORD
SIMULATION_STAFF_USERNAME
SIMULATION_STAFF_PASSWORD
SIMULATION_PUBLIC_VARIANT_ID
SIMULATION_ACTIVE_STORE_ID
```

The default Locust users do not perform financial mutations. Concurrency
scenarios are the separate authoritative race tests.
