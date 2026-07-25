# Torob Phone Frontend Implementation Plan

**Status:** Approved implementation roadmap  
**Frontend:** TypeScript, React, Next.js App Router  
**Backend:** Django REST API  
**Reference documents:** `EXPERIENCE_VISION.md`, `DESIGN_SYSTEM.md`, `MOTION_SYSTEM.md`, `COMPONENT_ARCHITECTURE.md`, `FRONTEND_DATA_ARCHITECTURE.md`, `WEB_DESIGN_STRUCTURE.md`, `MOBILE_DESIGN_STRUCTURE.md`

## 1. Implementation principles

- Implement one coherent Task Group at a time.
- Codex does not reopen approved product or architecture decisions.
- Django remains the source of truth.
- Every Task Group produces a testable checkpoint.
- Screenshots and manual verification accompany visual work.
- Backend gaps are tracked explicitly and never faked in the frontend.
- Web and mobile are implemented from their separate structure documents.
- Motion is implemented as reusable primitives, not isolated page decoration.

## 2. Delivery statuses

```text
READY                 Requirements and backend contract are sufficient
BLOCKED               A required backend capability is missing
NEEDS CLARIFICATION   A material product or contract decision is unresolved
COMPLETE              Acceptance criteria and verification passed
```

## 3. Phase 0 — Contract and project preparation

### TG-F01: Frontend repository foundation

**Objective:** Create the Next.js App Router project foundation without implementing domain pages.

**Includes:**

- TypeScript;
- Tailwind and design tokens;
- RTL document configuration;
- linting and formatting;
- environment configuration;
- global error and not-found boundaries;
- route-group skeleton;
- image host configuration.

**Acceptance criteria:**

- app boots in development;
- Persian RTL rendering works;
- tokens are available to Tailwind/CSS;
- production environment variables are documented;
- no business logic is duplicated in the frontend.

### TG-F02: Typed API and error foundation

**Objective:** Implement the shared native-fetch client and normalized error model.

**Includes:**

- API base URL;
- JSON and multipart support;
- request cancellation;
- normalized DRF errors;
- pagination types;
- response parsing;
- one retry after coordinated refresh.

**Acceptance criteria:**

- representative success and error responses are typed;
- raw API errors do not leak into feature components;
- refresh coordination prevents multiple simultaneous refresh calls;
- retry occurs at most once.

### TG-F03: Authentication and session restoration

**Objective:** Implement login, cookie refresh, current user, logout, and protected-shell restoration.

**Includes:**

- in-memory access token;
- HttpOnly refresh-cookie flow;
- `/api/auth/me/`;
- role resolution;
- safe `returnTo`;
- public, Customer, Store, and Staff shell boundaries.

**Acceptance criteria:**

- access token is never stored in localStorage/sessionStorage;
- refresh sends an empty body and relies on the cookie;
- logout clears user state and returns to public shell;
- protected routes do not flash Guest content;
- failed restoration routes to login safely.

**Backend dependency:** Use the detailed cookie contract confirmed in the archive; do not follow the stale body-refresh inventory entry.

## 4. Phase 1 — Shared experience foundation

### TG-F04: Shared UI and state components

**Objective:** Implement accessible, tokenized primitives and common states.

**Includes:**

- buttons;
- fields;
- cards;
- dialogs/sheets;
- alerts/toasts;
- skeletons;
- pagination;
- empty/error/forbidden/not-found states;
- live status;
- PhoneImage and StoreLogo fallbacks.

**Acceptance criteria:**

- keyboard, touch, and reduced-motion behavior works;
- focus is visible;
- components have stable loading dimensions;
- image failures use safe placeholders;
- no hover-only action exists.

### TG-F05: Motion primitives and interaction states

**Objective:** Implement the shared motion vocabulary.

**Includes:**

- `focus-in`;
- `focus-out`;
- `align`;
- `expand`;
- `collapse`;
- `transfer`;
- `settle`;
- `error-recover`;
- hover/focus/pressed/loading/success states.

**Acceptance criteria:**

- components use semantic motion tokens;
- reduced-motion variants exist;
- transitions do not block navigation or mutations;
- motion performance is acceptable on a mid-range mobile device.

