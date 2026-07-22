# Architecture Baseline

**Baseline date:** 2026-07-18

## CURRENTLY IMPLEMENTED

### Technology stack

- Python with Django. `Torob_Phone/settings.py` was generated with Django 5.0.6; the available runtime reports Django 6.0.2, so the repository does not currently pin its Django version.
- Django’s built-in development server interfaces: WSGI and ASGI entry points are both present.
- SQLite is configured as the default database, stored at `db.sqlite3` in the repository root when created.
- No dependency manifest (`requirements*.txt`, `pyproject.toml`, Pipfile, or equivalent) exists.

### Repository structure

```text
Torob_Phone/
|- manage.py                 Django management entry point
|- Torob_Phone/              Django project configuration package
|  |- settings.py            Settings and SQLite database configuration
|  |- urls.py                Root URL configuration
|  |- asgi.py / wsgi.py      Deployment entry points
|- docs/                     Architecture, decisions, and roadmap
|- AGENTS.md                 Canonical collaboration rules
|- RULES.md                  Engineering boundaries
`- WORKFLOW.md               Task Group workflow
```

The `catalog` Django application implements the first product-domain layer. It contains canonical catalog models, its initial migration, an import management command, and catalog tests. There are still no application API endpoints, serializers, templates, static assets, search, recommendation, LLM, store, offer, or price-history modules.

### Request and data flow

The only configured route is `/admin/`, delegated to Django’s built-in admin site. The implemented catalog flow is:

```text
data/clean_data.json
    -> python manage.py import_catalog
    -> ImportRun and SourceRecord provenance
    -> validated typed catalog records
```

The importer writes `DataSource`, `Brand`, `DeviceModel`, `DeviceVariant`, typed specification profiles, camera systems/lenses, benchmark measurements, and `CanonicalFieldEvidence`. It is idempotent for unchanged source identities. The database is SQLite and is now populated locally through the Django migrations and import command; `db.sqlite3` remains an untracked local development artifact.

The `catalog.filtering` module provides internal, deterministic hard-constraint filtering. It accepts a typed `FilterRequirements` object and returns neutral-order `DeviceVariant` candidates. Variant requirements (RAM and storage) are applied directly to a configuration; model-level requirements join the relevant canonical specification profile. It starts from available, catalog-eligible variants, so an unconstrained request does not introduce feature phones into the smartphone candidate pool.

### Database and external integrations

SQLite remains suitable for this local-development baseline. There is no environment-specific database configuration, dependency declaration, external service integration, LLM integration, search system, or API. The repository includes source collection/normalization scripts and the approved `data/clean_data.json` dataset; the importer treats that file as source evidence, not the canonical query surface.

### Testing and validation

The `catalog` app has a Django test suite covering dataset loading, idempotency, null handling, feature phones, duplicate source URLs, invalid optional data, variant uniqueness, and versionless benchmark measurements. Django’s built-in test runner is used; no linting or type-checking configuration was found.

### Architectural boundaries already present

The project package owns configuration and routing only. The `catalog` app owns persisted product facts and their import/provenance boundary. Future business functionality should be added in dedicated Django apps rather than placed in `Torob_Phone/settings.py`, the root URL module, or the catalog importer.

## PLANNED / FUTURE

The repository has no implementation for store offers, search, scoring/ranking, explanations, or a user-facing conversation/API. It implements catalog import, deterministic hard-constraint filtering, and an internal LLM query-translation boundary only.

TG-002 defines the canonical data design in `docs/CANONICAL_DATA_ARCHITECTURE.md`. TG-003 implements its catalog, typed specifications, source provenance, and import portions; commercial offers and derived recommendation features remain future work.

The filtering layer supports identity, variant, performance, display, battery, camera, connectivity, physical, and software constraints defined by `FilterRequirements`. A specified constraint requires a known matching value: `NULL` never satisfies numeric, boolean, or categorical hard constraints. Wi-Fi and IP-rating constraints use explicit ordered comparators, while the returned ordering is not a recommendation ranking.

`catalog.query_service.QuerySetModificationService` holds the latest validated QuerySet in process memory and routes it through a strict validator, normalizer, adapter, and the existing filter. `catalog.llm_provider.GapGptProvider` is a GapGpt-compatible client configured only through `GAPGPT_API_KEY`, `GAPGPT_BASE_URL`, and `GAPGPT_MODEL`. It has no database access and does not select products. The full support/unsupported matrix is documented in `docs/QUERY_SET_SUPPORT.md`.

For local manual testing, `interactive_catalog_search.py` starts an in-memory console loop over this same service. It accepts credentials as command-line parameters, displays the validated QuerySet and matching variants after each prompt, and offers local `/state`, `/reset`, and `/quit` commands.

When approved in future Task Groups, these concerns should be introduced incrementally in dedicated modules/apps with clear boundaries:

```text
external data -> normalization -> product and offer domain
                              -> deterministic filtering and ranking
                              -> API / search / conversational interfaces
```

LLM-assisted interpretation and explanation should remain an interface layer around a deterministic, data-backed core. The specific app layout, database migration strategy, API framework, and production deployment approach are deliberately undecided until a Task Group requires them.

## Foundation assessment

The current layout is appropriate as a clean Django starting point. No major architectural change is warranted in this Task Group. The main foundation gaps are expected for a starter project: dependency versions are not reproducible, no application/test package exists, and the development defaults (`DEBUG=True`, checked-in development `SECRET_KEY`, SQLite) are not production-ready. These are recorded for later, scoped work rather than changed here.
