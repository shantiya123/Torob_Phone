# Codex Frontend Handoff — FE002

## Implementation rules

Implement only the approved FE002 design-system foundation. Preserve FE001, strict TypeScript, RTL root, existing quality tooling, and the source-of-truth hierarchy. Use semantic tokens and the locked primitive contracts.

Do not implement feature pages, authentication, API clients, backend changes, route transitions, signature animations, or unsupported backend behavior in FE002.

## Ownership

```text
app/          routes, layouts, metadata, boundaries; thin composition only
components/ui shared primitives
components/layout shared shells and layout
components/feedback shared states
components/navigation shared navigation
components/imagery shared image fallbacks
lib/          formatters, motion helpers, infrastructure
styles/       tokens, global accessibility, motion styles
features/     domain behavior; created only by later task groups
```

Primitives must not import feature modules. Features expose public root exports and do not expose internal files.

## Token rules

Use `FRONTEND_DECISIONS.md` as the implementation contract. No arbitrary values. Use logical CSS properties, semantic color names, the Vazirmatn stack, the locked spacing scale, exact breakpoints, radii, shadows, motion durations, and z-index layers.

## Primitive boundaries

Implement Button, IconButton, Link, form-field primitives, Badge, Alert, StatusMessage, Card composition, Surface, Panel, Container, Section, Stack, Cluster, Grid, Skeleton, EmptyState, ErrorState, PriceDisplay, NumberDisplay, and DateDisplay as domain-agnostic primitives.

Use native HTML semantics and Radix only for the approved Dialog, Sheet, Select, Popover, Tooltip, Dropdown Menu, Tabs, and Accordion cases. Initialize shadcn selectively and restyle generated source completely.

## RTL and accessibility

Keep `lang="fa" dir="rtl"`. Use logical properties. Isolate Latin model names, IDs, prices, dates, and technical values. Mirror only directional icons. Ensure labels, descriptions, errors, focus, live regions, dialog focus management, forced-colors, high contrast, zoom, and 44px targets.

## Reduced motion

Remove travel, parallax, particles, light sweeps, and continuous loops under `prefers-reduced-motion`. Preserve hierarchy, status, focus, and functionality. Torobche’s detailed rig and signature choreography are deferred and must receive a separate design/implementation review.

## Testing requirements

Add focused unit/component tests for:

- token-driven states;
- keyboard and disabled/loading behavior;
- field label/error association;
- bidi formatting;
- PriceDisplay, NumberDisplay, and DateDisplay;
- reduced-motion rendering;
- forced-colors-safe focus;
- touch-equivalent actions.

Use the development-only `/dev/ui` route with deterministic fixtures. Run lint, typecheck, unit/component tests, and visual checks. Do not test exact animation frames.

## Visual QA process

Check every primitive at default, hover, focus-visible, pressed, selected, loading, success, warning, error, and disabled states. Check Persian, mixed Persian/Latin, narrow mobile, mobile, tablet, desktop, wide desktop, keyboard, zoom, reduced motion, and forced colors.

## Backend boundary

Django remains authoritative for filtering, ranking, QuerySet fields, product identity, prices, stock, wallet, orders, approvals, permissions, and errors. Frontend components display normalized data and never fabricate or optimistically confirm backend state.

## Prohibited shortcuts

No localStorage access-token persistence, client-side business-rule duplication, arbitrary CSS values, global glassmorphism, hover-only behavior, fake success, invented discounts/ratings/delivery estimates, random phone imagery, WebGL, scroll hijacking, or broad Client Component conversion.

## Task sequencing

```text
FE002 tokens/primitives
FE003 typed API/error foundation
FE004 authentication/session
later public discovery
later customer commerce
later Store workspace
later Staff workspace
later Torobche/Rive signature animation pass
```

Do not begin a later group until the current checkpoint is reviewed.

## Completion report format

Report:

1. completed scope;
2. files changed;
3. tests and commands run;
4. visual QA results;
5. accessibility and reduced-motion results;
6. deviations from the locked decisions;
7. unresolved risks or manual checks;
8. recommended next task group.
