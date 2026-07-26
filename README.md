# Torob Phone backend

## Database setup

PostgreSQL is the recommended database for shared development, staging, and production. Copy `.env.example` to a local `.env` or set the same environment variables in your shell. The application reads only `DB_ENGINE` plus the `DB_*` values; it does not parse `DATABASE_URL`.

For a local PostgreSQL service, run `docker compose up -d db`, set `DB_ENGINE=postgresql`, then run:

```powershell
python manage.py migrate
python manage.py test
```

`DB_ENGINE=sqlite` is an explicit lightweight local fallback. If `DJANGO_ENV` is `staging` or `production`, missing PostgreSQL configuration stops startup rather than silently selecting SQLite. No SQLite data is migrated automatically. For disposable development data, use Django `dumpdata`/`loaddata` only after checking fixture output for users, media references, and identifiers; a clean PostgreSQL database plus catalog import is the safer default.

## Authentication

`POST /api/auth/login/` returns `{ "access": "..." }` and sets the refresh token only in the HttpOnly `torob_phone_refresh` cookie. `POST /api/auth/token/refresh/` reads that cookie, rotates it, and returns a new access token. `POST /api/auth/logout/` blacklists a valid refresh token and clears the cookie; it is idempotent.

Access tokens remain `Authorization: Bearer <access-token>` values and should remain in frontend memory. Refresh tokens are never returned in JSON and request-body refresh tokens are not accepted.

For the recommended same-site deployment, use HTTPS and `SameSite=Lax` or `Strict`. For a cross-origin frontend, set exact `CORS_ALLOWED_ORIGINS` and `CSRF_TRUSTED_ORIGINS`, set `JWT_REFRESH_COOKIE_SAMESITE=None` and `JWT_REFRESH_COOKIE_SECURE=true`, and never configure wildcard origins. Refresh and logout reject supplied Origins/Referers unless they are the API origin or listed as trusted.

Manual check: login with a cookie-aware client, call `/api/auth/me/` with its access token, refresh with an empty body and the cookie jar, then logout; the old refresh cookie must no longer work.

## Frontend

The production Next.js frontend lives in `frontend/` beside the Django
applications. FE001 establishes the App Router foundation, strict TypeScript,
Persian RTL layout, environment configuration, accessibility boundaries, and
quality tooling. Domain pages are implemented one approved frontend task group
at a time.

```bash
cd frontend
pnpm install
cp .env.example .env.local
pnpm dev
```

The local frontend runs at `http://localhost:3000` and the Django API at
`http://127.0.0.1:8000`. Run `pnpm check` for fast quality validation and
`pnpm build` for a production build.
