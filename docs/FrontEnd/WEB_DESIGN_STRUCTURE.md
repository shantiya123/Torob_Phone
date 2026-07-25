# Torob Phone Web Design Structure

**Status:** Approved web/desktop experience direction  
**Product concept:** The Living Lens — from ambiguous need to exact choice  
**Visual theme:** Dark Precision — graphite/black surfaces with controlled radish-red focus  
**Direction:** Persian RTL, responsive, backend-driven, motion with purpose

## 1. Shared web rules

The web experience uses four motion verbs:

1. **Reveal** — make important information visible.
2. **Align** — connect related objects and relationships.
3. **Transform** — preserve context while changing page or mode.
4. **Settle** — stop motion after an important result is confirmed.

Use CSS for ordinary states, Motion for React for layout continuity and meaningful transitions, and Rive only for Torobche’s character. Do not use 3D phone models, WebGL, or permanent ambient motion in the initial product.

The global interaction system covers hover, keyboard focus, press, loading, success, and disabled states. Hover may add a focus edge, small surface lift, image clarity, or short light sweep. It must never be the only way to discover an action.

The backend remains authoritative. The web frontend must not invent ratings, discounts, popularity, delivery estimates, analytics, rankings, prices, wallet mutations, or review decisions.

## 2. Public shell

The shared public shell contains:

- Torob Phone identity;
- Home;
- Torobche;
- Stores;
- role-aware account action;
- Customer basket when applicable;
- minimal footer.

Dark graphite surfaces, warm-white Persian typography, and radish red for active focus define the shell. Navigation transitions are short and never block content.

## 3. Homepage `/`

### Purpose

Introduce natural-language discovery and guide users toward Torobche or public Store browsing.

### Structure

```text
Header
Hero: “از گوشی بعدیت چی می‌خوای؟”
Torobche CTA
Store browsing CTA
How the platform resolves a need
Real phone/variant content when supported
Store discovery when supported
Footer
```

### Experience

Torobche is large in the hero. A dark atmospheric field, layered 2D phone imagery, Persian typography, and a red focus surface create depth without pretending to show 3D assets. The “how it works” section is a single narrative: user need → structured understanding → exact variant and real Store Offers.

Dynamic cards use only real API data. No fake featured, trending, popular, rating, or discount labels.

### Motion level

Expressive: hero entry, CTA focus, narrative reveal, and transition into Torobche. Navigation, metadata, and footer remain calm.

## 4. Torobche `/torobche`

### Product model

Torobche is a conversational interface for one backend-owned saved QuerySet.

```text
User message → Django/AI update → saved QuerySet → related DeviceVariants
```

The frontend transcript is stored in `sessionStorage`. Django owns the latest validated QuerySet. The backend-generated Persian `message` is Torobche’s primary conversational response.

### Desktop composition

```text
Conversation history | Torobche stage | Current QuerySet
                                  ↓
                         DeviceVariant results
```

The initial mode is character-first. During a request it becomes interpretation mode. After results arrive it becomes result-first: Torobche contracts, the QuerySet stabilizes, and results become primary.

### Torobche states

Rive owns character acting for idle, greeting, attentive, submitting, thinking, understood, speaking, presenting, empty, warning, recovery, error, and reset. React maps real API state to those states.

The Radish Thought Garden uses abstract fragments during loading. Confirmed QuerySet fields appear only after the backend response.

### QuerySet and transcript

The transcript shows what the user and backend-generated Torobche said. The QuerySet rail shows what Django currently saved. Changed fields dim, update, receive a short red focus, and settle before results update.

Reset calls `POST /api/search/reset/`. Only after success does the QuerySet and result field clear. The local transcript remains visible with a new-search divider.

### Backend states

- `200`: resolve returned QuerySet and results.
- `200` with `llm_interpretation_unavailable`: show recovery warning and preserve valid state.
- zero results: valid empty state.
- `400`: preserve input and map validation errors.
- `401`: restore or route to login with safe `returnTo`.
- `403`: role-denial state.
- `409 torobche_context_required`: contextual prompt when relevant.
- server/network failure: preserve request and offer retry.

### Motion level

Cinematic for interpretation and result continuity; calm for controls, pagination, and errors.

## 5. Phone Variant Detail `/phones/[variantId]`

### Purpose

Make the exact purchasable DeviceVariant unmistakable and connect it to real Store Offers.

### Desktop structure

```text
Context/breadcrumb
2D phone image stage
Exact brand/model/RAM/storage identity
Torobche explanation when valid
Grouped specifications
Store Offer alignment field
```

The selected result image can expand into the hero through masking, scale, and shared layout. It never rotates as a fabricated 3D object.

Offers remain attached to the exact variant and show Store, price, availability, description, and action. The page does not show an explanation when there is no active Torobche context.

### Motion level

Expressive: image continuity, specification focus, Offer alignment, and reservation feedback. Price and purchase actions remain immediate.

## 6. Public Stores

### `/stores`

