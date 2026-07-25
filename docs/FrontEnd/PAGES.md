# Torob Phone Frontend Pages Architecture

**File:** `PAGES.md`  
**Status:** Approved page inventory and implementation contract  
**Frontend:** TypeScript, React, Next.js App Router  
**Backend:** Existing Django REST API  
**Language and direction:** Persian, RTL  
**Last consolidated:** July 25, 2026

---

## 1. Purpose

This document defines the approved frontend pages, routes, responsibilities, access rules, principal data dependencies, user flows, and shared page-state behavior for Torob Phone.

It must be read together with:

- `FRONTEND_BASE.md`
- `FRONTEND_TECH_STACK.md`

Those documents define the frontend boundaries and technical architecture. This document defines what pages exist and what each page is responsible for.

The Django backend remains the source of truth for:

- authentication and authorization;
- user roles;
- catalog data;
- phone and variant identity;
- search and recommendation behavior;
- Store eligibility;
- offers;
- prices;
- stock;
- baskets;
- orders;
- wallet balances and transactions;
- validation and business rules.

The frontend must not reproduce these rules.

---

## 2. Locked Domain Model

The frontend must preserve the following domain relationships:

```text
DeviceModel / Parent Phone
        |
        └── DeviceVariant
                |
                └── Store Offer
                        |
                        └── Basket Item
                                |
                                └── Order Item
```

A parent Phone groups related technical variants.

A `DeviceVariant` is an exact configuration, such as:

```text
Samsung Galaxy M47
8 GB RAM
128 GB storage
```

A Store Offer is the purchasable unit. It connects:

```text
Store + DeviceVariant + Price + Stock + Offer Description
```

Basket items must reference Store Offers, not generic Phones.

---

## 3. Roles

The frontend recognizes these user experiences:

- Guest
- Customer
- Store
- Staff

The backend is always the final permission authority.

### 3.1 Guest

A Guest may:

- view public pages;
- browse Stores and offers;
- view phone specifications;
- view Storefronts;
- access login and registration.

A Guest may not:

- use authenticated Torobche state;
- add offers to a Customer basket;
- checkout;
- view orders or wallet;
- manage a Store;
- review Store registrations.

### 3.2 Customer

A Customer may:

- use Torobche;
- view public marketplace pages;
- choose Store Offers;
- manage a basket;
- checkout using the wallet;
- view and cancel eligible orders;
- view account and wallet information.

A Customer may not manage a Store.

### 3.3 Store

A Store may:

- browse public pages;
- use Torobche for research;
- manage its Store profile;
- browse the operational phone catalog;
- create and edit offers for exact variants;
- view its own offers.

A Store may not purchase through Customer shopping pages.

### 3.4 Staff

Staff frontend scope is intentionally narrow.

Staff may:

- view Store registration reviews;
- inspect Store registration details;
- approve or reject registrations according to backend rules.

Django Admin remains separate.

---

## 4. Route Groups

Recommended App Router organization:

```text
app/
├── (public)/
├── (auth)/
├── (customer)/
├── store/
├── staff/
├── not-found.tsx
├── error.tsx
└── global-error.tsx
```

Route groups must not change public URLs.

---

## 5. Complete Approved Route Inventory

### 5.1 Public pages

| Route | Page |
|---|---|
| `/` | Homepage |
| `/torobche` | Torobche conversational discovery |
| `/phones/[variantId]` | Exact phone variant detail |
| `/stores` | Public Store directory |
| `/stores/[storeId]` | Public Storefront |
| `/stores/[storeId]/offers` | All active offers from one Store |

### 5.2 Authentication pages

| Route | Page |
|---|---|
| `/login` | Universal login |
| `/register` | Registration role selector |
| `/register/customer` | Customer registration |
| `/register/store` | Store registration |

### 5.3 Customer pages

| Route | Page |
|---|---|
| `/basket` | Basket |
| `/checkout` | Checkout |
| `/orders` | Customer order history |
| `/orders/[orderId]` | Customer order detail |
| `/orders/confirmation` | Order confirmation |
| `/wallet` | Wallet |
| `/account` | Customer account |

