# Torob Phone Frontend Data Architecture

**Status:** Approved data direction  
**Frontend:** TypeScript, React, Next.js App Router  
**Backend:** Django REST API as source of truth  
**Transport:** Native `fetch`  
**Authentication:** In-memory access token + HttpOnly refresh cookie

## 0. Contract reconciliation

The latest archive contains a stale endpoint-inventory/gap-register description that still labels refresh as body-token based and cookie/logout support as missing. The detailed authentication sections in `docs/FrontEnd/API_CONTRACTS.md`, `docs/TOROBCHE_API.md`, and `docs/POSTGRESQL_AUTH.md` describe the implemented behavior and are treated as canonical:

- login returns only an access token and sets the HttpOnly refresh cookie;
- refresh accepts the cookie with an empty body, rotates it, and returns a new access token;
- logout blacklists/clears the cookie and is idempotent;
- body-supplied refresh tokens are not accepted.

If the backend code and documentation later disagree, the verified runtime contract must be re-established before frontend implementation.

## 1. Data principles

- Django owns business truth.
- The frontend requests, presents, and submits user actions.
- The frontend never recreates filtering, ranking, pricing, stock, wallet, permission, or order rules.
- API response types describe contracts; they do not replace backend validation.
- Server data, UI state, and browser-session presentation remain separate.
- Unsupported backend capabilities must become explicit UI states, not fake frontend functionality.

## 2. Data flow

```text
Server Component or Client Feature
        ↓
Feature API service
        ↓
Typed API client
        ↓
Django REST API
        ↓
Normalized response/error
        ↓
Feature state and UI
```

Next.js Route Handlers are not a general API proxy or Backend-for-Frontend layer.

## 3. Project structure

```text
src/
├── lib/
│   ├── api/
│   │   ├── client.ts
│   │   ├── errors.ts
│   │   ├── auth-refresh.ts
│   │   └── types.ts
│   ├── auth/
│   ├── browser/
│   └── formatting/
├── features/
│   └── [feature]/
│       ├── api/
│       ├── hooks/
│       ├── schemas/
│       ├── state/
│       ├── types/
│       └── index.ts
└── types/
```

Shared technical infrastructure lives in `lib`. Domain API functions and types remain inside their owning feature.

## 4. Typed API client

The shared client owns:

- API base URL;
- JSON serialization;
- credentials/cookie behavior;
- authorization header;
- request cancellation;
- normalized response handling;
- one coordinated access-token refresh and retry;
- consistent error conversion.

It must not own:

- product filtering;
- ranking;
- price calculation;
- stock decisions;
- role authorization;
- order transitions;
- wallet mutations.

## 5. Authentication data flow

### Login

```text
POST /api/auth/login/
        ↓
access token returned to frontend memory
refresh cookie set by Django
        ↓
GET /api/auth/me/
        ↓
role-aware shell/destination
```

Never store the access token in `localStorage`, `sessionStorage`, URL parameters, or rendered HTML.

### Authenticated request

```http
Authorization: Bearer <access-token>
```

### Refresh

When a request receives an expired-token response:

1. coordinate concurrent callers so only one refresh runs;
2. call the cookie-based refresh endpoint;
3. store the new access token in memory;
4. retry the original request once;
5. if refresh fails, clear the session and route to login.

The refresh cookie is HttpOnly and never read by JavaScript.

### Logout

Call Django logout, clear the in-memory token, clear user-specific feature state, and return to the public shell. Logout is idempotent.

## 6. Session restoration

Protected routes begin in an intentional restoration state:

```text
unknown session
    ↓
refresh attempt
    ↓
GET /api/auth/me/
    ↓
authenticated role or login
```

Do not flash Guest navigation or redirect before restoration completes. Preserve only a validated safe `returnTo`.

## 7. State ownership

### Server state

Data returned by Django:

- DeviceVariants;
- Store data;
- Offers;
- Basket;
- Orders;
- Wallet;
- current user;
- QuerySet.

Server state is authoritative and replaced from responses after mutations.

### UI state

Temporary presentation state:

- open dialog/sheet;
- selected accordion;
- loading indicator;
- pending control;
- hover/focus;
- page mode;
- local form values.

### Browser-session state

The Torobche visible transcript is stored in browser `sessionStorage` because the current backend persists the latest QuerySet but not a full message-history resource.

Session transcript entries should contain:

```ts
type TranscriptEntry = {
  id: string;
  role: "user" | "torobche";
  text: string;
  createdAt: string;
  kind?: "message" | "warning" | "system";
};
```

Do not treat transcript state as authoritative search state.

## 8. Torobche data architecture

### Send message

```text
POST /api/search/
{ message: string }
```

The frontend sends the conversational message. It does not construct a strict QuerySet.

The response may include:

- backend-generated Persian `message`;
- complete validated `queryset`;
- ordering;
- pagination;
- DeviceVariant results;
- warning and warning code.

### Current state

```text
GET /api/search/state/
```

