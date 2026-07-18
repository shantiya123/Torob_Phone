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

There are no Django application packages, models, migrations, serializers, views beyond Django admin routing, templates, static assets, API packages, test modules, or product-domain modules.

### Request and data flow

The only configured route is `/admin/`, delegated to Django’s built-in admin site. No application data flow has been implemented. With the default database configuration, Django framework tables will be created in SQLite only after migrations are run; no `db.sqlite3` file is currently tracked or present.

### Database and external integrations

SQLite is suitable for this empty, local-development baseline. There is no environment-specific database configuration, no dependency declaration, and no external service, LLM, scraping, search, or data-provider integration.

### Testing and validation

No tests or testing-tool configuration are present. Django’s built-in test runner is usable and currently discovers zero tests. No linting or type-checking configuration was found.

### Architectural boundaries already present

The project package owns configuration and routing only. Future business functionality should be added in dedicated Django apps rather than placed in `Torob_Phone/settings.py` or the root URL module. The existing project is a healthy Django starter, but it is not yet an application architecture.

## PLANNED / FUTURE

The repository contains no implementation for the intended product catalog, specifications, store offers, normalization, search, deterministic filtering/ranking, explanations, LLM interpretation, or conversation.

When approved in future Task Groups, these concerns should be introduced incrementally in dedicated modules/apps with clear boundaries:

```text
external data -> normalization -> product and offer domain
                              -> deterministic filtering and ranking
                              -> API / search / conversational interfaces
```

LLM-assisted interpretation and explanation should remain an interface layer around a deterministic, data-backed core. The specific app layout, database migration strategy, API framework, and production deployment approach are deliberately undecided until a Task Group requires them.

## Foundation assessment

The current layout is appropriate as a clean Django starting point. No major architectural change is warranted in this Task Group. The main foundation gaps are expected for a starter project: dependency versions are not reproducible, no application/test package exists, and the development defaults (`DEBUG=True`, checked-in development `SECRET_KEY`, SQLite) are not production-ready. These are recorded for later, scoped work rather than changed here.