### 5.4 Store workspace pages

| Route | Page |
|---|---|
| `/store/dashboard` | Store dashboard |
| `/store/offers` | Store-owned offers |
| `/store/catalog` | Searchable operational phone catalog |
| `/store/catalog/[phoneId]` | Parent Phone and variant selection |
| `/store/offers/new` | Create offer; requires `variant` query parameter |
| `/store/offers/[offerId]/edit` | Edit Store offer |
| `/store/profile` | Store profile |

### 5.5 Staff pages

| Route | Page |
|---|---|
| `/staff/store-reviews` | Store registration review queue |
| `/staff/store-reviews/[reviewId]` | Store registration review detail |

**Total approved core routes: 26.**

There are no remaining core pages to design.

---

# 6. Shared Public Shell

The public shell is used by:

- Homepage
- Torobche
- Phone Variant Detail
- Store Directory
- Public Storefront
- Store Offers
- Login and registration pages where appropriate

## 6.1 Header

The header should provide:

- Torob Phone brand/logo;
- Homepage;
- Torobche;
- Stores;
- role-aware account action;
- Customer basket action;
- Store workspace action when authenticated as Store;
- Staff review action when authenticated as Staff;
- login/register actions for Guests.

The header must not show actions that the current role cannot perform.

Examples:

```text
Guest:
Home | Torobche | Stores | Login | Register

Customer:
Home | Torobche | Stores | Basket | Account

Store:
Home | Torobche | Stores | Store Dashboard

Staff:
Home | Stores | Store Reviews
```

Role awareness is for UX only. Django remains authoritative.

## 6.2 Footer

The first implementation should remain minimal:

- brand identity;
- short platform description;
- primary navigation;
- copyright;
- future legal links only when actual legal pages exist.

Do not add fake support, company, or social links.

---

# 7. Shared Store Workspace Shell

The Store workspace uses a private layout with:

- Store identity;
- dashboard navigation;
- catalog navigation;
- offers navigation;
- profile navigation;
- Store status indicator;
- public Storefront link;
- logout/account controls.

Recommended navigation:

```text
Dashboard
Catalog
My Offers
Store Profile
View Public Storefront
```

The current route must be clearly indicated.

---

# 8. Shared Staff Shell

The Staff shell should remain smaller than the Store shell.

Primary navigation:

```text
Store Reviews
Account / Logout
```

Do not expose catalog, wallet, order, or marketplace-management links unless the approved Staff scope changes.

---

# 9. Homepage

## Route

```text
/
```

## Purpose

Introduce the platform and guide users toward:

- Torobche phone discovery;
- Store browsing;
- selected marketplace content;
- authentication where required.

## Access

- Guest
- Customer
- Store
- Staff

## Main structure

```text
Homepage
├── Hero
├── Torobche primary call to action
├── Marketplace explanation
├── Selected phone/variant content when supported
├── Store discovery
└── Footer
```

## Hero

The hero should communicate that users can describe their needs naturally and receive phone suggestions.

Primary action:

```text
شروع گفتگو با تربچه
```

Destination:

```text
/torobche
```

Secondary action:

```text
مشاهده فروشگاه‌ها
```

Destination:

```text
/stores
```

## Featured content

Only show dynamic sections when supported by real backend data.

Do not invent:

- popularity;
- best-selling labels;
- ratings;
- discounts;
- trending phones.

Phone cards use the normalized `image_url` contract from TG011.

## Rendering

Mostly Server Components.

Interactive hero effects may use small Client Components.

---

# 10. Torobche

## Route

```text
/torobche
```

## Purpose

Provide authenticated conversational phone discovery using the existing backend search and saved QuerySet state.

Torobche is not a normal filter page.

## Access

- Customer
- Store

Guest behavior:

```text
/torobche
→ /login?returnTo=/torobche
```

Staff access is not part of the approved workflow.

## Main structure

```text
Torobche
├── Conversation area
├── Current search-state summary
├── Input composer
├── Variant result list
├── Pagination
└── Reset action
```

## Backend-driven behavior

Torobche uses existing search-state APIs conceptually equivalent to:

```text
POST search
GET search state
POST/DELETE search reset, according to backend contract
```

