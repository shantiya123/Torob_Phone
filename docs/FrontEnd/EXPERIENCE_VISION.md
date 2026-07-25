# Torob Phone Experience Vision

**Status:** Approved experience direction  
**Product concept:** The Living Lens — از نیاز مبهم تا انتخاب دقیق  
**Visual theme:** Dark Precision — dark graphite/black with controlled radish-red focus  
**Language:** Persian, RTL  
**Scope:** Customer, Store, Staff, and public marketplace experiences

## 1. Product experience statement

Torob Phone should feel like an intelligent marketplace that brings a person’s unclear phone need into focus.

The user should be able to describe what they want naturally, watch Torobche turn that request into a backend-confirmed search state, inspect exact DeviceVariants, compare real Store Offers, and make a confident purchase without losing context.

The experience is cinematic where discovery deserves emotion, precise where commerce demands trust, and fast everywhere action matters.

## 2. Emotional goals

### Curiosity

The user should want to explore what Torobche can understand and how a vague request becomes a concrete phone choice.

### Confidence

The exact DeviceVariant, Store, price, availability, and historical order values must remain visible and understandable.

### Control

Users can continue the conversation, see the current saved QuerySet, refine it, reset it, and navigate normally. Motion never traps or overrides them.

### Anticipation

Search processing and meaningful transitions may create expectation, but they must never delay access to content or fake intelligence.

### Satisfaction

Important changes should settle visibly: a QuerySet update, an Offer reservation, and confirmed Store orders.

### Trust

The interface must communicate real backend state. It must not invent ratings, popularity, discounts, delivery estimates, analytics, price guidance, payment success, or Staff decisions.

## 3. Experience principles

### Make ambiguity visibly become structure

Torobche should show the difference between what the user said, what the backend saved as the current QuerySet, and which exact variants were returned.

### Preserve the object being followed

The selected DeviceVariant, its exact RAM/storage identity, Store, and price should remain connected across discovery, detail, basket, and checkout.

### Let motion explain relationships

Use reveal, align, transform, and settle to explain hierarchy, continuity, change, and confirmation. Remove motion that has no communicative purpose.

### Character brings warmth; evidence brings trust

Torobche can be playful and expressive. Product identity, Store data, prices, stock, wallet values, and orders must remain calm and exact.

### Make the important state impossible to miss

Active QuerySet changes, selected Offers, wallet totals, validation errors, and order status must have clear visual hierarchy, semantic text, and accessible focus.

### Give every role the right tempo

Customers receive expressive discovery. Store users receive efficient operational precision. Staff receive sober evidence-led review.

### Dark, not obscure

The dark theme creates atmosphere, but contrast, readable Persian typography, visible focus, and stable surfaces remain non-negotiable.

## 4. Brand personality

### Torob Phone

Premium, intelligent, focused, warm, and technically credible. It is not a generic ecommerce template or a neon AI experiment.

### Torobche

Torobche is a cute polished red radish with expressive eyes and leaves. He is curious, attentive, slightly playful, and honest about uncertainty. He does not claim to know or apply what the backend did not return.

The frontend controls Torobche’s appearance and animation. Django/AI controls his generated conversational content.

### Marketplace

The marketplace is clear, exact, and quietly confident. Real seller identity and exact variant relationships are more important than decorative commerce effects.

### Store workspace

Operational, controlled, dense enough for repeated work, and connected to the public identity without cinematic distractions.

### Staff workspace

Sober, evidence-led, and deliberate. Decisions feel consequential and confirmed, never playful.

## 5. Narrative journey

```text
Human need
    ↓
Conversation with Torobche
    ↓
Backend-confirmed QuerySet
    ↓
Exact DeviceVariant
    ↓
Real Store Offer
    ↓
Reserved Basket item
    ↓
Verified checkout
    ↓
Confirmed Store order(s)
```

The user’s transcript is a frontend session artifact stored in `sessionStorage`. The latest validated QuerySet is persisted by Django. Results always reflect the current backend response.

## 6. Signature moments

### Homepage intent field

The Homepage introduces natural-language discovery through large Persian typography, Torobche, a dark atmospheric field, and layered 2D phone imagery.

### Torobche interpretation

The submitted message moves into conversation history. Torobche enters a focused state. Abstract thought fragments organize during waiting, then only returned QuerySet fields resolve into the current-understanding rail.

### QuerySet delta

When a follow-up changes the search, unchanged fields remain stable while added, replaced, or removed backend-confirmed fields visibly update before results settle.

### Phone Portal

A selected 2D phone image can expand from a Torobche result into the Phone Variant hero using masking, scale, and shared layout. No fabricated 3D rotation is required.

### Offer Alignment

Different Stores align beneath the same exact DeviceVariant, making seller comparison visually explicit.

### Reservation Fold

When an Offer is successfully added, its Store, exact variant, price, and quantity fold into the Basket confirmation after backend success.

### Multi-Store confirmation

Checkout success separates the returned order array into actual Store-specific orders. The interface settles into factual confirmation rather than confetti.

### Store precision mode

Entering the Store workspace compresses the public atmosphere into a flatter, faster operational tool.

## 7. Motion intensity map

| Area | Intensity | Purpose |
|---|---|---|
| Homepage | Expressive | Introduce the product narrative |
| Torobche | Cinematic | Make interpretation and continuity memorable |
| Phone Variant | Expressive | Explain exact identity and Offers |
| Public Stores | Moderate | Establish Store context and browsing |
| Basket | Moderate | Communicate reservation and change |
| Checkout | Minimal–moderate | Protect financial clarity |
| Confirmation | Short expressive | Create satisfaction through certainty |
| Orders | Minimal | Support operational reading |
| Wallet | Minimal–moderate | Support financial trust |
| Account | Minimal | Make identity and session control easy |
| Store workspace | Operational | Optimize repeated work |
| Staff workspace | Minimal–moderate | Focus evidence and decisions |

