# Torob Phone Motion System

**Status:** Approved motion foundation  
**Experience concept:** The Living Lens  
**Visual theme:** Dark Precision  
**Direction:** Purposeful, accessible, backend-aware, RTL-friendly

## 1. Motion purpose

Motion in Torob Phone must do at least one of the following:

- direct attention;
- explain hierarchy;
- preserve continuity;
- communicate a real state change;
- provide feedback;
- create a short emotional moment.

Motion must never:

- delay purchasing or editing;
- hide important information;
- replace semantic status;
- fabricate AI understanding;
- hijack scrolling;
- break browser navigation;
- create avoidable layout shift;
- run continuously without purpose.

## 2. Motion vocabulary

The system uses four primary verbs:

### Reveal

Bring important content into view through opacity, mask, scale, or position.

### Align

Show that two objects belong together: a result and its Variant page, a Variant and its Offers, or a Store and its Offers.

### Transform

Change page mode while preserving context: discovery → detail, Basket → Checkout, or public shell → Store workspace.

### Settle

Stop motion once a backend-confirmed result becomes stable: QuerySet update, reservation, order, or review decision.

## 3. Timing tokens

Durations are defaults, not hard requirements. Real network latency must control data state; tokens only control presentation.

```text
motion-instant   80ms    Press/focus response
motion-fast      140ms   Small icon, border, or color change
motion-standard  220ms   Button, card, chip, and field state
motion-layout    320ms   Card/layout alignment
motion-emphasis  480ms   Significant reveal or transformation
motion-scene     700ms   Torobche or route composition
```

No ordinary control should use a scene duration. Long transitions are reserved for short signature moments and must remain interruptible.

## 4. Easing tokens

```text
ease-standard    Calm everyday interface motion
ease-emphasized  Entry and meaningful focus
ease-settle      Confirmation and final resting state
ease-exit        Dismissal and removal
ease-linear      Progress or light movement only
```

Avoid elastic or exaggerated bounce easing in commerce, Store, and Staff workflows.

## 5. Interaction states

Every interactive component defines:

```text
default
hover
focus-visible
pressed
loading
success
warning
error
disabled
```

Hover and focus may use a small surface lift, border alignment, image clarity, underline reveal, or directional icon movement. Keyboard focus must be equally visible without relying on motion.

Pressed states are immediate. Loading states preserve control dimensions and prevent duplicate submission. Success appears only after backend confirmation.

## 6. Shared motion primitives

### `focus-in`

Used when a result, QuerySet field, specification group, or primary action becomes important.

### `focus-out`

Used when an old state loses priority but remains valid.

### `align`

Used to connect a phone result to a Variant page, a Variant to Offers, or a Store identity to its Offer list.

### `expand`

Used for accordions, panels, drawers, and detail surfaces.

### `collapse`

Used for mobile Torobche contraction, compact headers, and completed context.

### `transfer`

Used when an Offer moves into Basket confirmation or a selected object travels between related surfaces.

### `settle`

Used after backend-confirmed success or state resolution.

### `error-recover`

Used when a recoverable warning or failure preserves the request and offers retry.

## 7. Route transitions

Route transitions preserve continuity but never prevent navigation.

### Public discovery

Use short fade/mask and shared image continuity when moving from result to Variant.

### Product detail

Use selected 2D image alignment, exact Variant identity continuity, and specification surface expansion.

### Public Storefront

Use a doorway-like surface transition from Store Directory into Store identity.

### Authenticated shell

Contract the public shell and expand the role-specific shell after session resolution. Avoid a flash of the wrong role.

### Store workspace

Use fast structural transitions. Do not carry cinematic public effects into repeated editing flows.

### Browser behavior

Back/forward navigation must work normally. View Transitions API may progressively enhance supported browsers; CSS/Motion fallbacks are required.

## 8. Torobche motion system

Rive owns the radish character’s performance. React owns API/state mapping. Motion and CSS own the surrounding page.

### Character states

```text
idle
greeting
attentive
submitting
thinking
understood
speaking
presenting
empty
warning
recovery
error
reset
```

### State mapping

```text
page entry             → greeting / idle
user typing            → attentive
message submitted     → submitting
request pending        → thinking
200 success            → understood → presenting
200 with warning      → recovery → presenting
zero results          → empty
400 validation        → error
401/403               → calm denial or redirect state
409 context required  → context prompt
5xx/network failure   → error + retry
reset success         → reset → idle
```