The frontend must use the exact implemented methods and paths.

## Results

Every result represents an exact `DeviceVariant`.

Result cards should show:

- image;
- brand;
- model;
- RAM;
- storage;
- relevant matched attributes;
- offer availability or price context when returned;
- link to `/phones/[variantId]`.

The frontend must not modify or reconstruct the QuerySet.

## Empty state

Explain how to improve the request without blaming the user.

## Reset

The reset action must explicitly clear the backend-saved search state.

## Loading

Use a conversational pending state and result-card skeletons.

Avoid displaying raw JSON.

---

# 11. Phone Variant Detail

## Route

```text
/phones/[variantId]
```

## Purpose

Show one exact `DeviceVariant`, its technical specifications, contextual Torobche explanation when available, and all active Store Offers.

## Access

- Guest
- Customer
- Store

Staff may view it as a public page if general public access is permitted.

## Core identity

This route represents a variant, not a parent Phone.

Required identity:

- brand;
- model;
- RAM;
- storage;
- other real variant differentiators;
- parent phone image;
- technical specifications.

## Main structure

```text
Variant Detail
├── Product overview
├── Phone image
├── Exact variant identity
├── Price range
├── Torobche explanation when context exists
├── Grouped technical specifications
├── Available Store Offers
└── Related navigation
```

## Image

Use:

```text
image_url
```

Fallback:

- local phone placeholder;
- no random substitute;
- no GSMArena page scraping;
- no broken-image browser icon.

## Torobche explanation

Show only when the backend has valid saved search context.

If no context exists:

- hide the section, or
- provide a simple link to Torobche.

Explanation failure must not break the page or purchasing flow.

## Specifications

Transform structured backend fields into readable Persian groups.

Examples:

- display;
- performance;
- camera;
- battery;
- connectivity;
- software;
- physical information.

Do not dump raw JSON.

Omit unavailable fields.

## Offers

Each card represents:

```text
Store + exact DeviceVariant + price + stock + description
```

Show:

- Store name;
- price;
- availability;
- offer description;
- Store link;
- Customer selection action.

Recommended default ordering is backend-controlled, normally lowest eligible price first.

## Role behavior

Customer:

- may select an offer;
- may add it to basket.

Guest:

- selection routes through login while preserving intent.

Store:

- may inspect offers;
- may not purchase.

## Backend dependencies

- variant detail;
- variant offers;
- optional contextual explanation;
- TG011 image URL.

---

# 12. Public Store Directory

## Route

```text
/stores
```

## Purpose

List publicly visible Stores.

## Access

Public.

## Main structure

```text
Store Directory
├── Heading
├── Optional search
├── Store grid/list
├── Pagination
└── states
```

## Store card

Show only public information:

- Store name;
- short description where available;
- public activity/status when meaningful;
- link to `/stores/[storeId]`.

Do not expose:

- legal registration information;
- private contact fields;
- review notes;
- rejection reasons;
- internal Staff data.

Do not display fake ratings or trust scores.

## Search and pagination

Use backend search and pagination only when supported.

Do not load all Stores and filter them in the browser.

---

# 13. Public Storefront

## Route

```text
/stores/[storeId]
```

## Purpose

Show public Store information and a preview of its recent active offers.

## Access

Public.

## Locked scope

The Storefront contains:

1. public Store information;
2. exactly the latest five active offers;
3. a button to see all Store offers.

## Main structure

```text
Storefront
├── Store public information
├── Latest five offers
├── View all offers
└── Footer
```

## Store information

Show:

- Store name;
- public description;
- meaningful public status if supplied.

Do not expose private or legal information.

## Latest offers

Display a maximum of five active offers, newest first according to the backend.

Each card shows:

- phone image;
- brand/model;
- exact variant;
- price;
- stock/availability;
- offer description preview;
- variant detail action.

## View all action

```text
مشاهده همه پیشنهادهای فروشگاه
```

Destination:

```text
/stores/[storeId]/offers
```

## Store owner behavior

When the authenticated owner views its own public page, it may see a non-public management shortcut.

Public content must remain identical.

---

# 14. Store Offers List

