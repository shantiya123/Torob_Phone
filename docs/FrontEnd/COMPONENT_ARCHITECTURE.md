# Torob Phone Component Architecture

**Status:** Approved component direction  
**Framework:** Next.js App Router, React, TypeScript  
**Styling:** Tailwind CSS with project tokens  
**Animation:** CSS, Motion for React, Rive for Torobche  
**Direction:** Feature-oriented, backend-driven, Persian RTL

## 1. Purpose

This document defines how the approved web and mobile experience becomes reusable production components. It prevents pages from becoming large monoliths and prevents shared components from importing business features.

The `app` directory composes pages. Feature modules own domain behavior. Shared components own only genuinely cross-feature presentation and infrastructure.

## 2. Project structure

```text
src/
├── app/
├── features/
│   ├── auth/
│   ├── torobche/
│   ├── catalog/
│   ├── marketplace/
│   ├── stores/
│   ├── basket/
│   ├── checkout/
│   ├── orders/
│   ├── wallet/
│   ├── account/
│   ├── store-workspace/
│   └── staff-reviews/
├── components/
│   ├── ui/
│   ├── layout/
│   ├── feedback/
│   ├── navigation/
│   └── imagery/
├── lib/
├── types/
├── config/
└── styles/
```

Feature folders are created when implementation begins. Empty architecture folders should not be generated merely for appearance.

## 3. App Router responsibilities

`app/` owns:

- route files;
- layouts;
- metadata;
- loading boundaries;
- error boundaries;
- not-found behavior;
- role-aware route composition.

Route pages remain thin. They fetch or receive page data, select a feature composition, and define page-level metadata. They do not contain large API clients, business rules, or animation implementations.

## 4. Server and Client Components

### Server Components by default

Use Server Components for:

- public page structure;
- public metadata;
- public Store and Variant data;
- static layout composition;
- non-interactive specification and content sections.

### Client Components only for interaction

Use Client Components for:

- forms;
- filters and URL interactions;
- authentication/session state;
- Basket mutations;
- Torobche;
- Rive and Motion animation;
- drawers, dialogs, sheets, and accordions;
- browser APIs such as `sessionStorage`;
- user-driven mutations.

Do not turn an entire page into a Client Component because one child needs interaction.

## 5. Shared components

### `components/ui`

Project-owned accessible primitives, added selectively:

- Button;
- Input;
- Textarea;
- Select;
- Tabs;
- Accordion;
- Dialog;
- Sheet;
- Dropdown;
- Tooltip;
- Toast;
- Skeleton;
- Alert;
- Pagination;
- Form field;
- Badge.

These components consume design tokens. Default shadcn styling must not define the brand.

### `components/layout`

- PublicShell;
- StoreShell;
- StaffShell;
- Header;
- Footer;
- Sidebar;
- MobileNavigation;
- PageContainer;
- Section;
- StickySummary.

### `components/feedback`

- LoadingState;
- EmptyState;
- ErrorState;
- ForbiddenState;
- NotFoundState;
- PartialError;
- InlineFieldError;
- LiveStatus;

### `components/navigation`

- Breadcrumbs;
- RoleNavigation;
- BackLink;
- Pagination;
- RouteTransitionBoundary.

### `components/imagery`

- PhoneImage;
- StoreLogo;
- ImagePlaceholder;
- LayeredImageStage;

`PhoneImage` owns fallback and accessibility behavior, not phone business logic.

## 6. Feature public APIs

Features are private by default. External code imports only from a feature’s public root export:

```text
features/torobche/index.ts
features/catalog/index.ts
features/basket/index.ts
```

Do not import another feature’s internal files. Avoid circular dependencies and indiscriminate barrel files.

## 7. Torobche architecture

```text
features/torobche/
├── api/
│   ├── search.ts
│   ├── state.ts
│   └── reset.ts
├── components/
│   ├── TorobchePage.tsx
│   ├── TorobcheStage.tsx
│   ├── TorobcheCharacter.tsx
│   ├── TorobcheThoughtGarden.tsx
│   ├── TorobcheTranscript.tsx
│   ├── TorobcheQuerySet.tsx
│   ├── TorobcheComposer.tsx
│   ├── TorobcheResults.tsx
│   ├── TorobcheConversationDrawer.tsx
│   └── TorobcheStates.tsx
├── hooks/
│   ├── useTorobcheSession.ts
│   └── useTorobcheTranscript.ts
├── schemas/
├── state/
├── types/
└── index.ts
```

### Responsibilities

- `TorobchePage`: coordinates feature state and composition.
- `TorobcheStage`: maps page mode to layout.
- `TorobcheCharacter`: passes normalized state and look values to Rive.
- `TorobcheThoughtGarden`: visualizes pending state without inventing QuerySet fields.
- `TorobcheTranscript`: displays sessionStorage transcript.
- `TorobcheQuerySet`: renders backend-confirmed state.
- `TorobcheComposer`: validates basic input and submits messages.
- `TorobcheResults`: renders exact returned DeviceVariants and pagination.

The feature owns normalization of `/api/search/` responses. Character animation does not own API logic.

## 8. Catalog and Variant components

```text
features/catalog/
├── components/
│   ├── VariantResultCard.tsx
│   ├── VariantIdentity.tsx
│   ├── VariantHero.tsx
│   ├── SpecificationGroups.tsx
│   ├── SpecificationAccordion.tsx
│   ├── ParentPhoneCard.tsx
│   ├── ParentPhoneHeader.tsx
│   └── VariantSelector.tsx
```

