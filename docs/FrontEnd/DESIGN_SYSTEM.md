# Torob Phone Design System

**Status:** Approved foundation  
**Experience concept:** The Living Lens  
**Theme:** Dark Precision  
**Direction:** Persian RTL, mobile-first, accessible, motion-ready

## 1. Purpose

This document defines the visual language shared by the web and mobile structures. It prevents individual pages or coding agents from inventing unrelated colors, typography, surfaces, spacing, or interaction patterns.

The Django backend remains the source of truth for business data. This system defines presentation, not business rules.

## 2. Design principles

- Dark surfaces create focus; they must not reduce readability.
- Radish red is a signal, not a permanent decoration.
- Exact product data receives stronger hierarchy than atmospheric effects.
- A component must work for mouse, keyboard, touch, reduced motion, and slower devices.
- Brand personality comes from composition and Torobche, not from excessive ornament.
- Web and mobile share tokens but use different compositions.

## 3. Color system

Exact values should be implemented as CSS variables and Tailwind tokens. The following roles are locked; final hex tuning must preserve contrast testing.

### Core surfaces

```text
--color-obsidian       Main page background
--color-graphite       Primary card and panel surface
--color-charcoal       Secondary surface and dense workspace panel
--color-slate          Quiet border, divider, and disabled surface
--color-elevated       Raised modal, drawer, and focused surface
```

### Brand and semantic colors

```text
--color-radish         Torobche and primary action
--color-radish-deep    Pressed, selected, or layered red
--color-radish-soft    Low-intensity focus atmosphere
--color-success        Confirmed backend success
--color-warning        Backend warning or recoverable issue
--color-danger         Destructive action or confirmed failure
--color-info           Neutral informational state
```

Semantic colors must never be the only status indicator. Pair them with text, icons, labels, or borders.

### Text

```text
--color-text-primary   Warm white for main content
--color-text-secondary Muted gray for supporting content
--color-text-tertiary  Low-emphasis metadata
--color-text-inverse   Dark text on light/high-contrast action surfaces
```

### Color behavior

- Radish red marks active focus, Torobche, primary actions, selected variants, and meaningful change.
- Red should not fill every card.
- Success should feel settled, not fluorescent.
- Danger should be reserved for actual destructive or failed states.
- Error and warning surfaces require readable text and icon support.

## 4. Typography

Use a Persian-first typeface with clear numerals and strong RTL readability. The implementation should choose a maintained Persian webfont with a system fallback stack.

Recommended stack:

```css
font-family:
  "Vazirmatn",
  "IRANSansX",
  "Tahoma",
  sans-serif;
```

### Type roles

```text
Display       Homepage and major Torobche statements
Heading       Page and section titles
Title         Product, Store, and panel identities
Body          Explanations and descriptions
Label         Form labels, chips, and status names
Numeric       Prices, RAM, storage, balances, order IDs
Caption       Metadata and supporting information
```

### Rules

- Persian text uses natural RTL flow.
- Latin model names, IDs, and numeric values must remain readable inside RTL layouts.
- Prices and technical quantities use stable tabular or clearly aligned numerals.
- Do not animate numbers continuously during ordinary loading.
- Do not use thin weights for important text on dark surfaces.
- Headings should express hierarchy without becoming oversized on mobile.

## 5. Layout and spacing

Use a consistent spacing scale rather than arbitrary margins.

```text
space-1  4px
space-2  8px
space-3  12px
space-4  16px
space-5  20px
space-6  24px
space-8  32px
space-10 40px
space-12 48px
space-16 64px
space-20 80px
space-24 96px
```

### Containers

- Public desktop content uses a centered max-width container.
- Torobche may use a wider stage container.
- Store and Staff workspaces use the available width beside navigation.
- Mobile uses safe horizontal padding and safe-area insets.
- Do not use full-bleed dark effects behind text without adequate contrast.

### Grids

- Public web product and Store content uses responsive grids.
- Operational pages may use dense lists or tables on wide screens.
- Mobile converts dense tables into readable cards or accordions.
- Do not introduce horizontal overflow as a substitute for responsive design.

## 6. Shape language

Use a disciplined combination of rounded surfaces and precise alignment.

```text
radius-sm   Small controls, tags, and fields
radius-md   Cards and standard panels
radius-lg   Hero surfaces, sheets, and prominent panels
radius-xl   Torobche stage and special focus surfaces
radius-full Pills, avatars, and circular controls
```

Avoid excessive pill shapes. A rounded shape must communicate control grouping or a friendly state, not decorate every element.