## Route

```text
/stores/[storeId]/offers
```

## Purpose

List all active Offers belonging to one Store.

## Access

Public.

## Main structure

```text
Store Offers
├── Store context header
├── Result count
├── Minimal filters
├── Offer grid/list
├── Pagination
└── states
```

## Offer cards

Show:

- phone image;
- phone and exact variant;
- price;
- availability;
- Store offer description;
- action leading to `/phones/[variantId]`.

Each variant remains a separate purchasable item.

## Filtering

Keep minimal:

- active/available behavior is backend-controlled;
- optional availability filter;
- optional price sorting only when supported.

Do not add a large specification filter panel.

## Pagination

Backend pagination is required.

No infinite scroll in the initial implementation.

---

# 15. Universal Login

## Route

```text
/login
```

## Purpose

Authenticate Customer, Store, or Staff through one login form.

## Access

Guest.

Authenticated users should be redirected to their appropriate destination or home/workspace.

## Fields

Use the exact backend login identifiers.

Typically:

- username or email;
- password.

Do not expose raw JSON input.

## Behavior

On success:

1. receive/store the short-lived access token in memory;
2. rely on the secure refresh cookie;
3. request the current-user profile;
4. route by preserved `returnTo` or role destination.

Default destinations:

```text
Customer → /
Store → /store/dashboard
Staff → /staff/store-reviews
```

## Errors

Map backend errors to understandable Persian text.

Do not reveal security-sensitive authentication details.

---

# 16. Registration Role Selector

## Route

```text
/register
```

## Purpose

Let a Guest select:

- Customer registration;
- Store registration.

This is a small navigation page, not a combined registration form.

Routes:

```text
/register/customer
/register/store
```

---

# 17. Customer Registration

## Route

```text
/register/customer
```

## Purpose

Register a Customer using the exact fields accepted by Django.

## Rules

- standard form controls;
- React Hook Form and Zod for UX validation;
- Django remains authoritative;
- no raw JSON textarea;
- successful registration routes to login or authenticated destination according to backend behavior.

Do not include Store-only fields.

---

# 18. Store Registration

## Route

```text
/register/store
```

## Purpose

Register a Store account and collect required Store registration information.

## Rules

- explain that Store activation may require Staff review;
- show only fields required by the backend;
- distinguish account credentials from Store information;
- after success, route to login or Store dashboard according to backend behavior;
- pending status must be clearly communicated.

Do not present internal approval fields.

---

# 19. Basket

## Route

```text
/basket
```

## Purpose

Show the Customer's selected Store Offers and prepare them for checkout.

## Access

Customer only.

Guest:

```text
/basket → /login?returnTo=/basket
```

Store and Staff cannot purchase.

## Main structure

```text
Basket
├── Basket items
├── Pricing summary
├── Wallet context
├── Checkout action
└── states
```

## Basket item

Each item must show:

- phone image;
- brand/model;
- exact variant;
- Store;
- current offer description where available;
- quantity;
- unit price;
- line total;
- availability;
- remove action.

## Quantity

Django validates:

- minimum;
- stock;
- offer activity;
- quantity changes.

The frontend must use the updated backend basket response as the authoritative total.

## Invalid offers

Unavailable or insufficient-stock items must remain visible with clear corrective actions.

Do not silently remove them.

## Wallet context

Show current wallet balance when available.

If insufficient:

- explain the issue;
- link to `/wallet`;
- do not invent payment alternatives.

## Checkout action

Destination:

```text
/checkout
```

---

# 20. Checkout

## Route

```text
/checkout
```

## Purpose

Perform final review and submit order creation through the wallet-based backend flow.

## Access

Customer only.

## Entry requirements

The backend must revalidate:

- authenticated Customer;
- non-empty basket;
- current prices;
- active offers;
- stock;
- wallet balance;
- order eligibility.

The frontend must not treat Basket-page state as final.

## Main structure

```text
Checkout
├── Order item review
├── Store/variant identity
├── Final backend total
├── Wallet balance
├── Validation messages
├── Confirm purchase
└── failure recovery
```

## Confirmation

The final action must clearly communicate that it creates an order and charges the wallet.