`VariantIdentity` is reused wherever exact RAM/storage identity must remain visible. It must not silently fall back to parent model identity when a differentiator is available.

`SpecificationGroups` displays returned data and omits unavailable fields. It does not invent derived specifications.

## 9. Marketplace and Store components

```text
features/marketplace/
├── components/
│   ├── OfferCard.tsx
│   ├── OfferRow.tsx
│   ├── OfferIdentity.tsx
│   ├── OfferAvailability.tsx
│   ├── StoreCard.tsx
│   ├── StoreIdentity.tsx
│   └── StorefrontHeader.tsx
```

An Offer component always preserves:

```text
Store + exact DeviceVariant + price + quantity/availability + description
```

Offer components do not calculate stock, ranking, price ranges, or seller trust.

## 10. Basket and checkout components

```text
features/basket/
├── components/
│   ├── BasketItem.tsx
│   ├── BasketList.tsx
│   ├── BasketSummary.tsx
│   ├── QuantityControl.tsx
│   └── ReservationFeedback.tsx

features/checkout/
├── components/
│   ├── CheckoutReview.tsx
│   ├── StoreOrderGroup.tsx
│   ├── WalletContext.tsx
│   ├── PurchaseConfirmation.tsx
│   └── CheckoutFailure.tsx
```

Basket components use backend responses as authoritative totals and quantities. Checkout components must support multiple returned Store orders and must not show payment success before backend confirmation.

## 11. Orders, Wallet, and Account components

```text
features/orders/
├── OrderCard.tsx
├── OrderStatus.tsx
├── OrderItems.tsx
├── OrderCancellation.tsx
└── OrderConfirmation.tsx

features/wallet/
├── WalletBalance.tsx
├── WalletTransactions.tsx
└── WalletChargeControls.tsx

features/account/
├── AccountIdentity.tsx
├── AccountLinks.tsx
└── LogoutAction.tsx
```

Order components display historical values. Wallet charge controls must remain unavailable until a real backend mutation exists.

## 12. Store workspace components

```text
features/store-workspace/
├── components/
│   ├── StoreStatus.tsx
│   ├── StoreDashboard.tsx
│   ├── CatalogSearch.tsx
│   ├── CatalogPhoneCard.tsx
│   ├── CatalogVariantList.tsx
│   ├── OwnedOfferList.tsx
│   ├── OfferForm.tsx
│   ├── OfferEditForm.tsx
│   ├── StoreProfileForm.tsx
│   └── PublicStorefrontLink.tsx
```

Workspace components are optimized for repeated actions. They do not display unsupported metrics, active toggles, price guidance, or owned-offer matches unless returned by Django.

## 13. Staff components

```text
features/staff-reviews/
├── components/
│   ├── ReviewQueue.tsx
│   ├── ReviewCard.tsx
│   ├── ReviewEvidence.tsx
│   ├── ReviewStatus.tsx
│   ├── ApproveAction.tsx
│   └── RejectAction.tsx
```

These components remain dormant or contract-gated until Django exposes the documented Staff endpoints. No local simulation of approval or rejection is allowed.

## 14. Responsive component strategy

Components share data contracts but may use different composition wrappers:

```text
Desktop: Sidebar + two-column composition + hover preview
Mobile: Compact header + single column + sheet/drawer + press feedback
```

Prefer CSS responsive variants for visual changes. Use separate components only when the interaction model genuinely differs, such as desktop Torobche side panels versus the mobile conversation drawer.

## 15. Motion integration

Motion should be attached to semantic components, not scattered through pages.

Examples:

- `VariantResultCard`: focus and Phone Portal continuity;
- `TorobcheQuerySet`: changed-field focus and settle;
- `ReservationFeedback`: Offer transfer after backend success;
- `CheckoutReview`: stillness before submit;
- `StoreStatus`: status settlement;
- `ReviewEvidence`: focused evidence section.

Every animated component must define a reduced-motion variant.

## 16. Data and mutation boundaries

Components receive typed data and callbacks. They do not directly implement business rules.

```text
Page/feature hook
    ↓
Feature API service
    ↓
Typed API client
    ↓
Django REST API
```

API services normalize errors. Components render normalized states and expose user actions.

## 17. Accessibility contracts

Reusable components must define:

- semantic element choice;
- accessible name;
- keyboard behavior;
- focus management;
- live-region behavior where needed;
- RTL reading order;
- reduced-motion behavior;
- touch target size;
- error association.

Dialogs, sheets, menus, and drawers must return focus appropriately.

## 18. Testing boundaries

### Unit

Test schemas, API normalization, QuerySet mapping, formatting, pagination, and motion-state mapping.

### Component

Use React Testing Library for visible behavior:

- submitting;
- validation;
- loading;
- success;
- error;
- forbidden;
- empty;
- keyboard behavior.

### End to end

Use Playwright for critical discovery, authentication, Basket, checkout, Store Offer, and error flows. Do not test every animation frame.

## 19. Naming and file rules

- folders/files: `kebab-case`;
- components: `PascalCase`;
- hooks: `useSomething`;
- schemas: `somethingSchema`;
- API functions: action-based names;
- one clear responsibility per file;
- avoid `helpers.ts`, `common.ts`, and `misc.ts`.

## 20. Implementation boundary

Codex may implement documented components, state mapping, API integration, responsive layouts, motion, tests, and accessibility. It must not redefine page purpose, backend rules, role permissions, visual direction, or unsupported capabilities without a new approved decision.
