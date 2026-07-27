# Torobche — FE009

FE009 replaces the `/torobche` placeholder with an authenticated, Persian RTL
living-search experience. Customer and non-staff Store accounts may use it;
Staff accounts are denied before the feature mounts.

## Backend contracts

- `POST /api/search/` accepts either `message` or the complete validated
  `query_set`, plus an approved ordering value.
- `GET /api/search/state/` restores Django's latest validated QuerySet.
- `POST /api/search/reset/` resets Django state. Visible frontend state is
  cleared only after this request succeeds.

Django remains authoritative for interpretation, validation, saved QuerySet,
filtering, ordering, pagination, and exact DeviceVariant results. Cards are
rendered only from `response.results`; Store Offer comparison remains on
`/phones/[variantId]`.

## Experience state

The controller maps real UI/API state to the replaceable character contract:

`idle → focused → thinking → results`, with `empty`, `error`, and `recovery`
states. The current renderer uses the approved fallback mark and Motion/CSS. It
contains no search logic and can later be replaced by an approved Rive state
machine without changing API or page logic.

Reduced-motion users receive static state treatments. Status text and a polite
live region communicate every state independently of animation.

## Session and security

Only the visible request history, last backend message, result count, ordering,
and validated QuerySet are stored in `sessionStorage`. Access and refresh tokens
are never stored there. The full session snapshot is removed after successful
reset. Django may independently retain its QuerySet until the reset endpoint
succeeds.

Requests are cancellable, duplicate submission is disabled, and raw provider or
serializer errors are replaced with product-facing recovery messages.

## Current asset limitation

No approved `.riv` character asset exists. FE009 deliberately adds no Rive
runtime and does not claim the fallback animation is the final signature rig.
