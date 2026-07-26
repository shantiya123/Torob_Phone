# Public application shell

FE005 provides the reusable shell around public and authenticated non-auth
routes. It intentionally contains navigation structure and honest placeholders,
not final commerce content.

## Composition

- `PublicShell` owns shell inclusion boundaries.
- `SiteHeader` combines the brand, desktop navigation, role actions, and mobile
  menu trigger.
- `DesktopNavigation` and `MobileNavigation` consume the same typed navigation
  data.
- `SiteFooter` remains minimal and links only to implemented primary routes.
- `RouteTransition` adds a short reveal class and preserves native browser
  history/scroll restoration.
- `ShellAnnouncer` provides route changes through a polite live region.
- `Logo` and `TorobcheMark` use the existing `public/icon.svg` fallback until
  production brand and Rive assets are delivered.

## Role behavior

Guest navigation exposes Home, Torobche, Stores, and Login. Customers receive
Basket and Account actions. Store and Staff users receive only their approved
workspace destination. These are UX destinations; Django remains authoritative
for access.

Auth routes retain the focused FE004 auth shell so session restoration cannot
flash the public navigation. The development UI gallery is also excluded from
product navigation.

## Responsive and accessibility behavior

Desktop navigation begins at the approved `lg` breakpoint. The mobile drawer
uses a 44px minimum control size, closes on Escape or backdrop activation,
restores body scrolling, and keeps the current route marked with
`aria-current="page"`. Skip navigation remains in the root document and lands
on `#main-content`.

Transitions use the approved short layout timing and are disabled by the global
reduced-motion rules. No transition blocks navigation or data actions.
