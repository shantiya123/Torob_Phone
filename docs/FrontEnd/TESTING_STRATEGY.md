# Torob Phone Frontend Testing Strategy

**Status:** Approved testing direction  
**Frontend:** TypeScript, React, Next.js App Router  
**Tools:** Vitest, React Testing Library, MSW, Playwright  
**Principle:** Verify user-visible behavior and frontend boundaries without re-testing Django business logic

## 1. Testing goals

Testing should prove that:

- users can complete approved flows;
- backend data is represented accurately;
- backend errors are understandable;
- role boundaries are presented correctly;
- QuerySet and transcript state remain separate;
- motion never blocks important actions;
- web, mobile, keyboard, and reduced-motion experiences remain complete;
- unsupported backend capabilities are not faked.

No arbitrary 100% coverage target is required.

## 2. Testing layers

```text
Unit tests
    ↓
Component and feature tests
    ↓
API-mocked integration tests
    ↓
Playwright end-to-end tests
    ↓
Accessibility, responsive, visual, and performance audits
```

## 3. Unit testing

Use Vitest for deterministic logic:

- API response normalization;
- DRF error normalization;
- pagination and URL query helpers;
- QuerySet alias normalization (`queryset`/`query_set`);
- QuerySet visual delta mapping;
- transcript serialization and sessionStorage guards;
- authentication refresh coordination;
- safe `returnTo` validation;
- Zod schemas;
- currency/number/date formatting;
- role and route destination mapping;
- motion-state mapping;
- supported status-label mapping.

Do not unit-test Django filtering, stock calculations, wallet rules, permissions, or order transitions in the frontend.

## 4. Component testing

Use React Testing Library for visible behavior.

### Shared primitives

Test:

- keyboard focus;
- pressed and disabled states;
- loading dimension stability;
- dialog/sheet focus;
- escape and close behavior;
- form label/error association;
- reduced-motion rendering;
- touch-equivalent actions.

### Torobche

Test:

- Character-first, Interpretation, and Result-first modes;
- user message append;
- backend message rendering;
- QuerySet and transcript separation;
- returned `queryset`/`query_set` normalization;
- follow-up delta presentation;
- warning fallback;
- zero results;
- `400` field errors;
- reset only after successful backend response;
- session restoration from QuerySet and sessionStorage independently;
- mobile conversation drawer;
- keyboard submission and duplicate prevention.

### Catalog and Variant

Test:

- exact RAM/storage identity;
- missing image fallback;
- omitted unavailable specification fields;
- explanation success;
- `409 torobche_context_required`;
- Offer list states;
- Variant-to-Offer action.

### Basket and Checkout

Test:

- authoritative totals;
- quantity update pending/error/success;
- Offer removal only after backend success;
- invalid stock state;
- Store grouping;
- multiple returned orders;
- duplicate submission prevention;
- wallet-unavailable state;
- historical price rendering.

### Store and Staff

Test:

- Store status presentation;
- URL-driven catalog search;
- Variant selection;
- Offer form validation;
- permanent delete confirmation;
- profile field boundaries;
- Staff evidence sections and rejection reason when the backend contract exists.

## 5. API mocking with MSW

MSW provides realistic API responses without duplicating backend business logic.

Each feature must have representative handlers for:

```text
success
empty
loading/delayed response
validation error
401
403
404
409 conflict
500/server failure
network failure
warning response
```

### Torobche fixtures

Include:

- initial successful search;
- follow-up that adds a field;
- follow-up that replaces a field;
- reset success;
- zero results;
- `llm_interpretation_unavailable`;
- malformed input;
- saved state restoration;
- context-required explanation.

### Commerce fixtures

Include:

- multiple Stores in Basket;
- insufficient stock;
- reservation-time price snapshot;
- empty Basket;
- multiple returned Orders;
- cancellation with and without stock restoration;
- read-only Wallet;
- unavailable charge endpoint.

MSW fixtures must reflect documented response shapes, including nullable fields and pagination.

## 6. End-to-end testing with Playwright

Use a real test backend and test database where possible.

### Public discovery

```text
Homepage → Torobche
Stores → Storefront → Store Offers
Torobche → Variant Detail
```

Verify metadata and public access for indexable routes.

### Authentication

```text
Guest → Login → session restoration → role destination
Registration → validation → success state
Logout → public shell
```

Verify cookie-based refresh and no access token persistence in browser storage.

### Customer purchase

```text
Torobche search
→ follow-up
→ Variant
→ Offer
→ Basket
→ Checkout
→ multiple Store confirmation
→ Order detail
```