### TG-F06: Rive Torobche asset and integration shell

**Objective:** Integrate the authored Torobche character without connecting page business logic yet.

**Includes:**

- Rive asset loading;
- idle and fallback illustrations;
- state-machine inputs;
- offscreen/tab pausing;
- reduced-motion pose;
- asset failure fallback.

**Ownership:** Fable/animator authors the rig; Codex owns integration.

**Acceptance criteria:**

- character renders in dark theme;
- no permanent animation when hidden;
- static fallback works;
- React can map normalized states to Rive states.

## 5. Phase 2 — Public discovery

### TG-F07: Homepage

**Objective:** Implement the Torobche-centered Homepage from both web and mobile structure documents.

**Includes:**

- Dark Precision hero;
- Torobche CTA;
- Store CTA;
- “how it works” narrative;
- only backend-supported dynamic content;
- SEO metadata.

**Acceptance criteria:**

- hero is usable without animation;
- no unsupported featured/trending claims;
- web and mobile compositions are intentionally different;
- CTA transitions to Torobche without blocking navigation.

### TG-F08: Torobche

**Objective:** Implement the flagship conversational discovery page.

**Includes:**

- Character-first, Interpretation, and Result-first modes;
- sessionStorage transcript;
- `/api/search/`;
- `/api/search/state/`;
- `/api/search/reset/`;
- QuerySet delta presentation;
- backend message rendering;
- warnings, zero results, validation, auth, forbidden, and retry states;
- web side panels;
- mobile conversation drawer;
- paginated exact Variant results.

**Acceptance criteria:**

- frontend sends conversational messages, not invented strict QuerySets;
- returned `queryset`/`query_set` aliases normalize correctly;
- transcript and saved QuerySet remain separate;
- follow-up changes show only backend-confirmed deltas;
- reset clears state only after backend success;
- reduced-motion and keyboard flows are complete.

### TG-F09: Phone Variant Detail

**Objective:** Implement exact Variant identity, specifications, Torobche explanation, and Offers.

**Includes:**

- 2D image stage and fallback;
- exact RAM/storage identity;
- grouped specifications;
- contextual explanation;
- active Variant Offers;
- Phone Portal transition;
- Add Offer action.

**Acceptance criteria:**

- parent model and exact Variant are never confused;
- missing explanation does not break the page;
- `409 torobche_context_required` is handled as context, not a generic failure;
- Offer data remains backend-driven.

### TG-F10: Public Store pages

**Objective:** Implement Store Directory and Storefront experiences when the backend contract is available.

**Includes:**

- `/stores`;
- `/stores/[storeId]`;
- `/stores/[storeId]/offers`;
- Store identity room treatment;
- pagination;
- Store and Offer image fallbacks.

**Status:** Partially blocked.

**Backend dependency:** TG015 Store-scoped active Offer list and latest-five contract. Do not infer Offers client-side.

## 6. Phase 3 — Authentication and Customer commerce

### TG-F11: Login and registration pages

**Objective:** Implement universal login and Customer/Store registration forms.

**Includes:**

- `/login`;
- `/register`;
- `/register/customer`;
- `/register/store`;
- React Hook Form;
- Zod UX validation;
- backend field-error mapping;
- pending Store status communication.

**Acceptance criteria:**

- fields match Django contracts;
- Store legal and account sections are distinct;
- no raw JSON input;
- successful flows route according to backend behavior.

### TG-F12: Basket

**Objective:** Implement Customer Basket with authoritative Offer and reservation state.

**Includes:**

- retrieve;
- add;
- quantity change;
- remove;
- reservation feedback;
- invalid/insufficient stock state;
- wallet context.

**Acceptance criteria:**

- totals come from Django;
- no optimistic stock mutation;
- removal occurs visually only after confirmation;
- exact Store and Variant identity remains visible.

### TG-F13: Checkout

**Objective:** Implement final review and guarded purchase submission.

**Includes:**

- Store grouping;
- exact item review;
- wallet balance;
- final backend response;
- duplicate-submission protection;
- recoverable errors.

**Status:** Blocked for final payment activation.