Prevent accidental duplicate submission.

## Success

Route to:

```text
/orders/confirmation
```

Pass only safe navigation state. The confirmation page should be able to recover using a returned order ID or backend lookup strategy.

## Failure

Keep the user on Checkout when possible.

Examples:

- price changed;
- offer inactive;
- stock insufficient;
- wallet insufficient;
- request failed.

Provide a direct corrective action.

Do not clear the basket on failed order creation unless Django has actually changed it.

---

# 21. Customer Orders

## Route

```text
/orders
```

## Purpose

Show the authenticated Customer's order history.

## Access

Customer only.

## Main structure

```text
Orders
├── Heading
├── Order list
├── Pagination
└── states
```

## Order card/row

Show:

- order identifier;
- created date;
- status;
- total;
- item count;
- detail action.

Do not infer order status presentation from frontend-only rules. Use backend status values mapped to approved Persian labels.

---

# 22. Customer Order Detail

## Route

```text
/orders/[orderId]
```

## Purpose

Show one Customer-owned order.

## Access

Customer owner only.

## Main structure

```text
Order Detail
├── Order identity
├── Status
├── Dates
├── Historical line items
├── Historical prices
├── Total
├── cancellation action when allowed
└── states
```

## Items

Show:

- phone image when available;
- phone/variant identity;
- Store identity;
- quantity;
- historical unit price;
- line total.

Do not replace historical order prices with current Offer prices.

## Cancellation

Show only when backend state permits.

Django must enforce cancellation eligibility.

---

# 23. Order Confirmation

## Route

```text
/orders/confirmation
```

## Purpose

Confirm successful order creation.

## Access

Customer.

## Content

Show:

- success state;
- order identifier when available;
- total;
- link to order detail;
- link to order history;
- optional continue-browsing action.

Do not use this page as proof of payment without a confirmed backend order response.

Refreshing the page must not create another order.

---

# 24. Wallet

## Route

```text
/wallet
```

## Purpose

Show Customer wallet balance, transaction history, and the approved demo charging flow.

## Access

Customer only.

## Main structure

```text
Wallet
├── Current balance
├── Charge controls
├── Transaction history
├── Pagination
└── states
```

## Charge presets

Approved demo amounts:

- 1,000,000
- 2,000,000
- 5,000,000
- 10,000,000
- custom amount when backend support exists

Use the project's currency unit consistently in the UI.

Do not add a real payment gateway without backend support.

## Backend requirement

Wallet charging requires an explicit backend endpoint. The frontend cannot update balances locally.

If the current backend remains read-only, the charge controls must not be implemented as fake successful actions.

## Transactions

Show:

- type;
- amount;
- date;
- resulting/contextual information returned by the backend.

---

# 25. Customer Account

## Route

```text
/account
```

## Purpose

Show the authenticated Customer's account identity and supported profile actions.

## Access

Customer.

## Content

Use fields returned by the current-user endpoint.

Possible content:

- username;
- email;
- role;
- account creation date when supplied;
- logout;
- links to wallet and orders.

Do not build unsupported editing forms.

Password change is excluded until a backend endpoint is approved.

---

# 26. Store Dashboard

## Route

```text
/store/dashboard
```

## Purpose

Provide a concise operational overview and navigation hub for Store users.

## Access

Store only.

## Main structure

```text
Store Dashboard
├── Store identity/status
├── Public Storefront link
├── Offer summary
├── Quick actions
└── important status messages
```

## Approved content

Show only metrics supported by efficient backend data.

Safe first version:

- Store status;
- number of owned offers when available;
- quick link to catalog;
- quick link to offers;
- quick link to Store profile;
- public Storefront link.

Do not invent revenue, conversion, views, or sales analytics.

---

# 27. Store-Owned Offers

## Route

```text
/store/offers
```

## Purpose

Let a Store manage its own Offers.

## Access

Store owner only.

## Main structure

```text
My Offers
├── Heading
├── Create-offer/catalog action
├── Offer list
├── pagination/filtering when supported
└── states
```

## Offer item

Show:

