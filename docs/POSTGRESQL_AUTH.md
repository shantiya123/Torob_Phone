# PostgreSQL and refresh-cookie authentication

## Database

The backend selects the database with `DB_ENGINE`. `postgresql` requires `DB_NAME`, `DB_USER`, `DB_PASSWORD`, and `DB_HOST`; `DB_PORT` defaults to `5432`. `sqlite` remains an explicit lightweight local-development fallback. With `DJANGO_ENV=staging` or `production`, omitting `DB_ENGINE` fails startup rather than silently selecting SQLite.

`psycopg[binary]` is the selected PostgreSQL driver. Existing migrations use Django-supported models, constraints, `JSONField`, and transactions; `select_for_update()` becomes real row locking under PostgreSQL, which is compatible with the existing stock reservation and order-cancellation transactions. No project migration was added for the engine switch. The SimpleJWT blacklist app contributes its own migrations when `migrate` runs.

For local PostgreSQL, `docker compose up -d db`, configure the variables in `.env.example`, then run `python manage.py migrate` and `python manage.py test`. Do not automatically transfer `db.sqlite3` data. For disposable development data, Django `dumpdata`/`loaddata` can be attempted only after reviewing fixture output for user identifiers and media references; a fresh database plus catalog import is safer.

## Cookie authentication

`POST /api/auth/login/` returns only `{ "access": "..." }` and writes the refresh JWT to the configured HttpOnly cookie. `POST /api/auth/token/refresh/` reads only that cookie, rotates it, and returns only a new access token. `POST /api/auth/logout/` blacklists a valid refresh token and clears the cookie regardless of validity; repeated logout succeeds.

Cookie settings are environment-configurable: `JWT_REFRESH_COOKIE_NAME`, `JWT_REFRESH_COOKIE_SECURE`, `JWT_REFRESH_COOKIE_SAMESITE`, `JWT_REFRESH_COOKIE_DOMAIN`, and `JWT_REFRESH_COOKIE_PATH`. The cookie path defaults to `/api/auth/`, its max age matches SimpleJWT’s refresh lifetime, and access tokens are never placed in cookies.

SimpleJWT refresh rotation and blacklist-after-rotation are enabled. Missing refresh cookies return `refresh_cookie_missing`; invalid, expired, or blacklisted cookies return `refresh_token_invalid`. Request-body refresh tokens are not accepted.

## Cross-origin and CSRF policy

The preferred topology is a same-site HTTPS frontend and API, using `SameSite=Lax` or `Strict`. Refresh and logout are POST-only and reject an Origin/Referer that is neither the API origin nor configured in `CORS_ALLOWED_ORIGINS`/`CSRF_TRUSTED_ORIGINS`. Requests with no Origin/Referer remain suitable for same-site command-line clients; browser cross-site POSTs include Origin and are rejected unless explicitly trusted.

For a cross-origin frontend, set exact `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS`, enable HTTPS, set `JWT_REFRESH_COOKIE_SAMESITE=None`, and set `JWT_REFRESH_COOKIE_SECURE=true`. Credentials are enabled, but wildcard origins are never configured.