**Backend dependencies:** TG016 wallet integration and TG017 final revalidation/idempotency. Until complete, do not present fake wallet charging or payment success.

### TG-F14: Confirmation, Orders, and Order Detail

**Objective:** Implement actual returned Store orders and historical order views.

**Includes:**

- `/orders/confirmation`;
- `/orders`;
- `/orders/[orderId]`;
- cancellation;
- historical prices;
- multi-Store confirmation.

**Acceptance criteria:**

- confirmation handles an array of returned orders;
- no invented aggregate order ID;
- historical values remain historical;
- cancellation updates only after backend confirmation.

### TG-F15: Wallet and Account

**Objective:** Implement read-only Wallet and supported Account actions.

**Includes:**

- balance;
- transaction history;
- `/account`;
- supported email edit;
- logout;
- unavailable charge state.

**Status:** Charge UI blocked until a charge endpoint exists.

## 7. Phase 4 — Store workspace

### TG-F16: Store shell and dashboard

**Includes:**

- Store layout;
- status;
- supported Offer summary;
- quick actions;
- public Storefront link.

**Acceptance criteria:** no unsupported analytics or actions are displayed.

### TG-F17: Store Catalog

**Includes:**

- `/store/catalog`;
- URL-driven search and pagination;
- parent Phone cards;
- `/store/catalog/[phoneId]`;
- exact Variant selection.

**Acceptance criteria:**

- TG012 fields are used exactly;
- no invented variant count, price guidance, or owned-offer match;
- mobile variant selection remains accessible.

### TG-F18: Store Offer management

**Includes:**

- owned Offer list;
- create Offer;
- edit Offer;
- permanent deletion confirmation;
- price, quantity, and description forms.

**Acceptance criteria:**

- selected Variant remains read-only;
- no unsupported active toggle;
- backend validation is mapped clearly;
- deletion is never optimistic.

### TG-F19: Store Profile

**Includes:**

- Store owner endpoint;
- editable fields;
- logo multipart upload;
- approval state;
- public preview.

**Acceptance criteria:** Staff-controlled fields remain read-only and public privacy boundaries are respected.

## 8. Phase 5 — Staff workspace

### TG-F20: Staff review queue and detail

**Objective:** Implement evidence-led Store review.

**Status:** Blocked.

**Backend dependency:** TG014 Staff permission, queue, detail, approve, reject, pagination, and rejection validation endpoints.

No local approval/rejection simulation is permitted.

## 9. Phase 6 — Quality and release

### TG-F21: Accessibility and reduced-motion audit

Verify:

- keyboard navigation;
- focus;
- RTL;
- contrast;
- live regions;
- dialogs/sheets;
- reduced motion;
- touch targets;
- image alt/fallback behavior.

### TG-F22: Responsive and performance audit

Verify:

- web layouts;
- mobile layouts;
- mid-range Android;
- slow network;
- image loading;
- Rive pausing;
- no layout shift;
- no blocked navigation.

### TG-F23: End-to-end critical flows

Cover:

```text
Guest browsing
Login/session restoration
Torobche search/follow-up/reset
Variant → Offer → Basket
Basket → Checkout failure recovery
Store catalog → Offer creation
Store Offer editing
Role denial
```

### TG-F24: SEO and production readiness

Verify:

- public metadata;
- no indexing for private pages;
- canonical image handling;
- environment configuration;
- error monitoring;
- deployment health checks.

## 10. Review checkpoint protocol

At the end of every Task Group, report:

- summary;
- completed tasks;
- files created/modified;
- tests executed;
- screenshots/manual verification;
- architectural decisions;
- deviations;
- risks/blockers;
- recommended next Task Group.

Stop after the report and wait for manual review before beginning the next Task Group.

## 11. Backend dependency order

Before enabling all intended flows, prioritize:

1. cookie authentication contract verification;
2. public Store-scoped Offers;
3. wallet charge and atomic checkout;
4. checkout final revalidation/idempotency;
5. Staff review API;
6. optional Store catalog price/owned-offer guidance;
7. optional dashboard metrics.

Frontend implementation can proceed on unblocked phases, but blocked actions must remain honest and visibly unavailable.