This restores the latest backend QuerySet and `has_active_filters`. It does not fabricate missing transcript entries.

The response may expose both `queryset` and the legacy `query_set` alias. The feature adapter should normalize both to one internal `querySet` field.

### Reset

```text
POST /api/search/reset/
```

On success, clear current QuerySet presentation and results. Keep the local transcript with a new-search boundary unless the user explicitly clears browser-session transcript state.

### Result truth

The frontend renders the returned result order and fields. It does not calculate relevance, minimum price, or unsupported filter effects.

## 9. QuerySet representation

The QuerySet rail is a presentation of backend-confirmed state.

```ts
type QuerySetView = {
  label: string;
  value: string;
  source: "backend";
  status: "active" | "changed" | "removed";
};
```

The `status` is UI presentation derived from comparing consecutive backend responses. It is not business logic.

Unsupported or un-applied request details must not become active chips.

## 10. URL-driven public data

Public search, ordering, and pagination belong in the URL:

```text
/stores?search=...
/stores/[storeId]/offers?page=2
/store/catalog?search=galaxy&page=2
```

Rules:

- send URL parameters to Django;
- let Django filter, order, and paginate;
- preserve browser back/forward;
- use returned `next` and `previous` values when pagination is provided;
- do not load an entire collection and filter it in the browser.

## 11. Feature API boundaries

Examples:

```text
features/auth/api/login.ts
features/torobche/api/search.ts
features/catalog/api/get-variant.ts
features/marketplace/api/get-offers.ts
features/basket/api/update-item.ts
features/orders/api/cancel-order.ts
```

Names should describe backend actions. Feature services normalize feature-specific responses but do not duplicate domain rules.

## 12. Forms and mutations

React Hook Form and Zod are used for standard and high-impact forms:

- login;
- registration;
- Store profile;
- Offer creation/editing;
- checkout;
- rejection reason when Staff API exists.

Zod provides immediate structure and UX validation. Django remains authoritative for permissions, business rules, stock, prices, uniqueness, order transitions, and final acceptance.

Mutations must:

- expose pending state;
- prevent duplicate submission;
- preserve user input on recoverable failure;
- update UI from the backend response;
- avoid optimistic financial, stock, wallet, order, or approval state.

## 13. Basket and checkout data

Basket totals, Offer quantity, reservation-time unit prices, and availability come from Django.

Adding an Offer reserves stock on the backend. Removing or changing quantity is confirmed through the returned response.

Checkout may create multiple Store Orders. The frontend must handle the returned array and must not assume one universal order ID.

Wallet deduction, final revalidation, and idempotency require the documented backend capabilities before the final purchase action is activated.

## 14. Wallet data

The current frontend can read:

- balance;
- transactions.

It cannot locally create a charge or purchase transaction. Charge controls must remain unavailable until an explicit Django endpoint exists.

Transaction type, signed amount, balance-after, and order reference are displayed from the API.

## 15. Error normalization

The API layer converts raw responses to:

```ts
type NormalizedApiError = {
  status: number;
  code?: string;
  detail?: string;
  fieldErrors?: Record<string, string[]>;
  kind:
    | "authentication"
    | "forbidden"
    | "validation"
    | "conflict"
    | "not-found"
    | "server"
    | "network"
    | "unknown";
  retryable: boolean;
};
```

Feature components render normalized errors. They do not inspect raw DRF response shapes in multiple places.

## 16. Cache and refetch strategy

Use native fetch and explicit feature state initially. Do not introduce TanStack Query or a custom global cache before repeated synchronization problems are demonstrated.

After a mutation:

- use the mutation response when authoritative;
- refetch the affected resource when necessary;
- do not invalidate unrelated pages broadly;
- preserve URL state and page context.

## 17. Security boundaries

- access token only in memory;
- refresh token only in HttpOnly cookie;
- credentials included deliberately for cookie endpoints;
- no sensitive account data in public metadata;
- no private-resource existence inference from frontend errors;
- backend authorization remains final;
- user-supplied and AI-generated text rendered safely as text.

## 18. Server Components and data

Public Server Components may call typed public API functions for SEO and initial rendering. Authenticated browser interactions use Client Components and the shared client/session flow.

Do not pass access tokens through props, URLs, or serialized page data.

## 19. Testing data behavior

Use Vitest for:

- response normalization;
- QuerySet view mapping;
- pagination helpers;
- auth refresh coordination;
- transcript serialization;
- form schemas;
- formatting.

Use MSW for:

- success;
- warning;
- empty;
- validation;
- unauthorized;
- forbidden;
- not found;
- conflict;
- server;
- network failures.

Use Playwright for:

- session restoration;
- Torobche follow-up and reset;
- phone discovery;
- Basket;
- checkout/error recovery;
- Store Offer management.

## 20. Implementation boundary

Codex may implement typed services, normalized errors, hooks, form schemas, session restoration, and feature state according to this document. It must not add a frontend business backend, construct unsupported QuerySet filtering, fake wallet mutations, or invent missing Staff/Store Offer contracts.
