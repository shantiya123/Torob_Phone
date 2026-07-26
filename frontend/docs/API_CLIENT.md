# Torob Phone API Client

FE003 provides one transport layer under `src/lib/api` and transport contracts
under `src/types/api`. Feature code must use these exports instead of calling
`fetch` directly.

## Base URL

`NEXT_PUBLIC_API_BASE_URL` must be an HTTP(S) URL ending in one `/api` segment:

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000/api
```

The environment module removes trailing slashes and rejects invalid protocols
and accidental `/api/api` paths. No secret belongs in a `NEXT_PUBLIC_` value.

## Public and authenticated requests

Public Server Components may use the client for cache-configurable GET requests.
Authenticated interactive requests belong in the browser and use `auth: true`.
Authenticated SSR is intentionally not implemented: Server Components do not
automatically possess the browser refresh cookie.

The access-token provider is an in-memory interface. Tokens must never be stored
in localStorage, sessionStorage, IndexedDB, or JavaScript-readable cookies.

```ts
const client = new ApiClient({
  tokenProvider: createMemoryTokenProvider(),
});

await client.request("basket/", { auth: true });
```

## Refresh and retry

An authenticated request with an access token that receives `401` starts or
joins one shared refresh operation:

1. `POST /api/auth/token/refresh/`
2. empty body and `credentials: "include"`
3. validate `{ access }`
4. update the in-memory token
5. retry the original request exactly once

Refresh is never attempted for public requests, `403`, validation failures, or
requests without an access token. A failed refresh clears the token and returns
a normalized `unauthenticated` error. The API layer never redirects.

## Errors

`ApiError` normalizes authentication, permission, not-found, validation,
conflict, rate-limit, network, timeout, abort, server, and invalid-response
failures. DRF field arrays and `non_field_errors` remain available through:

```ts
getFieldErrors(error);
getErrorForField(error, "email");
getErrorMessage(error);
getPersianErrorMessage(error);
```

Backend `code`, `X-Request-ID`, and numeric `Retry-After` values are preserved
when available. Raw HTML, token values, cookies, and sensitive bodies are never
logged.

## Pagination and queries

`buildQuery` emits deterministic query strings. `paginationQuery` maps
`pageSize` to backend `page_size` and validates the backend maximum of 100.
Paginated transport values use `{count, next, previous, results}`.

## Cancellation and timeout

Pass a caller-owned `AbortSignal` for route changes, search replacement, or
unmount cleanup. A caller abort becomes `aborted`; the configurable timeout
becomes `timeout`. The default is 15 seconds. Neither is automatically retried.

## Idempotency and money

Wallet charge and checkout require a caller-supplied `Idempotency-Key`.
`createIdempotencyKey()` uses `crypto.randomUUID()`. The feature layer owns a
key's lifetime:

```text
same user action retry -> same key
new user action        -> new key
```

The generic client never automatically retries transactional mutations. Money
remains integer backend units. Critical Wallet and Checkout schemas reject
decimals and unsafe integers.

## Runtime validation

Zod validates high-risk shared boundaries: access-token responses, pagination,
public Store privacy, Wallet data, Wallet charge, Checkout, and safe integer
money. Larger catalog payloads remain strict TypeScript transport types because
the checked-in OpenAPI inventory contains stale sections and no generated schema
artifact is committed.

## Domain modules

Exports exist for authentication, public Stores, catalog, Offers, Basket,
Wallet, Orders, Store workspace, and Staff review endpoints. They expose
backend `snake_case` fields and ISO strings. Feature view models may map them
later.

## Testing

Vitest and MSW cover protocol behavior without a live Django server:

```bash
pnpm test:run
```

Playwright may use its managed Chromium in CI. Where the Playwright CDN is
blocked, local configuration can use installed Chrome or Edge without
hardcoding a Windows executable path.

## Prohibited usage

- raw `fetch` in pages or components;
- persistent access-token storage;
- reading or logging refresh cookies;
- automatic retries for financial or unsafe mutations;
- frontend-calculated authoritative totals;
- exposing Store legal/private fields through public contracts;
- logging request/response bodies for auth, Wallet, Checkout, Orders, Store
  legal data, or Staff review.
