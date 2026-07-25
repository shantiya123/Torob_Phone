# Torob Phone Mobile Design Structure

**Status:** Approved mobile experience direction  
**Product concept:** The Living Lens — from ambiguous need to exact choice  
**Visual theme:** Dark Precision — graphite/black surfaces with controlled radish-red focus  
**Direction:** Persian RTL, touch-first, responsive, backend-driven

## 1. Mobile design rules

Mobile is an intentionally designed experience, not a compressed desktop layout.

The mobile priority order is:

```text
Understand context → perform the primary action → inspect exact data → continue
```

Use one-column flows, compact headers, bottom sheets, explicit pagination, sticky summaries where safe, and large touch targets. Hover is replaced by press/focus feedback. No important information depends on hover, pointer precision, or animated spatial relationships.

The same motion verbs apply:

- reveal;
- align;
- transform;
- settle.

Reduced-motion mode removes travel, parallax, light sweeps, and continuous character loops while preserving hierarchy and feedback.

## 2. Mobile public shell

Use a compact header with brand identity, a menu or role-aware action, Torobche, Stores, and Basket when applicable. Navigation must not consume the first screen of a product page.

Bottom sheets are used for secondary choices such as filters, Offer selection, sorting, and conversation history. They must have focus management, escape/close controls, and safe-area padding.

## 3. Homepage `/`

### Structure

```text
Compact header
Hero statement
Torobche
Primary Torobche CTA
Store browsing CTA
Vertical “how it works” narrative
Real phone content when supported
Store discovery
Footer
```

The hero prioritizes the Persian message, Torobche, and one clear action. 2D phone imagery is layered behind or beside the character; it never pushes the CTA below the first meaningful viewport.

The process narrative is vertical:

```text
۱. نیازت را بگو
۲. تربچه آن را مرتب می‌کند
۳. مدل و پیشنهاد دقیق را ببین
```

## 4. Torobche `/torobche`

### Mobile order

```text
Compact/large Torobche stage
Backend-generated response
Current QuerySet chips
Composer
DeviceVariant results
Conversation drawer
```

At first entry Torobche is large. After results arrive he contracts into a compact upper stage. Results become primary and the composer remains accessible without covering the last card.

The QuerySet appears as wrapped or horizontally scrollable read-only chips. A “show details” action opens a bottom sheet for the complete structured state.

The transcript is hidden behind a conversation drawer after results appear. The latest backend response remains visible above results. Older messages are collapsible.

### Mobile workflow

The submitted message remains in the local transcript. Torobche enters thinking only while the request is pending. When the backend returns, changed QuerySet fields receive a short red focus, then results update.

Reset calls the real reset endpoint. After success, the QuerySet and results clear, a new-search divider appears in the transcript, and the composer becomes primary.

### Input and keyboard

The composer expands to multiline, keeps submit visible, prevents duplicate submission, and adds safe bottom padding. The keyboard must never hide the latest response or final action.

## 5. Phone Variant Detail `/phones/[variantId]`

### Structure

```text
Compact header
Context/breadcrumb
2D phone image
Exact brand/model/RAM/storage
Primary Offer action
Torobche explanation when valid
Specification accordions
Store Offer cards
```

The image is flat but gains depth through a dark stage, soft red focus, masking, and layered shadow. The exact variant identity appears before long specifications.

A sticky bottom action opens Store Offer selection. It must not cover the phone identity or keyboard.

Specifications use accessible accordions. Offers remain attached to the exact variant identity at the top of the Offer section.

## 6. Public Stores

### `/stores`

Use a vertical Store list or compact grid. Search remains URL-driven. Cards show only public Store information and keep their action visible without hover.

### `/stores/[storeId]`

Order:

```text
Store identity
Description
View all Offers
Latest five Offers
```

The Store identity can compress into a sticky compact header during scrolling. The current backend must provide Store-scoped Offer data before latest-five content is implemented.

### `/stores/[storeId]/offers`

Use full-width Offer cards with image, exact variant, price, availability, description, and Variant-page action. Sorting/filtering opens a bottom sheet when supported. Use explicit pagination.

## 7. Authentication

### `/login`

```text
Compact brand
Small Torobche/brand illustration
Username
Password
Primary action
Registration link
```

Keep the form above the keyboard. Errors appear under their fields. The button uses press/focus feedback, not long animation.

### `/register`

