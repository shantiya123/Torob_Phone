# Torob Phone

A full-stack phone marketplace platform — a Torob-style price comparison and multi-vendor shopping site for smartphones, with a Persian-language AI shopping assistant. Built as an independent production-track project with a Django REST API backend and a Next.js 16 frontend.

**Stack:** Django 5 · Django REST Framework · PostgreSQL · SimpleJWT · Next.js 16 · React 19 · TypeScript · Tailwind CSS 4 · Locust

---

## What it does

Torob Phone lets multiple independent stores list offers against a shared, normalized phone catalog, while customers search, compare prices across stores, and buy with a wallet-based checkout — plus an AI assistant ("Torobche") that turns natural-language requests into structured, deterministic product filters.

- **Shared catalog, independent offers.** One canonical `DeviceModel` / `DeviceVariant` catalog (imported and de-duplicated from scraped GSMArena data) that any number of stores can attach priced, stocked offers to — the core Torob-style price-comparison model.
- **AI search assistant, not an AI black box.** Natural-language queries go through an LLM (GapGPT, an OpenAI-compatible gateway) that is only allowed to emit a strictly validated `QuerySet` object; the actual filtering, ranking, and product selection stays in deterministic backend code. The LLM never touches the database or picks products directly — it's a translation layer with a typed contract, not a trusted oracle.
- **Real transactional commerce.** Basket reservations with expiry, atomic multi-store checkout, wallet-funded payments, idempotent order cancellation with stock/refund restoration, and store-side order and offer dashboards.
- **JWT auth done properly.** Access tokens in memory, refresh tokens as rotating, blacklistable, HttpOnly cookies, with Origin/Referer validation on refresh and logout — not the common "long-lived token in localStorage" shortcut.
- **A full Next.js frontend**, not just API endpoints: customer, store-owner, and staff experiences (auth, catalog browsing, basket, checkout, order history, wallet, store offer management, staff review queue) with RTL/Persian layout support.
- **A backend load-testing harness.** A dedicated `simulation` app drives realistic concurrent customer/store/staff traffic through Locust and custom concurrency scenarios to validate correctness (not just throughput) under contention — e.g. no oversold stock, no double refunds.

## Architecture

```
Torob_Phone/          Django project config (settings, URLs, health check)
accounts/              Custom user model, JWT auth (cookie-based refresh), registration
catalog/                Canonical product catalog, import pipeline, deterministic filtering,
                         GapGPT-backed search & personalized explanation endpoints
marketplace/            Stores, offers, staff store-approval workflow
shopping/                Basket reservations, atomic multi-store checkout, order lifecycle
wallet/                  Wallet balance, transaction history, demo charge endpoint
simulation/              Locust + scripted concurrency scenarios for load/correctness testing
FileCollect/             GSMArena scraper and spec-normalization pipeline (catalog data source)
frontend/                Next.js 16 / React 19 / TypeScript app (App Router)
docs/                    Architecture baseline, API contracts, decisions log, frontend specs
```

**Design principles applied throughout:**
- Strict domain boundaries — each Django app owns one concern (identity, catalog, offers, orders, money), with cross-app access only through defined services/serializers.
- Deterministic core, AI at the edges — filtering, stock, and pricing logic is plain, testable Python; the LLM only ever proposes structured intent that gets validated before it touches a query.
- Money and stock operations (checkout, cancellation, refunds) use `select_for_update()` and atomic transactions, with idempotency keys so retried requests can't double-charge or double-refund.
- Documentation-driven workflow: every feature slice ("Task Group") is specified in `docs/` before implementation, with an architecture decision log (`docs/DECISIONS.md`) and a living roadmap (`docs/TASK_GROUPS.md`).

## API surface

REST API under `/api/`, documented with drf-spectacular (OpenAPI schema + Swagger UI):

| Domain | Examples |
|---|---|
| Auth | `POST /api/auth/register/`, `login/`, `token/refresh/`, `logout/`, `me/` |
| Catalog & search | `POST /api/search/`, `GET /api/catalog/phones/`, `.../<id>/explanation/` |
| Marketplace | `GET /api/stores/`, `POST /api/offers/`, staff store-review/approve/reject |
| Shopping | `POST /api/basket/items/`, `POST /api/orders/`, `POST /api/orders/<id>/cancel/` |
| Wallet | `GET /api/wallet/`, `GET /api/wallet/transactions/`, `POST /api/wallet/charge/` |

## Testing

- **112** backend test functions across 5 Django apps (`catalog`, `marketplace`, `shopping`, `wallet`, `simulation`), covering permission boundaries, checkout atomicity, basket-expiration races, privacy rules, and staff dashboards.
- **119** frontend tests (Vitest + Testing Library + Playwright e2e) covering auth guards, API client contracts, and every major page/feature.
- Custom concurrency scenarios (`simulation/concurrency/scenarios.py`) exercise simultaneous checkout/cancellation to catch stock and refund races that ordinary unit tests miss.

## Production readiness

Deployed with Gunicorn + Nginx in front of Django and Next.js on a single-core/low-RAM Ubuntu VPS. Includes a `/health/` check endpoint, environment-driven settings (PostgreSQL required outside local dev — the app refuses to silently fall back to SQLite in staging/production), Docker Compose for local Postgres, and explicit `CORS_ALLOWED_ORIGINS` / `CSRF_TRUSTED_ORIGINS` configuration for the cross-origin frontend case.

## Getting started

**Backend**
```bash
cp .env.example .env      # set DB_ENGINE, DB_*, JWT cookie settings
docker compose up -d db   # local PostgreSQL
python manage.py migrate
python manage.py import_catalog   # load data/clean_data.json into the catalog
python manage.py test
python manage.py runserver
```

**Frontend**
```bash
cd frontend
pnpm install
cp .env.example .env.local
pnpm dev        # http://localhost:3000, expects the API at http://127.0.0.1:8000
pnpm check      # lint + typecheck + format + unit tests
```

## Why this project

Built to practice shipping a real multi-tenant marketplace end to end rather than a CRUD demo: concurrent stock and payment correctness, a security-conscious auth design, a typed boundary around an external LLM instead of trusting its output directly, and a load-testing harness to verify the correctness claims under contention — with a full production deployment on a resource-constrained VPS.