## 7. Elevation and depth

Depth is created through layers, not heavy shadows.

```text
Level 0  Flat page background
Level 1  Card separation and low shadow
Level 2  Raised panel, popover, or selected item
Level 3  Modal, drawer, or critical focus
```

Use soft low-opacity shadows and red atmospheric light only for meaningful focus. Avoid permanent glow around every interactive element.

## 8. Imagery

Phone imagery uses the normalized backend `image_url`. It may be null or fail.

Rules:

- use a local placeholder for null or failed images;
- never scrape GSMArena or another source in the frontend;
- never use a random substitute phone;
- allow only explicitly configured remote image hosts;
- do not imply that a parent image identifies exact RAM, storage, color, or region;
- support masked reveal, layered frames, shadow, and restrained parallax;
- do not rotate 2D images as if they were 3D models.

Store logos require safe fallbacks and must not determine arbitrary CSS or page themes.

## 9. Component foundations

### Buttons

Primary buttons use radish focus and clear action text. Secondary buttons use graphite surfaces and restrained borders. Destructive buttons use danger semantics and confirmation where appropriate.

Every button defines:

```text
default
hover
focus-visible
pressed
loading
success
disabled
```

Button width must not jump during loading.

### Inputs

Inputs use clear Persian labels, readable placeholder contrast, error association, and a visible focus ring. Focus may animate a border or short red alignment line, but it must remain visible without motion.

### Cards

Cards use surface separation, stable content layout, exact data hierarchy, and a short focus response. Hover must not be required to see the primary action.

### Chips and tags

QuerySet chips are read-only representations of backend-confirmed state unless a backend-supported action exists. Changed chips can receive a short red focus, then settle.

### Dialogs and sheets

Use project-owned accessible primitives. Manage focus, support escape/close controls, preserve RTL reading order, and provide reduced-motion transitions.

### Feedback

Use inline errors for fields, section errors for partial failures, page errors for unavailable routes, and live regions for important asynchronous changes.

## 10. Global hover and focus language

Hover is a restrained preview of focus:

- small surface separation;
- image clarity;
- red alignment edge;
- short underline reveal;
- directional icon movement;
- subtle light sweep only on prominent actions.

Keyboard focus must be at least as visible as hover. Touch uses immediate pressed feedback. No important content may be hover-only.

## 11. Motion tokens

Motion implementation belongs to `MOTION_SYSTEM.md`, but component design uses these semantic names:

```text
focus-in
focus-out
align
expand
collapse
transfer
settle
error-recover
```

Motion must not block navigation, purchasing, pagination, or form submission.

## 12. Torobche visual tokens

Torobche is a polished vector red radish:

- rich red body;
- restrained darker shading;
- green expressive leaves;
- readable eyes and mouth;
- no robot parts, neon circuitry, or permanent halo.

The character is large on the Torobche page and Homepage, compact on Variant Detail and confirmation feedback, and absent by default from Store and Staff workflows.

Rive owns character acting. React owns state mapping. CSS/Motion owns surrounding interface behavior.

## 13. Status and data presentation

Exact Variant identity must be visually stronger than parent model identity:

```text
Brand / model
RAM
Storage
Storage technology or region when returned
```

Prices, wallet balances, historical unit prices, and order totals use stable aligned numerals. Never replace historical order values with current Offer values.

## 14. Responsive rules

### Web

- spatial relationships may be shown side by side;
- sidebars and sticky summaries are appropriate;
- wide screens may use richer image stages and alignment lines;
- dense operational lists remain scan-friendly.

### Mobile

- use deliberate vertical sequencing;
- use bottom sheets for secondary controls;
- keep primary actions reachable;
- replace hover with press/focus;
- use cards and accordions instead of dense tables;
- respect keyboard and safe-area insets;
- never cover the last meaningful content with a sticky action.

## 15. Accessibility

Required across the system:

- semantic headings;
- keyboard navigation;
- visible focus;
- labels and error associations;
- sufficient contrast;
- RTL logical order;
- meaningful alt text;
- status not communicated by color alone;
- live regions for search, mutation, and error feedback;
- reduced-motion support;
- touch targets of practical size.

## 16. Implementation boundaries

Tailwind utilities should consume these tokens rather than invent page-specific colors. shadcn/ui is used selectively as accessible source code and must be restyled. Domain components remain in their feature modules.

The design system does not add unsupported backend functionality. Wallet charging, Store-scoped public Offers, Staff review actions, checkout revalidation, and idempotency require their documented Django contracts before their final UI actions are activated.