Two large role cards: Customer and Store. Tap feedback immediately communicates selection.

### Registration forms

Use vertically grouped fields. Store registration separates account, Store, and legal information and clearly communicates pending review. Do not expose Staff-controlled fields.

Session restoration occurs before protected-shell rendering. Preserve safe `returnTo`.

## 8. Basket `/basket`

### Structure

```text
Basket header
Wallet balance
Offer cards
Sticky price summary
Checkout action
```

Offer cards prioritize exact variant, Store, price, quantity, total, and availability. Quantity changes and removal update only after backend confirmation.

The summary uses safe-area padding and never covers the last item. Invalid Offers remain visible with corrective actions.

## 9. Checkout `/checkout`

Use a sequential review:

```text
Items → Store groups → Wallet → Confirm
```

Expandable groups preserve exact variant, Store, quantity, and final backend values. The confirmation action enters a still, high-clarity state while submitting. No fake wallet deduction or success is shown until Django confirms the supported flow.

## 10. Confirmation `/orders/confirmation`

Show the actual returned orders as vertical Store-specific cards. The transition is short: one confirmed purchase resolves into separate real orders. Provide order detail, order history, and continue browsing actions.

## 11. Orders

### `/orders`

Use vertical order cards prioritizing Store, status, total, date, item count, and detail action.

### `/orders/[orderId]`

Use expandable sections for summary, Store, historical items/prices, and cancellation. Cancellation changes only after backend confirmation.

## 12. Wallet `/wallet`

Order:

```text
Balance
Charge controls when real backend support exists
Transactions
```

The balance panel may remain near the top while charge controls are visible. Transactions become readable cards. Never mutate balance locally.

## 13. Account `/account`

Use a vertical identity section followed by Orders, Wallet, supported email editing, and Logout. No unsupported profile forms. Logout returns to the public shell after backend confirmation.

## 14. Store mobile workspace

### Shell

Compact Store header with name/status and a menu or bottom navigation:

```text
Dashboard
Catalog
Offers
Profile
```

### Dashboard

Show status, public Storefront, Offers, Catalog, and Profile actions in operational order. Do not show unsupported analytics.

### Catalog

Use compact search and one-column/two-column parent-Phone cards. Explicit pagination. No infinite scroll initially.

### Catalog Phone Detail

Show parent identity and a vertical exact-variant list. The selected variant becomes a sticky summary before Offer creation.

### Offers

Use full-width Offer cards. Edit and delete actions open a bottom sheet. Exact variant identity remains visible.

### Create/Edit Offer

Use stacked fields, sticky selected-variant summary, visible validation, and a bottom action area. Variant identity is read-only; only backend-supported fields are editable.

### Profile

Use expandable sections for public Store details, contact information, approval status, and public preview. Logo upload follows the backend multipart contract.

## 15. Staff mobile workspace

### `/staff/store-reviews`

Use vertical review cards with Store name, applicant where permitted, date, status, and detail action. Filters open in a bottom sheet only when supported.

### `/staff/store-reviews/[reviewId]`

Use sequential expandable evidence:

```text
Store identity
Applicant
Business details
Legal information
Status
Decision
```

Approve/reject actions require clear confirmation. Rejection reason is mandatory when Django requires it. No optimistic status changes.

The current backend lacks these Staff endpoints; the mobile frontend must not simulate them.

## 16. Mobile interaction system

Touch replaces hover. Every action has an immediate pressed state, visible focus for keyboards, and a clear disabled/loading/success state. Light sweeps and travel are removed in reduced-motion mode.

Cards must not shift their text during interaction. Sticky actions must respect safe-area insets and never hide important content. Bottom sheets must manage focus and support keyboard dismissal.

## 17. Shared mobile states

Every route defines loading, empty, not-found, forbidden, validation, conflict, network, server-error, and partial-section failure states. Live regions announce search, result, mutation, and error changes.

## 18. Mobile implementation priorities

1. RTL shell, tokens, touch targets, safe areas, API client, and session restoration.
2. Torobche mobile stage, QuerySet chips, composer, drawer, and results.
3. Homepage, Variant Detail, Stores, authentication.
4. Basket, Checkout, Confirmation, Orders, Wallet, Account.
5. Store workspace.
6. Staff workspace after backend contracts exist.
7. Device/accessibility audit on mid-range Android and iOS widths.
