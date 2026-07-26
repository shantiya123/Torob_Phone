# FE008 — Phone Variant detail

The `/phones/[variantId]` route represents one exact public `DeviceVariant`.
It performs two bounded public requests in parallel:

1. `GET /api/catalog/device-variants/{variantId}/`
2. `GET /api/catalog/device-variants/{variantId}/offers/`

The first response is authoritative for the identity, image, configuration,
release dates, and optional specification groups. The second response is the
complete paginated public comparison for the selected Variant. No Store-detail
or per-Offer requests are made.

Offer ordering is restricted to the backend-supported `price` and
`price_desc` values. Pagination preserves the ordering query. When the first
page is sorted by `price`, the first row may be labelled “کمترین قیمت فعلی”;
the UI does not claim a universal or permanent best offer.

Public Store data remains limited to `id`, `name`, `slug`, and `logo`.
Guest users can browse, but Basket actions redirect to login. Only Customer
accounts can reserve an Offer. Store and Staff accounts receive a controlled
purchase restriction. Basket totals, price snapshots, stock reservation, and
expiration remain backend-owned.