Directory with search, pagination, and Store cards using only public fields. Cards use a room-opening interaction: graphite surface separates, logo gains restrained red focus, and the Storefront action aligns.

### `/stores/[storeId]`

Storefront with Store identity, public description, latest five active Offers, and all-offers action. Store identity acts as a doorway into a distinct room within the same platform.

### `/stores/[storeId]/offers`

Store context remains visible while all active Offers are listed with exact variant, image, price, availability, and description. Use explicit pagination, not initial infinite scroll.

The current backend needs a Store-scoped public Offer contract before these dynamic Offer sections can be implemented.

### Motion level

Moderate: Store entry and Offer alignment are expressive; browsing remains fast.

## 7. Authentication

### Routes

```text
/login
/register
/register/customer
/register/store
```

Use a focused Dark Precision form surface. Login uses username and password. Registration separates Customer and Store roles. Store registration explains pending Staff review without exposing internal review fields.

Access tokens remain in memory. Refresh uses the HttpOnly cookie. Session restoration must complete before protected-shell routing. Preserve a safe `returnTo`.

### Motion level

Minimal–moderate: focus, validation, pending, and short route transitions only.

## 8. Basket `/basket`

Two-column layout: Offer items on the left, sticky summary and wallet context on the right.

Each item preserves Store, exact variant, reservation-time unit price, quantity, line total, availability, and description. Quantity and removal update only after backend confirmation. Invalid items remain visible with corrective actions.

Adding an Offer uses the Reservation Fold: exact Offer metadata travels into the basket confirmation.

## 9. Checkout `/checkout`

Group items by Store. Show final backend total, wallet balance, exact variants, quantities, and the explicit purchase action.

Before production activation, Django must support wallet deduction, final revalidation, and idempotency. The frontend must not simulate payment or claim success early.

Checkout uses a moment of stillness: ambient motion stops, total and balance become dominant, and the confirmation action remains clear.

## 10. Confirmation `/orders/confirmation`

Use the returned order array. Separate actual orders by Store with their real identifiers. Confirmed items settle into stable order cards. No invented universal order ID and no confetti.

## 11. Orders

### `/orders`

Operational history showing real order ID, Store, status, total, item count, and dates.

### `/orders/[orderId]`

Show historical line items, historical prices, Store, status, dates, and cancellation only when backend state permits. Never replace historical prices with current Offer prices. Cancellation changes only after backend confirmation.

## 12. Wallet `/wallet`

Balance is the visual anchor; transactions are a clear signed list. Charge controls remain unavailable or disabled until Django supports a real charge endpoint. Never mutate the balance locally.

## 13. Account `/account`

Show only fields returned by `/api/auth/me/`, supported email editing, Orders, Wallet, and real logout. Keep the page quiet and operational.

## 14. Store workspace

### Shell

Persistent sidebar: Dashboard, Catalog, My Offers, Store Profile, Public Storefront, Logout. Status remains visible.

### `/store/dashboard`

Show Store status, public link, supported Offer count, quick actions, and important status messages. Do not invent analytics.

### `/store/catalog`

URL-driven search and pagination over parent Phones. Cards show real image, brand, model, and release date.

### `/store/catalog/[phoneId]`

Show parent identity and exact variant selection. A RAM/storage matrix may be used visually while retaining an accessible normal list. Do not show price guidance or owned-offer matching unless returned.

### `/store/offers`

Dense, efficient owned-Offer list with exact variant, price, quantity, availability, description, edit, and delete.

### `/store/offers/new`

Read-only selected variant summary plus price, quantity, and description form. No invented active toggle.

### `/store/offers/[offerId]/edit`

Variant identity is read-only. Price, quantity, and description are editable. Delete is permanent and requires confirmation.

### `/store/profile`

Separate public Store fields, editable contact fields, approval status, and public preview. Logo upload uses backend multipart behavior.

### Motion level

Operational: fast focus, align, expand, and settle. No permanent Torobche character or cinematic loading.

## 15. Staff workspace

### `/staff/store-reviews`

Minimal review queue with Store name, applicant identity where permitted, date, status, and detail action.

### `/staff/store-reviews/[reviewId]`

Evidence path: account identity → Store information → legal profile → current status → decision. Approval and rejection require backend confirmation; rejection reason follows backend validation.

The current backend lacks the review queue/detail/decision endpoints, so the frontend must not simulate this workflow.

### Motion level

Minimal–moderate. Evidence receives focus; decisions remain sober.

## 16. Shared states

Every page defines loading, empty, not-found, forbidden, validation, conflict, network, and server-error states. Partial-section failure must not destroy unrelated page content.

All motion respects `prefers-reduced-motion`. Keyboard focus, semantic headings, RTL reading order, accessible live regions, and touch-equivalent actions are required.

## 17. Web implementation priorities

1. Shell, tokens, API client, auth restoration, and shared states.
2. Homepage, Torobche, Variant Detail, and public Store pages.
3. Authentication and Customer purchase flow.
4. Store workspace.
5. Staff workspace after backend contracts exist.
6. Accessibility, SEO, responsive audit, and critical end-to-end tests.