- phone image;
- phone/variant identity;
- price;
- stock;
- active state;
- description;
- edit action;
- deletion/deactivation action according to backend behavior.

## Create action

Primary route:

```text
/store/catalog
```

The Store must select a parent Phone and exact variant before creating an Offer.

---

# 28. Store Catalog

## Route

```text
/store/catalog
```

## Purpose

Provide a normal operational search over existing parent Phones.

This page is not Torobche.

## Access

Store only.

## Main structure

```text
Store Catalog
├── Search
├── Parent Phone grid
├── Pagination
└── states
```

## Search

URL-driven:

```text
/store/catalog?search=galaxy&page=2
```

Search at minimum:

- brand;
- model.

Django performs filtering and pagination.

## Parent Phone card

Show:

- `image_url`;
- brand;
- model;
- release date when available;
- variant count when returned efficiently;
- action to `/store/catalog/[phoneId]`.

Do not add parent-Phone creation.

## Backend contract

TG012 supplies the approved read-only Store catalog endpoint.

The frontend must use the exact implemented endpoint and field names.

---

# 29. Store Catalog Phone Detail

## Route

```text
/store/catalog/[phoneId]
```

## Purpose

Show one parent Phone and let the Store select an exact `DeviceVariant`.

## Access

Store only.

## Main structure

```text
Catalog Phone Detail
├── Parent phone identity
├── Image
├── Concise specifications
├── Variant list
├── Optional price guidance
└── create/edit actions
```

## Variants

Each variant card shows actual differentiators such as:

- RAM;
- storage;
- storage technology;
- region/SKU when present;
- availability.

## No existing Store offer

Action:

```text
ایجاد پیشنهاد فروش
```

Destination:

```text
/store/offers/new?variant=[variantId]
```

## Existing Store offer

When the API can identify an existing owned Offer:

```text
/store/offers/[offerId]/edit
```

Do not create duplicate Store/variant Offers.

## Price guidance

Only display when supplied by Django.

Possible values:

- active Offer count;
- minimum;
- maximum;
- average.

Missing guidance does not prevent Offer creation.

---

# 30. Create Store Offer

## Route

```text
/store/offers/new?variant=[variantId]
```

## Purpose

Create a Store Offer for one exact preselected `DeviceVariant`.

## Access

Eligible Store only.

## Required query parameter

```text
variant
```

If missing or invalid:

- show a clear state;
- route back to `/store/catalog`.

## Main structure

```text
Create Offer
├── Selected variant summary
├── Phone image
├── Price guidance when supported
├── Offer form
└── submission states
```

## Form

Use only backend-supported fields, expected to include:

- price;
- stock;
- offer description;
- active state if user-controlled.

The variant is not editable through free text.

## Success

Route to:

```text
/store/offers
```

or directly to the edit page when the created Offer ID is returned.

---

# 31. Edit Store Offer

## Route

```text
/store/offers/[offerId]/edit
```

## Purpose

Edit an Offer owned by the authenticated Store.

## Access

Owning Store only.

## Content

Show read-only variant identity and editable Offer fields.

Possible actions:

- update;
- activate/deactivate;
- delete when the backend supports deletion.

Do not allow changing the Offer to a different variant.

---

# 32. Store Profile

## Route

```text
/store/profile
```

## Purpose

Show and edit Store information supported by the backend.

## Access

Store owner only.

## Content

Separate:

- public Store fields;
- private registration/account fields;
- approval status;
- rejection/correction information when the backend returns it.

Public preview action:

```text
/stores/[storeId]
```

## Rules

Do not expose legal/private data on the public Storefront.

Do not allow frontend editing of Staff-controlled approval fields.

---

# 33. Staff Store Review Queue

## Route

```text
/staff/store-reviews
```

## Purpose

List Store registrations requiring Staff review.

## Access

Staff only.

## Main structure

```text
Store Reviews
├── filters/status tabs when supported
├── review list
├── pagination
└── states
```

## Review item

Show enough identity to make a navigation decision:

- Store name;
- applicant/account identity where permitted;
- submitted date;
- review status;
- detail action.

Do not expose unrelated marketplace data.

---

# 34. Staff Store Review Detail

## Route