Until wallet and checkout backend gaps are closed, test guarded unavailable/failure states rather than pretending payment succeeds.

### Store workflow

```text
Login
→ Store dashboard
→ Catalog search
→ Parent Phone
→ Variant
→ Create Offer
→ Edit Offer
→ Delete confirmation
```

### Staff workflow

Run only after Django review endpoints exist:

```text
Login
→ Review queue
→ Review detail
→ Approve/reject
```

## 7. Accessibility testing

Automate and manually verify:

- semantic headings;
- labels and descriptions;
- keyboard-only navigation;
- visible focus;
- focus trap and return for dialogs/sheets;
- live-region announcements;
- RTL reading order;
- sufficient contrast;
- status not conveyed by color alone;
- meaningful image alt text;
- reduced-motion preference;
- touch target size.

Use automated tooling such as axe where appropriate, but do not treat automated accessibility output as a complete audit.

## 8. Responsive testing

Test at representative:

```text
small mobile
large mobile
tablet
desktop
wide desktop
```

Verify:

- no horizontal overflow;
- keyboard does not cover forms or Torobche composer;
- sticky actions respect safe areas;
- drawers and sheets fit;
- desktop sidebars become mobile navigation;
- dense lists become readable cards;
- phone images and exact identity remain visible.

## 9. Visual regression

Capture stable screenshots for:

- Homepage hero;
- Torobche character-first;
- Torobche result-first;
- QuerySet warning;
- Variant Detail;
- Storefront;
- Basket;
- Checkout stillness;
- Order confirmation;
- Store Catalog;
- Store Offer form;
- Staff evidence page when available;
- mobile equivalents.

Freeze time, mock network responses, and disable non-deterministic character loops during screenshot capture.

Visual tests verify hierarchy, spacing, contrast, and responsive composition—not exact animation frames.

## 10. Motion testing

Test behavior, not every frame:

- action remains usable during animation;
- response stops loading immediately when API returns;
- no transition blocks route navigation;
- reduced-motion output removes travel and continuous loops;
- Rive fallback renders if asset loading fails;
- offscreen/hidden-tab animation pauses;
- hover behavior has keyboard equivalent;
- failed mutations do not show success animation.

## 11. Performance testing

Measure:

- initial JavaScript and CSS;
- Torobche Rive asset size;
- image transfer and layout shift;
- interaction responsiveness;
- route transition cost;
- mobile memory and CPU;
- long-list rendering;
- slow network behavior.

Rules:

- lazy-load Rive where appropriate;
- pause offscreen and hidden-tab animation;
- animate transforms and opacity where possible;
- avoid full-page canvas/WebGL;
- use image dimensions and placeholders to prevent layout shift;
- do not add a server-state library without a demonstrated need.

## 12. Security and privacy tests

Verify:

- access token is not present in localStorage/sessionStorage;
- refresh cookie is HttpOnly;
- unsafe `returnTo` values are rejected;
- private page metadata is not indexable;
- raw backend errors and sensitive fields are not exposed;
- ownership-safe 404 behavior is preserved;
- AI text is rendered safely as text.

## 13. Test data and fixtures

Fixtures must use:

- exact Variant identities;
- nullable images;
- multiple Stores;
- varying Offer quantities;
- realistic order states;
- warning and error payloads;
- Persian messages;
- RTL and mixed Persian/Latin content.

Do not use fixtures that imply unsupported ratings, discounts, delivery, wallet charges, Staff decisions, or Store metrics.

## 14. CI quality gates

Every pull request should run:

1. TypeScript check;
2. lint;
3. unit tests;
4. component tests;
5. MSW integration tests;
6. critical Playwright flows;
7. accessibility checks;
8. build verification.

Visual and performance suites may run on the main branch or release candidate if their runtime is too expensive for every pull request.

## 15. Acceptance checklist

Before a Task Group is considered complete:

- success, empty, loading, validation, forbidden, not-found, conflict, server, and network states are covered where relevant;
- mobile and web behavior are verified;
- reduced motion is verified;
- backend response fields are mapped accurately;
- no unsupported functionality is simulated;
- critical interactions have keyboard coverage;
- screenshots or manual visual verification are recorded;
- no console errors or broken-image icons remain.

## 16. Testing ownership

- Codex writes and runs unit, component, MSW, and Playwright tests.
- Backend tests remain responsible for Django business rules.
- The product owner manually reviews screenshots, motion feel, Persian copy, and real-device behavior.
- New backend contracts require new fixtures and acceptance tests before frontend activation.
