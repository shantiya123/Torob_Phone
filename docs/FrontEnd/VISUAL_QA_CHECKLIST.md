# Torob Phone Visual QA Checklist

## FE002 acceptance

- [ ] All colors come from semantic tokens.
- [ ] Primary text and action pairings meet WCAG AA.
- [ ] Status uses text/icon/border in addition to color.
- [ ] Persian typography uses the approved stack and roles.
- [ ] No important text uses thin weight.
- [ ] Persian and Latin segments remain readable and correctly ordered.
- [ ] Spacing uses the locked 4px scale.
- [ ] Controls meet 44px touch target requirements.
- [ ] Breakpoints match the locked values.
- [ ] Radii, surfaces, elevation, shadows, and z-index use tokens.
- [ ] Focus is visible without motion.
- [ ] Loading preserves dimensions and prevents duplicate actions.
- [ ] Disabled, selected, pressed, error, warning, and success states are distinct.
- [ ] Reduced-motion mode removes travel and loops without removing feedback.
- [ ] Forced-colors mode preserves focus, borders, labels, and status.
- [ ] `/dev/ui` is development-only and absent from production navigation.

## RTL and mixed direction

- [ ] Root is `lang="fa" dir="rtl"`.
- [ ] Layout uses logical CSS properties.
- [ ] Directional arrows and chevrons mirror correctly.
- [ ] Logos, phone images, Torobche, and non-directional icons do not mirror.
- [ ] Model names, codes, IDs, prices, dates, and technical values use isolation.
- [ ] Screen-reader order matches visual reading order.
- [ ] Long Persian text wraps without clipping.

## Interaction and accessibility

- [ ] Keyboard navigation reaches every action.
- [ ] Focus restoration works after dialogs and sheets close.
- [ ] Labels, descriptions, and errors are programmatically associated.
- [ ] Async changes use appropriate live regions.
- [ ] Color is never the sole status signal.
- [ ] Zoom at 200% remains usable.
- [ ] Mobile has no hover-only action.
- [ ] Sticky controls do not cover meaningful content.

## Responsive and browser checks

- [ ] Test narrow mobile, mobile, tablet, desktop, and wide desktop.
- [ ] Test Chromium, Firefox, and WebKit.
- [ ] Test a mid-range Android device and a keyboard-accessible desktop.
- [ ] Check safe-area padding on mobile.
- [ ] Check long labels, empty states, errors, and failed images.
- [ ] Screenshot comparison checks hierarchy, spacing, contrast, and composition, not exact animation frames.

## Prohibited patterns

- [ ] No arbitrary colors, spacing, radii, shadows, or z-index values.
- [ ] No global glassmorphism or expensive backdrop filters.
- [ ] No hover-dependent information.
- [ ] No fake backend success, price, stock, wallet, or approval states.
- [ ] No infinite decorative loops in commerce, Store, or Staff flows.
- [ ] No route transition that blocks navigation.
- [ ] No 3D phone model, WebGL, scroll hijacking, or invented product imagery.

Later page groups must additionally pass their backend contract, responsive composition, role-permission, data-truth, and end-to-end critical-flow checks.
