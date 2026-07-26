# Torob Phone Frontend Decisions

**Status:** Approved and locked for FE002  
**Date:** 2026-07-26  
**Scope:** Design tokens, shared primitives, accessibility, and handoff constraints  
**Product:** Torob Phone — “The Living Lens” / “Dark Precision”

## Source-of-truth hierarchy

1. Verified backend code
2. `API_CONTRACTS.md`
3. `PAGES.md`
4. `FRONTEND_BASE.md`
5. `FRONTEND_TECH_STACK.md`
6. This document
7. `EXPERIENCE_VISION.md`
8. `DESIGN_SYSTEM.md`
9. `MOTION_SYSTEM.md`
10. `COMPONENT_ARCHITECTURE.md`
11. `FRONTEND_DATA_ARCHITECTURE.md`
12. `FRONTEND_IMPLEMENTATION_PLAN.md`
13. Web/mobile design structures
14. Fable outputs

Backend truth always overrides visual intent.

## Locked color tokens

```text
page-background   #0B0D10
surface-primary   #15191F
surface-secondary #1D232B
surface-elevated  #252D36
surface-interactive #2D3742
border-subtle     #313A45
border-strong     #536170
text-primary      #F4F1EB
text-secondary    #C2C7CE
text-muted        #8E98A5
text-inverse      #111318
accent-radish     #E83E4F
accent-radish-deep #B82B3B
accent-radish-soft #5A2029
status-success    #3FB27F
status-warning    #D6A84F
status-danger     #E05A5A
status-info       #5C9FE8
focus-ring        #E83E4F
overlay           rgba(5, 7, 10, 0.76)
skeleton          #29313A
```

Important foreground/background pairs must meet WCAG AA. `text-inverse` on `accent-radish` is approximately 4.6:1. Status is never conveyed by color alone.

Interaction states are default, hover, focus-visible, pressed, selected, loading, success, warning, error, and disabled. Loading preserves dimensions; success is shown only after backend confirmation.

## Locked typography

```text
Primary: Vazirmatn
Fallback: IRANSansX, Tahoma, sans-serif
Weights: 400, 500, 600, 700
Loading: self-hosted WOFF2, font-display: swap
Letter spacing: 0 for Persian; no forced Latin tracking
```

| Role | Desktop | Mobile | Weight | Line height |
|---|---:|---:|---:|---:|
| display | 48px | 32px | 700 | 56px / 40px |
| heading-1 | 36px | 28px | 700 | 44px / 36px |
| heading-2 | 28px | 24px | 700 | 36px / 32px |
| heading-3 | 22px | 20px | 700 | 30px / 28px |
| title | 18px | 17px | 700 | 28px / 26px |
| body-large | 18px | 17px | 400 | 30px / 29px |
| body | 16px | 16px | 400 | 28px |
| body-small | 14px | 14px | 400 | 24px |
| label | 14px | 14px | 600 | 22px |
| caption | 12px | 12px | 500 | 20px |
| code | 13px | 13px | 400–500 | 20px |

Prices, quantities, balances, IDs, and technical values use tabular numerals and bidi isolation.

## Locked spacing, sizing, and breakpoints

```text
4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96px

control-sm 36px
control-md 44px
control-lg 52px
control-xl 60px
textarea-min 120px
minimum-touch-target 44px
```

Breakpoints:

```text
narrow-mobile 0px
mobile        360px
tablet        768px
desktop       1024px
wide-desktop  1440px
```

Horizontal padding is 12/16/24/32/40px from narrow to wide. Public max widths are 1200px desktop and 1440px wide; workspaces use 1360px and 1600px. Grid gaps are 12/16/20/24/32px.

## Locked radii, elevation, and z-index

```text
control 10px
card 16px
panel 20px
dialog 24px
media 20px
stage 28px
pill 9999px
```

```css
shadow-level-1: 0 2px 8px rgba(0,0,0,.18);
shadow-level-2: 0 8px 24px rgba(0,0,0,.28);
shadow-level-3: 0 16px 48px rgba(0,0,0,.40);
shadow-focus: 0 0 0 3px rgba(232,62,79,.28);
```