```text
/staff/store-reviews/[reviewId]
```

The dynamic identifier may map to a Store registration or Store record according to the final backend contract.

## Purpose

Allow Staff to inspect registration information and make an approval decision.

## Access

Staff only.

## Main structure

```text
Review Detail
├── Store registration information
├── applicant information
├── submitted documents/fields when supported
├── current status
├── approve
├── reject with reason
└── audit/result feedback
```

## Rules

- require confirmation for decisions;
- rejection reason follows backend validation;
- avoid duplicate submission;
- route back to the review queue after success;
- backend enforces all decision permissions and state transitions.

---

# 35. Shared Loading States

Every data page must define loading behavior.

Use:

- route-level `loading.tsx` where appropriate;
- section skeletons;
- pending controls for mutations;
- preserved page context during partial refreshes.

Avoid:

- blank full-page transitions;
- blocking unrelated sections;
- generic spinners as the only feedback.

---

# 36. Shared Empty States

Empty states must reflect the real state, not errors.

Examples:

```text
No Stores exist
No Store offers
No Customer orders
Empty basket
No search results
No Store-owned offers
No catalog matches
No review requests
No wallet transactions
```

Each empty state should provide one relevant next action.

---

# 37. Shared Error States

Differentiate:

- authentication required;
- forbidden role;
- not found;
- validation error;
- conflict/business-rule error;
- network failure;
- server failure;
- partial-section failure.

Do not convert all failures into “not found.”

API error mapping belongs in the typed API layer or feature services, not duplicated across every page.

---

# 38. Not Found

Use:

```text
app/not-found.tsx
```

Examples:

- invalid public Store;
- invalid variant;
- invalid order after ownership-safe backend response;
- invalid Store catalog Phone;
- invalid Offer edit route.

Do not leak private-resource existence through differentiated unauthorized/not-found messages when the backend intentionally masks them.

---

# 39. Forbidden / Role Denial

Use a reusable role-denial state.

Examples:

- Store enters `/basket`;
- Customer enters `/store/catalog`;
- non-Staff enters `/staff/store-reviews`.

Provide a role-appropriate destination.

Do not rely on frontend denial as security.

---

# 40. Authentication Restoration

Because access tokens are stored in memory, protected routes must support an initial session-restoration state.

During restoration:

- do not flash Guest-only content;
- do not immediately redirect before attempting refresh;
- show a small authenticated-shell loading state;
- after failure, route to login with `returnTo`.

---

# 41. Phone Image Contract

TG011 is locked.

Normalized API field:

```text
image_url
```

Rules:

- belongs to the parent Phone/DeviceModel;
- variants inherit the parent image;
- may be null;
- `source.url` remains a source webpage and is not an image;
- Next.js must not scrape GSMArena;
- use a local placeholder when null or failed;
- explicitly allow known remote image hosts;
- do not use a wildcard remote host;
- do not imply the image reflects exact RAM/storage/color unless variant-specific image data exists.

Pages using phone images:

- Homepage phone cards;
- Torobche results;
- Phone Variant Detail;
- public Storefront offers;
- Store Offers List;
- Basket;
- Checkout;
- Orders;
- Store Catalog;
- Store Catalog Phone Detail;
- Create/Edit Offer summary;
- Store-owned offers.

---

# 42. Backend Task Group Dependencies

## TG011 — Phone image support

Locked and treated as part of the API contract.

Expected result:

```json
{
  "image_url": "https://..."
}
```

## TG012 — Store catalog browsing API

Locked and completed according to the user's current project state.

Expected capabilities:

```text
Store-authenticated parent Phone list
search
pagination
parent Phone detail
variant list
```

The frontend implementation must inspect the final TG012 response rather than assuming example field names.

---

# 43. Existing Backend Capabilities Not Included in Current Page Scope

The inspected backend includes Store order-management API concepts such as Store order lists/details.

However, Store order pages were not approved during the page-design process.

Therefore the following are deferred, not missing:

```text
/store/orders
/store/orders/[orderId]
```

Do not implement them in the initial frontend unless the product scope explicitly adds a Store fulfillment workflow.

Other deferred features:

- dedicated Offer detail route;
- Customer general phone catalog;
- favorites;
- comparison page;
- ratings/reviews;
- notifications center;
- similar-phone recommendations;
- Store analytics;
- real payment gateway;
- Store catalog creation;
- Staff marketplace management;
- public legal/static pages.

---

# 44. SEO and Metadata

Public indexable pages:

- Homepage;
- Phone Variant Detail;
- Store Directory;
- Public Storefront;
- Store Offers List.

Authentication and private workspace pages should not be indexed.

Dynamic public metadata must use real backend data.

Examples:

```text
Samsung Galaxy M47 8GB/128GB | Torob Phone
Mobile Center | Torob Phone
Offers from Mobile Center | Torob Phone
```

Do not place sensitive Store or account data in metadata.

---

# 45. Accessibility

All pages must support:

- keyboard navigation;
- visible focus;
- semantic headings;
- form labels;
- accessible error associations;
- meaningful button names;
- accessible pagination;
- dialog focus management;
- reduced-motion preferences;
- appropriate image alt text;
- sufficient contrast;
- Persian RTL reading order.

Status must not be communicated by color alone.

---

# 46. Responsive Behavior

The frontend is mobile-first.

Recommended broad behavior:

```text
Mobile:
single-column primary flow
bottom or compact actions
mobile navigation

Tablet:
two-column cards where useful

Desktop:
multi-column marketplace grids
sticky summaries where useful
workspace sidebars
```

Avoid desktop-only tables when mobile cards communicate the same data more clearly.

---

# 47. Animation

Motion should improve comprehension.

Approved uses:

- subtle page/section entrance;
- card hover;
- accordion transitions;
- pending/success feedback;
- Torobche typing effect;
- skeleton transitions;
- small list changes.

Avoid:

- heavy continuous effects;
- long blocking transitions;
- animation on every data refresh;
- decorative motion that slows Store workflows.

Respect `prefers-reduced-motion`.

---

# 48. Implementation Order

Recommended implementation sequence:

## Foundation

1. App Router layouts and route groups
2. design tokens and RTL foundation
3. typed API client
4. authentication/session restoration
5. role guards
6. shared states
7. shared image, card, pagination, and form components

## Public discovery

8. Homepage
9. Store Directory
10. Public Storefront
11. Store Offers List
12. Phone Variant Detail
13. Torobche

## Authentication

14. Login
15. Registration selector
16. Customer registration
17. Store registration

## Customer flow

18. Basket
19. Checkout
20. Order Confirmation
21. Orders
22. Order Detail
23. Wallet
24. Account

## Store flow

25. Store shell
26. Store Dashboard
27. Store Catalog
28. Store Catalog Phone Detail
29. Create Offer
30. Store Offers
31. Edit Offer
32. Store Profile

## Staff flow

33. Staff shell
34. Store Review Queue
35. Store Review Detail

## Completion

36. metadata and SEO
37. accessibility audit
38. responsive audit
39. error-state audit
40. API contract verification
41. end-to-end critical-flow tests

---

# 49. Critical End-to-End Flows

## Customer discovery and purchase

```text
/login
→ /torobche
→ /phones/[variantId]
→ select Store Offer
→ /basket
→ /checkout
→ /orders/confirmation
→ /orders/[orderId]
```

## Public Store browsing

```text
/stores
→ /stores/[storeId]
→ /stores/[storeId]/offers
→ /phones/[variantId]
```

## Store offer creation

```text
/login
→ /store/dashboard
→ /store/catalog
→ /store/catalog/[phoneId]
→ /store/offers/new?variant=[variantId]
→ /store/offers
→ /store/offers/[offerId]/edit
```

## Staff review

```text
/login
→ /staff/store-reviews
→ /staff/store-reviews/[reviewId]
→ approve/reject
→ /staff/store-reviews
```

---

# 50. Final Status

The page architecture is complete.

- Approved core routes: **26**
- Remaining core pages to design: **0**
- Next deliverable after this document: frontend implementation plan/task breakdown
- New pages must not be added without an explicit scope decision
- Existing approved pages must not be redesigned unless a verified backend conflict requires amendment