## 8. Visual atmosphere

### Space and density

Public discovery uses generous space and layered depth. Commerce pages become denser as the user approaches a decision. Store and Staff pages prioritize efficient information scanning.

### Surfaces

Use obsidian backgrounds, graphite panels, soft charcoal separators, and occasional red focus surfaces. Red is a signal, not a permanent background.

### Product imagery

Phones are supplied as 2D `image_url` assets or local placeholders. Depth comes from masks, shadow, layered frames, controlled parallax, and focus transitions. The frontend must not scrape or invent phone images.

### Typography

Persian typography is structural. Large phrases establish mood; exact numbers for RAM, storage, prices, balances, and order totals remain stable and readable.

### Color

Warm white is primary text. Muted gray is secondary text. Radish red marks Torobche, selection, focus, important actions, and confirmed change. Status must never be communicated by color alone.

## 9. Torobche experience

Torobche is a living search session, not a generic chat box.

### Three page modes

1. **Character-first:** large Torobche and inviting composer before the first request.
2. **Interpretation:** Torobche is central while the backend processes the latest message.
3. **Result-first:** Torobche contracts while QuerySet and exact results become primary.

### Data truth

The transcript displays user messages and backend-generated Torobche messages. The QuerySet rail displays only the latest backend-confirmed state. Results are the exact DeviceVariants returned by Django.

### Backend-driven behavior

- `200`: resolve returned message, QuerySet, ordering, and results.
- `200` warning: show recovery while preserving valid state.
- zero results: show a constructive empty state.
- `400`: preserve input and map validation.
- `401`: restore session or route to login.
- `403`: show role denial.
- `409 torobche_context_required`: invite the user to establish context.
- server/network failure: preserve request and retry.

### Reset

`POST /api/search/reset/` clears the saved QuerySet to the canonical all-null state. After success, current results clear and a new-search boundary appears in the local transcript. Reset does not claim to delete permanent conversation history.

### Character technology

Rive is reserved for Torobche’s character acting because it supports expressive eyes, mouth, leaves, and state-machine blending. Motion for React controls surrounding layout and result continuity. CSS supplies masks, focus, and reduced-motion behavior. Codex owns production integration; Fable or an animator may explore and author the rig.

## 10. Trust and commerce

Trust comes from visible relationships:

```text
exact DeviceVariant
    +
real Store
    +
real Offer price and availability
    +
backend-confirmed basket/order state
```

Store identities remain attached to Offers. Basket prices preserve reservation-time values. Orders preserve historical values. Checkout does not claim wallet payment success until Django performs and confirms it.

## 11. Customer, Store, and Staff experiences

### Customer

Discovery is expressive; product identity is exact; commerce is calm; confirmation is factual.

### Store

The same focus language becomes a precision workspace: selected parent Phone → exact variant → Offer. Motion is fast and repeated actions never wait for spectacle.

### Staff

Evidence progressively comes into focus. Approval and rejection require confirmation and backend state. The character is absent by default.

## 12. Mobile experience

Mobile is a first-class composition:

```text
Torobche
↓
current QuerySet
↓
composer
↓
results
```

Use compact character stages, bottom sheets, vertical evidence, sticky summaries with safe-area padding, explicit pagination, and touch-equivalent feedback. Desktop spatial relationships become deliberate mobile sequencing.

## 13. Accessibility and reduced motion

The experience must support:

- keyboard navigation;
- visible focus;
- semantic headings and RTL reading order;
- live regions for search and mutation status;
- form labels and error associations;
- sufficient contrast;
- no hover-only information;
- reduced-motion preferences;
- slower devices and constrained networks.

Reduced motion preserves the same information and emotional quality through static Torobche poses, immediate QuerySet updates, short fades, stable layouts, and clear semantic feedback.

## 14. Anti-patterns

Torob Phone must avoid:

- generic neon gaming aesthetics;
- copying Torob, Digikala, Apple, or another brand;
- unskippable introductions;
- scroll hijacking;
- broken browser navigation;
- permanent floating Torobche;
- fake AI confidence;
- raw JSON in user interfaces;
- invented ranking, ratings, discounts, or payment success;
- 3D phone effects without 3D assets;
- motion that delays purchasing or editing;
- hover-only controls;
- inaccessible red/green-only status;
- cinematic Staff decisions;
- optimistic stock, wallet, order, or approval state.

## 15. Success criteria

The experience succeeds when:

1. Users understand that Torobche updates one living search rather than starting disconnected searches.
2. Users can distinguish their words, the saved QuerySet, and the returned results.
3. The exact DeviceVariant remains clear from discovery through purchase.
4. Real Store identity, price, availability, and historical order values are trustworthy.
5. Motion makes relationships and state changes easier to understand.
6. Store users can perform repeated work quickly.
7. Staff can review evidence without distraction.
8. Mobile and reduced-motion users receive an equally complete experience.
9. Unsupported backend capabilities are never faked in the interface.
10. The website feels distinctively Torob Phone after a short visit, without sacrificing usability or browser control.

## 16. Implementation boundary

This vision defines product experience and creative direction. Exact colors, typography tokens, spacing, component contracts, motion durations, API data architecture, tests, and implementation tasks belong in the subsequent design-system and architecture documents.