```text
base 0
sticky 20
dropdown 40
overlay 60
modal 80
toast 100
tooltip 120
```

No arbitrary z-index values or global glassmorphism.

## Locked motion

```text
duration-instant 80ms
duration-fast 140ms
duration-standard 220ms
duration-layout 320ms
duration-emphasis 480ms
duration-scene 700ms

ease-standard cubic-bezier(.20,.80,.20,1)
ease-enter cubic-bezier(.16,1,.30,1)
ease-exit cubic-bezier(.40,0,1,1)
ease-settle cubic-bezier(.22,1,.36,1)
ease-linear linear
```

Vocabulary: `focus-in`, `focus-out`, `align`, `expand`, `collapse`, `transfer`, `settle`, `error-recover`. CSS handles ordinary states; Motion for React handles meaningful continuity; Rive owns Torobche acting. Detailed Torobche choreography, rig, and signature scenes are deferred to a dedicated task.

Reduced motion removes travel, parallax, particles, light sweeps, and continuous loops while preserving hierarchy and functionality.

## Locked RTL rules

Use logical CSS properties and natural `dir="rtl"`. Directional arrows and chevrons mirror; logos, phone imagery, Torobche, and non-directional icons do not. Shared primitives: `BidiText`, `LtrSegment`, `PriceDisplay`, `NumberDisplay`, `DateDisplay`. Latin model names, IDs, dates, prices, and technical values are isolated LTR segments.

## Locked primitive policy

Shared primitives are domain-agnostic:

```text
Button, IconButton, Link
Field, FieldLabel, FieldDescription, FieldError
Input, Textarea, Select, Checkbox, RadioGroup
Badge, Alert, StatusMessage
Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter
Surface, Panel, Container, Section, Stack, Cluster, Grid
Skeleton, EmptyState, ErrorState
PriceDisplay, NumberDisplay, DateDisplay
```

Buttons support `primary|secondary|ghost|danger|link`, sizes `sm|md|lg|icon`, and loading/success/disabled states. Icon buttons require accessible labels. Errors use `aria-invalid` and `aria-describedby`. No primitive contains business rules.

## shadcn/Radix policy

Initialize shadcn selectively. Use project-owned source under `components/ui`, restyled entirely with these tokens. Radix is allowed for Dialog, Sheet, Select, Popover, Tooltip, Dropdown Menu, Tabs, and Accordion only when needed. Do not bulk-install the collection or use generated styling as brand identity.

## Preview and accessibility

Use a development-only `/dev/ui` route, excluded from production and public navigation. It must show every primitive and important state with Persian, mixed-direction, error, loading, disabled, and reduced-motion fixtures.

Focus is a visible 2px ring with 2px offset. Touch targets are at least 44px. Dialogs trap and restore focus. Important asynchronous changes use live regions. Forced-colors uses system colors and preserves boundaries. Zoom to 200% remains usable.

## Explicitly deferred

- Detailed Torobche/Rive animation choreography
- Route transitions and signature scenes
- Feature pages and domain components
- API client and authentication
- Production font asset delivery if the approved asset is not yet available
- Storybook, unless future scale requires it

## Decision history

1. Dark Precision visual direction preserved.
2. Exact semantic color system approved.
3. Vazirmatn typography and exact type scale approved.
4. Spacing, sizing, breakpoints, and radii approved.
5. Surfaces, elevation, shadows, and z-index approved.
6. Shared motion foundation approved; Torobche signature animation deferred.
7. RTL and mixed-direction rules approved.
8. Primitive APIs and selective shadcn/Radix policy approved.
9. Development-only preview and accessibility rules approved.

## Codex implementation constraints

Implement FE002 only. Preserve strict TypeScript and existing tooling. Do not add pages, authentication, API clients, backend changes, route transitions, or unsupported behavior. Consume tokens rather than inventing values. Report files changed, tests, visual checks, deviations, risks, and the next task group.