The animation cannot decide whether a request succeeded. It receives normalized state from the API layer.

### Thought Garden

Abstract fragments organize while the request is pending. They must not become readable claims until the backend returns confirmed QuerySet fields. The loop adapts to wait duration and stops immediately when a response arrives.

## 9. Torobche page modes

### Character-first

Large character, open stage, greeting, and composer.

### Interpretation

Submitted message, focused Torobche, abstract loading elements, and resolving QuerySet.

### Result-first

Compact Torobche, stable QuerySet, backend message, and exact results as primary content.

Follow-up requests temporarily return Torobche to interpretation without clearing existing results.

## 10. QuerySet and result motion

When a follow-up returns:

1. unchanged fields remain stable;
2. replaced values dim and leave;
3. new values enter;
4. changed fields receive a short radish focus;
5. results update and settle.

The frontend must never animate a field merely because it guessed it from the user’s message.

## 11. Commerce motion

### Add Offer

After backend success, use `transfer` for the Reservation Fold. Store, exact Variant, price, and quantity remain together.

### Basket quantity

Use an in-place number and line-total transition after the backend response. Do not optimistically change stock.

### Checkout

Use stillness before submission. Stop ambient motion, emphasize final total and wallet balance, and preserve the review while the request is pending.

### Confirmation

Use a short `settle` sequence. If multiple orders are returned, separate them by actual Store order, not an invented aggregate.

### Cancellation or deletion

Animate removal only after backend confirmation. Permanent Offer deletion requires confirmation.

## 12. Store and Staff motion

### Store

Use fast focus, align, expand, collapse, and settle primitives. Selected variants and changed Offer fields receive emphasis. No permanent Torobche animation.

### Staff

Use evidence focus lines, accordion expansion, deliberate confirmation, and short success settlement. Never use playful or cinematic decision effects.

## 13. Loading strategy

Loading motion communicates waiting without creating a false result.

- under 500ms: use immediate control feedback;
- 500ms–2s: use restrained pending state;
- longer waits: use contextual progress or Torobche thinking;
- response arrival: stop loading immediately;
- long delays: show honest status and preserve retry.

Skeletons should match the eventual layout and avoid page-wide blank states.

## 14. Reduced motion

When `prefers-reduced-motion: reduce` is active:

- remove continuous loops;
- replace travel with opacity or instant state changes;
- remove parallax, light sweeps, and thought particles;
- use static or minimally expressive Torobche poses;
- preserve focus, color, text, and layout hierarchy;
- keep live-region status and all functionality.

Reduced motion is not a disabled experience. It is a calmer equivalent experience.

## 15. Responsive motion

### Web

May use shared layout, controlled pointer depth, wider masks, and spatial relationships.

### Mobile

Use shorter distances, fewer simultaneous elements, bottom-sheet expansion, touch feedback, and no hover dependency. The keyboard must not trigger distracting layout choreography.

## 16. Performance budget

- one active Rive Torobche instance;
- lazy-load character assets;
- pause offscreen and hidden-tab animation;
- avoid full-screen canvas and WebGL in the initial product;
- animate transforms and opacity where possible;
- do not animate large layout properties continuously;
- keep interaction response immediate on mid-range mobile devices;
- provide static fallbacks for asset or animation failure.

## 17. Motion accessibility and testing

Test:

- keyboard focus and skip behavior;
- screen-reader status announcements;
- reduced-motion rendering;
- slow network and delayed backend response;
- duplicate submission prevention;
- route back/forward behavior;
- mobile touch and keyboard;
- mid-range Android performance;
- missing image and failed animation assets.

Do not test every animation frame. Test whether the user can perceive the intended state and complete the task.

## 18. Ownership

- Fable or a motion/character designer: explore signature compositions and author the Rive rig.
- Codex: implement React state mapping, Motion primitives, responsive behavior, accessibility, performance controls, and tests.
- Django: remain responsible for QuerySet, prices, stock, orders, wallet, permissions, and Staff decisions.

## 19. Anti-patterns

Avoid:

- scroll hijacking;
- unskippable transitions;
- infinite loading loops;
- fake typing delays;
- optimistic financial or stock feedback;
- animation on every data refresh;
- hover-only actions;
- decorative neon glow everywhere;
- full-page WebGL without a concrete product benefit;
- motion that obscures exact Variant identity.
