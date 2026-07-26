# Torob Phone API contracts

**Source of truth:** the uploaded `Torob_Phone(2).zip`, inspected 25 July 2026.  
**Scope:** current Django REST implementation only. This document does not add or
reinterpret endpoints. `PAGES.md`, `FRONTEND_BASE.md`, and
`FRONTEND_TECH_STACK.md` were read before this inventory was prepared.

Status labels mean:

- **Implemented** — a reachable route and serializer/view behavior were verified.
- **Partial** — a related implementation exists but does not satisfy the approved page contract.
- **Missing** — no current route/implementation was found.
- **Uncertain** — static inspection cannot prove runtime behavior.

## 1. API overview

### Base URL and transport

All application routes are under `/api/`; the authentication group is
`/api/auth/`. JSON request and response bodies are used by DRF. Multipart is
needed for the `logo` field on `PATCH /api/stores/me/`, because it is an
`ImageField`; the project does not configure a media URL/storage contract.

The default DRF authentication class is
`rest_framework_simplejwt.authentication.JWTAuthentication`. Authenticated
requests use:

```http
Authorization: Bearer <access-token>
```

Access tokens use the Bearer header and refresh tokens are HttpOnly cookies.
Login returns only an access token; refresh reads, rotates, and replaces the
cookie; logout blacklists a valid cookie and clears it. Body refresh tokens are
not accepted. Credentialed CORS uses only exact environment-configured origins.
Refresh/logout accept only same-origin or configured trusted Origin/Referer
values; same-site deployments should use `SameSite=Lax` or `Strict`.

### Roles and money

`AccountProfile.account_type` values are exactly `customer` and `store`.
Staff is represented by Django `User.is_staff`; there is no `staff` value in
`account_type`. Permission classes also exclude staff from Torobche and the
Store catalog.

Prices, wallet balances, transaction amounts, and historical unit prices are
positive/negative JSON integers in one unchanged project monetary unit. The
repository does not define rial versus toman, so TG016 preserves existing
integer values without conversion and documents them generically as **project
monetary units**.

Dates are ISO `YYYY-MM-DD`; datetimes are Django/DRF ISO-8601 datetimes
serialized with `USE_TZ = True`. `TIME_ZONE = UTC`. Nullable model values are
normally JSON `null`; optional serializer fields may also be omitted where the
serializer declares `required=False`.

### Pagination

Paginated endpoints use `StandardResultsSetPagination`: default page size 20,
`?page=<n>`, optional `?page_size=<n>`, maximum page size 100. The response is:

```json
{"count": 0, "next": null, "previous": null, "results": []}
```

`next` and `previous` are absolute/relative URLs produced by DRF according to
the deployment request; do not construct them from assumptions.

### Errors

DRF authentication/permission errors use the normal DRF shape, commonly:

```json
{"detail": "Authentication credentials were not provided."}
```

or:

```json
{"detail": "Only customer accounts may perform this action."}
```

Validation errors are field maps or a non-field list/string:

```json
{"field": ["message"]}
```

Business conflicts are not globally normalized. Implemented domain conflicts
use `{"code": "...", "detail": "..."}` in a few endpoints, notably
`basket_empty`, `order_not_cancellable`, and `torobche_context_required`.
Not-found is normally `{"detail": "Not found."}` with HTTP 404. Object
ownership is enforced by filtered querysets and may therefore appear as 404;
do not infer resource existence from a forbidden/not-found distinction.

## 2. Authentication contracts

### Register

**Status:** Implemented
**Method:** `POST`  
**Path:** `/api/auth/register/`  
**Authentication:** Not required  
**Allowed roles:** Guest  
**Used by pages:** `/register/customer`, `/register/store`

`account_type` selects the serializer and is removed before validation.

Customer request:

```json
{
  "account_type": "customer",
  "username": "soroush",
  "email": "user@example.com",
  "password": "A-valid-password"
}
```

Customer success is `201`:

```json
{"id": 1, "username": "soroush", "email": "user@example.com", "account_type": "customer"}
```

Store request:

```json
{
  "account_type": "store",
  "username": "seller",
  "email": "seller@example.com",
  "password": "A-valid-password",
  "store": {
    "name": "Mobile Center",
    "description": "Phones and accessories",
    "business_phone": "+98-21-00000000",
    "business_email": "store@example.com",
    "address": "Tehran"
  },
  "legal_profile": {
    "legal_name": "Mobile Center LLC",
    "business_type": "company",
    "business_registration_number": "BR-1",
    "national_identifier": "NI-1",
    "tax_identifier": "TAX-1",
    "legal_representative_name": "Applicant",
    "legal_representative_national_identifier": "RN-1"
  }
}
```

Required nested fields are `store.name`, `store.business_phone`,
`store.address`, `legal_profile.legal_name`, `business_type`, and
`legal_representative_name`. Optional nested fields allow blank/null as
declared by the serializer. Success is `201`:

```json
{
  "id": 2, "username": "seller", "email": "seller@example.com",
  "account_type": "store",
  "store": {"id": 1, "name": "Mobile Center", "slug": "mobile-center", "status": "pending"}
}
```

The initial Store status is always `pending`; client status/review fields are
ignored/not accepted. Missing/invalid `account_type`, duplicate username/email,
password-policy failures, and nested validation return `400`.

### Universal login

**Status:** Implemented
**Method:** `POST`  
**Path:** `/api/auth/login/`  
**Authentication:** Not required  
**Allowed roles:** Guest  
**Used by pages:** `/login`

Login accepts the Django user `username` and `password`, not email-only login:

```json
{"username": "soroush", "password": "A-valid-password"}
```

Success is `200` with an access token only:

```json
{"access": "<access-jwt>"}
```

The response sets `torob_phone_refresh` as an HttpOnly refresh cookie; it is
never included in JSON. Invalid credentials return the SimpleJWT-compatible
authentication error and do not set that cookie.

### Refresh

**Status:** Implemented
**Method:** `POST`  
**Path:** `/api/auth/token/refresh/`  
**Authentication:** Not required  
**Allowed roles:** Any holder of a refresh token  
**Used by pages:** session restoration and API client

The request body is empty. The browser supplies the HttpOnly refresh cookie:

```json
{}
```

Success is `200` with a new `access` token only. The refresh token rotates and
replaces the cookie. A missing cookie returns
`{"code":"refresh_cookie_missing", ...}`; an invalid, expired, or blacklisted
cookie returns `{"code":"refresh_token_invalid", ...}`. Body-supplied refresh
tokens are ignored and cannot authenticate a refresh request.

### Logout

**Status:** Implemented
**Method/Path:** `POST /api/auth/logout/`
**Used by pages:** `/account`, Store/Staff shells

A valid refresh cookie is blacklisted, and the cookie is cleared even when it
is missing or invalid. The endpoint is idempotent and returns
`{"detail":"Logged out successfully."}`.

### Current authenticated user

**Status:** Implemented (but no Store-specific expanded profile)  
**Methods:** `GET`, `PATCH`  
**Path:** `/api/auth/me/`  
**Authentication:** Required  
**Allowed roles:** Customer, Store, Staff with a usable `account_profile`  
**Used by pages:** `/account`, `/store/profile`, all protected layouts

`GET` success is `200`:

```json
{
  "id": 1,
  "username": "soroush",
  "email": "user@example.com",
  "account_type": "customer",
  "created_at": "2026-07-25T12:00:00Z"
}
```

`PATCH` accepts only `email`; `id`, `username`, `account_type`, and
`created_at` are read-only. No Store object is nested in this response.

### Customer and Store profiles

**Status:** Partial  
**Customer path:** `/api/auth/me/` (current-user fields only)  
**Store path:** `/api/stores/me/` (Store owner fields)

There is no separate Customer profile endpoint. A Store owner can use:

```http
GET/PATCH /api/stores/me/
Authorization: Bearer <access-token>
```

`GET`/`PATCH` returns the StoreOwnerSerializer fields:
`id`, `account_profile`, `name`, `slug`, `description`, `logo`,
`business_phone`, `business_email`, `address`, `status`, `reviewed_by`,
`reviewed_at`, `rejection_reason`, `created_at`, `updated_at`. Only
`name`, `description`, `logo`, `business_phone`, `business_email`, and
`address` are writable; review/ownership fields are read-only. Any Store
account (including pending/rejected/suspended) can read/update its own Store,
while offer creation requires active status.

## 3. Torobche and search

### Submit search

**Status:** Implemented  
**Method:** `POST`  
**Path:** `/api/search/`  
**Authentication:** Required  
**Allowed roles:** Customer or non-staff Store (`IsTorobcheUser`)  
**Used by pages:** `/torobche`

Request is either a conversational message, or a complete validated
`query_set`, plus optional ordering:

```json
{"message": "یک گوشی سامسونگ با رم حداقل 8 گیگ می‌خواهم", "ordering": "newest"}
```

or:

```json
{"query_set": { "brand": null, "model": null, "release_date": null, "source": {"name": null, "url": null}, "performance": {"chipset": null, "cpu": null, "gpu": null, "storage_type": null, "variants": {"ram_gb": {"min": null, "max": null}, "storage_gb": {"min": null, "max": null}}}, "display": {"size_inches": {"min": null, "max": null}, "resolution_width": {"min": null, "max": null}, "resolution_height": {"min": null, "max": null}, "technology": null, "refresh_rate_hz": {"min": null, "max": null}, "brightness_peak_nits": {"min": null, "max": null}, "hdr": null}, "battery": {"capacity_mah": {"min": null, "max": null}, "charging_w": {"min": null, "max": null}, "wireless_charging": null}, "camera": {"main_mp": {"min": null, "max": null}, "ultrawide_mp": {"min": null, "max": null}, "macro_mp": {"min": null, "max": null}, "selfie_mp": {"min": null, "max": null}, "ois": null, "video_max_resolution": null, "video_max_fps": {"min": null, "max": null}}, "connectivity": {"5g": null, "wifi_version": null, "bluetooth_version": null, "nfc": null}, "physical": {"weight_g": {"min": null, "max": null}, "ip_rating": null}, "software": {"os": null, "android_version": {"min": null, "max": null}, "major_updates": {"min": null, "max": null}}, "benchmarks": {"antutu": {"min": null, "max": null}, "geekbench": {"min": null, "max": null}, "3dmark": {"min": null, "max": null}}, "price": {"min": null, "max": null}}, "ordering": "price_asc"}
```

`query_set` must exactly match the strict schema in `catalog/query_set.py`;
unknown or missing keys are rejected. Ordering choices are `price_asc`,
`price_desc`, `newest`, `oldest`, `battery_high`, and `battery_low`.

Success is `200`, a paginated object with `count`, `next`, `previous`,
`results`, `query_set`, legacy alias `queryset`, `message`, and `ordering`.
Each result contains `id`, `brand`, `model_name`, `device_kind`, `image_url`,
`storage_gb`, `ram_gb`, `storage_technology`, `is_available`, and
`minimum_available_price` (integer or null). Conversational fallback may add
`warning` and `warning_code`.

Malformed input and invalid QuerySet structure return `400` with `detail` or
field errors. GapGPT timeout/upstream failure/invalid provider output is
caught as a deterministic fallback to the saved/empty QuerySet and normally
still returns `200` with `warning_code=llm_interpretation_unavailable`.

### Saved search state

**Status:** Implemented  
**Method/Path:** `GET /api/search/state/`  
**Authentication:** Customer or non-staff Store  
**Used by pages:** `/torobche`, optional explanation on `/phones/[variantId]`

Success `200`:

```json
{
  "queryset": {},
  "query_set": {},
  "has_active_filters": false,
  "updated_at": null
}
```

When no row exists, the endpoint creates and returns the all-null template.

### Reset search

**Status:** Implemented  
**Method/Path:** `POST /api/search/reset/`  
**Authentication:** Customer or non-staff Store  
**Used by pages:** `/torobche`

Request body is empty. Success `200`:

```json
{"message": "نیازهای قبلی را پاک کردم تا از ابتدا شروع کنیم.", "query_set": {}, "queryset": {}}
```

There is no `DELETE`; frontend must use POST.

### Contextual explanation

**Status:** Implemented, but asynchronous provider failure is only partially
normalized  
**Methods/Paths:** `GET /api/catalog/device-variants/{id}/explanation/` and
`GET /api/catalog/phones/{id}/explanation/`  
**Authentication:** Customer or non-staff Store  
**Used by pages:** `/phones/[variantId]`

The path parameter is a DeviceVariant ID for the first route, but the same view
also accepts a parent-phone ID on the second route. The view actually looks up
an available catalog-eligible DeviceVariant. With no active saved filters it
returns `409`:

```json
{"code": "torobche_context_required", "detail": "..."}
```

Success is `200` with `phone_id` and `description`. LLM failure returns `200`
with `description: null` and an `error` string. Invalid/unavailable variant is
`404`.

## 4. Catalog contracts

### DeviceVariant detail

**Status:** Implemented  
**Method/Path:** `GET /api/catalog/device-variants/{id}/`  
**Authentication:** Public  
**Used by pages:** `/phones/[variantId]`

Only available variants whose parent `is_catalog_eligible=True` are returned.
The response fields are exactly:
`id`, `brand`, `model_name`, `device_kind`, `announced_on`, `released_on`,
`image_url`, `storage_gb`, `ram_gb`, `storage_technology`, `sku_or_region`,
`is_available`, `performance`, `displays`, `battery`, `cameras`,
`connectivity`, `physical`, `software`, and `benchmarks`. The nested
specification structures are serializer-derived and may be `null`, empty
arrays, or contain null fields.

`image_url` is stored on `catalog.DeviceModel.image_url` via migration
`0003_devicemodel_image_url`; it is nullable and exposed by list/detail
serializers through `source="device_model.image_url"`. Variants inherit the
parent image in representations; there is no variant image field. URLs are
serialized as URL strings when present, and may be null. The backfill command
is `python manage.py backfill_phone_images`; it extracts source payload image
URLs and updates missing parent images. The migration and command exist.
`source.url`/`source_url` is a source webpage and is not an image contract.

### DeviceVariant offers

**Status:** Implemented  
**Method:** `GET`  
**Path:** `/api/catalog/device-variants/{device_variant_id}/offers/`  
**Authentication:** Public  
**Used by pages:** `/phones/[variantId]`

Only active Store records (`status=active`) with `quantity > 0` are returned.
Default ordering is ascending `price`, then `pk`; `?ordering=price_desc`
reverses price. Pagination is standard. Each result contains `id`,
`device_variant` (compact variant object), `store` (`id`, `name`, `slug`,
`logo`), `price`, `quantity`, `available`, and `description`.

### Store catalog (TG012)

**Status:** Implemented  
**Method:** `GET`  
**Path:** `/api/catalog/phones/`  
**Authentication:** Required  
**Allowed roles:** Non-staff Store owner (`IsStoreCatalogUser`)  
**Used by pages:** `/store/catalog`

Query parameters: `search` (optional, case-insensitive match against
`brand.name` OR `model_name`), `page`, and `page_size`. Only
`is_catalog_eligible=True` parent phones are returned. Ordering is
`brand.name`, `model_name`, `pk`. Each result is exactly:

```json
{"id": 12, "brand": "Samsung", "model": "Galaxy M47", "image_url": null, "release_date": "2026-07-04"}
```

There is no `variant_count` field. Store-specific ownership and market context
is included only in the parent detail response below.

### Store catalog parent detail (TG012)

**Status:** Implemented  
**Method:** `GET`  
**Path:** `/api/catalog/phones/{id}/`  
**Authentication:** Required  
**Allowed roles:** Non-staff Store owner  
**Used by pages:** `/store/catalog/[phoneId]`

The exact response is the parent fields above plus `variants`. Variants are
available `DeviceVariant` records and use the compact serializer fields:
`id`, `brand`, `model_name`, `device_kind`, `image_url`, `storage_gb`,
`ram_gb`, `storage_technology`, and `is_available`, plus `owned_offer` (the
authenticated Store's Offer or `null`) and `market` (`offer_count`,
`lowest_price`, `highest_price`) calculated from all current public Offers.
Competitor identity and quantities are never returned.

### Catalog image/price notes

TG011 is implemented as a nullable normalized parent `image_url`; no absolute
URL normalization setting is configured beyond DRF URL serialization. Market
prices use project integer monetary units and return `null` bounds when no
public Offers exist. The authenticated Store's own eligible Offer is included.

## 5. Public Store contracts

### Public Store list

**Status:** Implemented  
**Method/Path:** `GET /api/stores/`  
**Authentication:** Public  
**Used by pages:** `/stores`

Optional `search` performs case-insensitive `name` filtering. Pagination is
standard and ordering is `name`, `pk`. Only `status=active` Stores are visible.
Each result is `{id, name, slug, logo}`.

### Public Store detail

**Status:** Implemented (TG018 privacy boundary)  
**Method/Path:** `GET /api/stores/{id}/`  
**Authentication:** Public  
**Used by pages:** `/stores/[storeId]`

Only active Stores are reachable. Response fields:
`id`, `name`, `slug`, `description`, `logo`, and `created_at`. Business phone,
business email, address, owner identity, legal profile, and review metadata are
private and are not returned by public Store endpoints.

Offers are loaded separately through the Store-scoped endpoint below; Store
detail does not embed them.

### Public Store-scoped offers

**Status:** Implemented (TG015)  
**Method/Path:** `GET /api/stores/{store_id}/offers/`  
**Authentication:** Public  
**Used by pages:** `/stores/[storeId]`, `/stores/[storeId]/offers`

`store_id` is the Store primary key. Only Stores with `status=active` are
visible; missing, pending, rejected, and suspended Stores return `404`.
Results include only positive-quantity Offers whose DeviceVariant is available
and whose parent DeviceModel is catalog-eligible. These are the same shared
eligibility rules used by public variant-offer and public Offer-detail reads.
The existing `OfferDetailSerializer` public representation contains:
`id`, compact `device_variant`, public `store`, `price`, `quantity`,
`available`, `description`, `created_at`, and `updated_at`.

The endpoint uses standard pagination (`page`, `page_size`, default 20,
maximum 100). Default ordering is newest first (`-created_at`, `-pk`).
Supported ordering values are `newest`, `price_asc`, and `price_desc`;
unknown values fall back to `newest`. The Storefront requests
`?page_size=5` for its latest-five preview, while the full Offers page uses
normal pagination.

## 6. Offer contracts

### Public DeviceVariant offers

See `GET /api/catalog/device-variants/{device_variant_id}/offers/` above.

### Public Offer detail

**Status:** Implemented  
**Method:** `GET`  
**Path:** `/api/offers/{id}/`  
**Authentication:** Public  
**Used by pages:** no approved dedicated Offer route; useful for basket context

Only offers belonging to active Stores are visible. Response is
`OfferDetailSerializer`: `id`, compact `device_variant`, public `store`,
`price`, `quantity`, `available`, `description`, `created_at`, `updated_at`.
Inactive Store offers return 404.

### Store-owned offer list

**Status:** Implemented  
**Method/Path:** `GET /api/stores/me/offers/`  
**Authentication:** Required  
**Allowed roles:** Any Store owner (including non-active)  
**Used by pages:** `/store/offers`, `/store/dashboard`

Paginated, ordered `-updated_at`, `-pk`. Each item includes the existing Offer
identity fields plus `publicly_available` and a derived `availability_reason`
(`store_not_active`, `out_of_stock`, `variant_unavailable`, or
`device_not_catalog_eligible`). Optional `search` and `stock=available|out`
filters are supported.

### Store dashboard (TG019)

**Method/Path:** `GET /api/stores/me/dashboard/`  
**Authentication:** Required  
**Allowed roles:** Store owner for its linked Store only

Active Stores receive offer counts, currently available units, active
unexpired reserved units, exact Order-status counts, and up to five recent
Orders and Offers. No revenue, payout, wallet, customer email, or legal data is
included. Pending, rejected, and suspended Stores receive a `200` restricted
response with `operational_access=false`, `reason=store_not_active`, null
operational metrics, and their onboarding status.

### Create offer

**Status:** Implemented  
**Method/Path:** `POST /api/offers/`  
**Authentication:** Required  
**Allowed roles:** Active Store owner  
**Used by pages:** `/store/offers/new?variant=[variantId]`

Request:

```json
{"device_variant": 31, "price": 35000000, "quantity": 4, "description": "Global version"}
```

`price` must be a positive integer; `quantity` is a non-negative integer;
`description` is an unrestricted nullable text field (no serializer max
length). Store ownership is derived from the token. A `(store,
device_variant)` unique constraint rejects duplicates with a field validation
error. The variant queryset itself does not require `is_available` or catalog
eligibility at serializer level. Success is `201` with the created Offer
representation.

### Update and delete offer

**Status:** Implemented  
**Methods/Path:** `PATCH` or `DELETE /api/offers/{id}/`  
**Authentication:** Required  
**Allowed roles:** Active owning Store (`IsApprovedStore` + `OwnsOffer`)  
**Used by pages:** `/store/offers/[offerId]/edit`

PATCH accepts only `price`, `quantity`, and `description`; `device_variant`,
Store, availability, and timestamps are not writable. Success is `200` with
the public Offer detail. DELETE returns normal DRF `204` and permanently
deletes the Offer; deletion is not merely deactivation.

There is no `active` field or activate/deactivate endpoint. Availability is
computed as `quantity > 0`; Store status also gates public visibility.
Negative values are rejected. There is no separate stock reservation
conflict code.

## 7. Basket contracts

### Retrieve basket

**Status:** Implemented  
**Method/Path:** `GET /api/basket/`  
**Authentication:** Required  
**Allowed roles:** Customer  
**Used by pages:** `/basket`, `/checkout`

Missing basket rows are created. Response:

```json
{
  "id": 1,
  "items": [{
    "id": 2,
    "offer": {
      "id": 7,
      "device_variant": {"id": 31, "brand": "Samsung", "model_name": "Galaxy M47", "device_kind": "smartphone", "image_url": null, "storage_gb": 128, "ram_gb": 8, "storage_technology": "UFS", "is_available": true},
      "store": {"id": 1, "name": "Mobile Center", "slug": "mobile-center", "logo": null},
      "price": 35000000, "quantity": 3, "available": true, "description": "Global version"
    },
    "quantity": 1,
    "unit_price": 35000000,
    "total": 35000000,
    "created_at": "...",
    "updated_at": "..."
  }],
  "total": 35000000,
  "next_expiration_at": "...",
  "created_at": "...",
  "updated_at": "..."
}
```

`unit_price` is a reservation-time snapshot. Offer `quantity` is the current
remaining stock, not the basket line's reserved stock. There is no explicit
invalid-item state, `stock` alias, or basket clear endpoint.
Each line also includes `expires_at` and integer `remaining_seconds`; expired
reservations are released before a basket read. `next_expiration_at` is the
earliest line deadline (or `null`).

### Add Offer

**Status:** Implemented  
**Method/Path:** `POST /api/basket/items/`  
**Authentication:** Required  
**Allowed roles:** Customer  
**Used by pages:** `/phones/[variantId]`, `/basket`

Request: `{"offer": 7, "quantity": 1}`. The backend locks the Offer, decreases
its quantity, copies price into `unit_price`, and if the Offer is already in
the basket increases that item's quantity rather than creating a duplicate.
Success is `201` with a serialized BasketItem. Quantity must be at least 1 and
available Offer quantity must be sufficient. Guest/Store/Staff are denied;
missing Offer is 400/404 according to DRF relation validation; stock conflict
is a field validation error. Re-adding an expired line releases its old
reservation and creates a fresh reservation at the current Offer price.

### Change quantity

**Status:** Implemented  
**Method/Path:** `PATCH /api/basket/items/{id}/`  
**Authentication:** Required  
**Allowed roles:** Customer owner of the item  
**Used by pages:** `/basket`

Request: `{"quantity": 2}`. The difference is reserved/released atomically.
Success is `200` with the updated BasketItem. Quantity must be at least 1;
insufficient additional stock is a validation error. Other fields are not
writable. An expired line returns `409 basket_reservation_expired` and remains
visible until cleanup/read release; an item belonging to another customer is
not returned (404). Successful quantity changes refresh the deadline.

### Remove item

**Status:** Implemented  
**Method/Path:** `DELETE /api/basket/items/{id}/`  
**Authentication:** Required  
**Allowed roles:** Customer owner  
**Used by pages:** `/basket`

Returns `204`; reserved quantity is returned to the Offer atomically.
There is no clear-all endpoint.

## 8. Checkout and order contracts

### Checkout/order creation

**Status:** Implemented (TG016)  
**Method:** `POST`  
**Path:** `/api/orders/`  
**Authentication:** Required  
**Allowed roles:** Customer  
**Used by pages:** `/checkout`, `/orders/confirmation`

The request body is `{}` and requires an `Idempotency-Key` header. The server
reads the authenticated Customer's basket, revalidates the purchase context,
honors each BasketItem's reservation-time `unit_price`, creates one paid Order
per Store, creates one negative `purchase` WalletTransaction per Order, and
consumes BasketItems without restoring their already-reserved stock.
If any line is expired, checkout returns `409 basket_reservation_expired`,
releases expired lines, and creates no Order or wallet charge.

```json
{"checkout_id":"12","orders":[{"id":8,"status":"paid","store":{"id":1,"name":"Mobile Center"},"item_count":1,"total":35000000,"created_at":"...","updated_at":"..."}],"order_count":1,"total":35000000,"wallet_balance":15000000}
```

The response is `201` on first success and `200` for an idempotent replay.
Empty baskets return `basket_empty`; insufficient funds return `409` with
`insufficient_wallet_balance`; invalid Store/Variant/Basket contexts return
controlled checkout errors. All financial and order writes are atomic.

### Customer order list

**Status:** Implemented  
**Method/Path:** `GET /api/orders/`  
**Authentication:** Required  
**Allowed roles:** Customer owner  
**Used by pages:** `/orders`

Optional `status` must be one of `pending`, `paid`, `cancelled`, `completed`;
invalid status returns `400` field error. Results are paginated and ordered
`-created_at`, `-pk`. Each summary has `id`, `status`, `store`, `item_count`,
`total`, `created_at`, `updated_at`.

### Order detail

**Status:** Implemented  
**Method/Path:** `GET /api/orders/{id}/`  
**Authentication:** Required  
**Allowed roles:** Customer owner  
**Used by pages:** `/orders/[orderId]`, confirmation lookup

Response fields: `id`, `store`, `status`, `items`, `item_count`, `total`,
`created_at`, `updated_at`. Each item has `id`, `offer` (integer ID), `variant`
with `id`, `brand`, `model`, `image_url`, `ram_gb`, `storage_gb`,
`storage_technology`, `quantity`, historical `unit_price`, computed
`line_total`, and `created_at`.

### Cancel order

**Status:** Implemented (TG016)  
**Method:** `POST`  
**Path:** `/api/orders/{id}/cancel/`  
**Authentication:** Required  
**Allowed roles:** Customer owner  
**Used by pages:** `/orders/[orderId]`

Empty request body. Pending and paid orders can transition to `cancelled`;
completed and other states return `400` with
`{"code":"order_not_cancellable","detail":"..."}`. A repeated cancellation
returns success with `stock_restored: false` and `refund_created: false`; the
first cancellation restores reserved Offer stock atomically and refunds a paid
wallet Order exactly once. Legacy pending Orders without a purchase
transaction restore stock but create no money.
Success is `200`:

```json
{"order": {"id": 8, "...": "OrderSerializer fields"}, "stock_restored": true, "refund": {"id": 17, "amount": 35000000, "balance_after": 50000000, "transaction_type": "refund", "order": 8, "created_at": "..."}, "refund_created": true, "wallet_balance": 50000000}
```

### Store order endpoints

**Status:** Implemented but outside approved page routes  
`GET /api/stores/me/orders/` and `GET /api/stores/me/orders/{id}/` are Store-owner
views, paginated only for the list, and filter by the owning Store. `PAGES.md`
explicitly defers Store order pages; they are not a gap for the current 26
routes.

## 9. Wallet contracts

### Wallet balance

**Status:** Implemented  
**Method/Path:** `GET /api/wallet/`  
**Authentication:** Required  
**Allowed roles:** Customer only  
**Used by pages:** `/wallet`, `/basket`, `/checkout`

The view creates a Wallet row if absent. Response is:
`id`, integer `balance`, `created_at`, `updated_at`.

### Transactions

**Status:** Implemented  
**Method/Path:** `GET /api/wallet/transactions/`  
**Authentication:** Required  
**Allowed roles:** Customer only  
**Used by pages:** `/wallet`

Paginated, newest first. Each item has `id`, signed integer `amount`,
`balance_after`, `transaction_type` (`charge`, `purchase`, `refund`), nullable
`order` ID, and `created_at`. Positive amounts add funds; negative amounts
deduct funds.

### Charge/top-up

**Status:** Implemented (demo/internal top-up)  
**Method/Path:** `POST /api/wallet/charge/`  
**Authentication:** Required  
**Allowed roles:** Customer only

Request:

```json
{"amount":5000000}
```

The amount is an integer project monetary value between `1000000` and
`100000000`. A required `Idempotency-Key` prevents duplicate credits. The
atomic response contains the updated Wallet and one positive `charge`
transaction. This is not a real payment gateway.

## 10. Staff Store-review contracts

**Status:** Implemented (TG014).

`StoreReviewSerializer` exists and defines fields `id`, `status`,
`rejection_reason`, `reviewed_by`, and `reviewed_at`. Its allowed transitions
are pending → active/rejected, rejected → pending, and no transitions from
active. Rejection requires a non-empty reason. The serializer sets reviewer
and timestamp from the request.

The review resource is the existing `Store` row; `reviewId` is therefore the
Store primary key. Access requires an authenticated Django user with
`is_staff=True`; an `AccountProfile` and `account_type="staff"` are not
required. Anonymous users receive the normal authentication response, while
Customer, Store, and other authenticated non-Staff users are denied.

### Queue

`GET /api/staff/store-reviews/` is paginated with the standard `page` and
`page_size` parameters. It defaults to `status=pending`; valid status values
are `pending`, `active`, `rejected`, and `suspended`. `search` performs a
case-insensitive match against Store name, owner username/email, legal name,
and business registration number. Results are deterministic (`created_at`,
then Store ID) and use `select_related` for owner, legal profile, and reviewer.

### Detail

`GET /api/staff/store-reviews/{storeId}/` returns the Staff-only registration
representation, including Store identity, owner summary, legal profile, status,
reviewer summary, review timestamp, and rejection reason. This serializer is
not used by public or Store-owner routes.

### Decisions

`POST /api/staff/store-reviews/{storeId}/approve/` accepts `{}` and atomically
transitions `pending → active`, records `reviewed_by` and `reviewed_at`, and
clears `rejection_reason`.

`POST /api/staff/store-reviews/{storeId}/reject/` accepts
`{"rejection_reason": "..."}`. The reason is trimmed and must not be blank;
the action atomically transitions `pending → rejected` and records reviewer
and timestamp.

Both actions lock the Store row with `select_for_update()`. A conflicting
non-pending transition returns `409` with
`code="store_review_invalid_transition"`. Repeating approval of an active
Store or rejection of a rejected Store returns `200` without overwriting the
original review metadata.

## 11. Endpoint inventory

| Method | Path | Implemented behavior |
|---|---|---|
| POST | `/api/auth/register/` | Customer/store registration |
| POST | `/api/auth/login/` | Username/password SimpleJWT pair |
| POST | `/api/auth/token/refresh/` | Body refresh JWT |
| GET/PATCH | `/api/auth/me/` | Current Django user |
| POST | `/api/search/` | Torobche search |
| POST | `/api/search/reset/` | Reset saved QuerySet |
| GET | `/api/search/state/` | Saved QuerySet |
| GET | `/api/catalog/device-variants/{id}/` | Public variant detail |
| GET | `/api/catalog/device-variants/{id}/offers/` | Active offers for variant |
| GET | `/api/catalog/device-variants/{id}/explanation/` | Contextual explanation |
| GET | `/api/catalog/phones/` | Store-only TG012 parent list |
| GET | `/api/catalog/phones/{id}/` | Store-only TG012 parent detail |
| GET | `/api/catalog/phones/{id}/explanation/` | Alternate explanation route |
| GET | `/api/stores/` | Active public Store list |
| GET | `/api/stores/{id}/` | Active public Store detail |
| GET | `/api/stores/{id}/offers/` | Active Store public Offers |
| GET/PATCH | `/api/stores/me/` | Store owner profile |
| GET | `/api/stores/me/offers/` | Owner offers |
| GET | `/api/offers/{id}/` | Public offer detail |
| POST | `/api/offers/` | Active Store creates offer |
| PATCH/DELETE | `/api/offers/{id}/` | Active owner edits/deletes offer |
| GET | `/api/basket/` | Customer basket |
| POST | `/api/basket/items/` | Add/reserve Offer |
| PATCH/DELETE | `/api/basket/items/{id}/` | Change/remove basket item |
| GET/POST | `/api/orders/` | Customer list/checkout |
| GET | `/api/orders/{id}/` | Customer order detail |
| POST | `/api/orders/{id}/cancel/` | Cancel and restore stock |
| GET | `/api/stores/me/orders/` | Deferred Store order list |
| GET | `/api/stores/me/orders/{id}/` | Deferred Store order detail |
| GET | `/api/wallet/` | Wallet balance |
| GET | `/api/wallet/transactions/` | Wallet history |
| POST | `/api/wallet/charge/` | Demo Customer wallet top-up |
| GET | `/api/staff/store-reviews/` | Staff review queue |
| GET | `/api/staff/store-reviews/{id}/` | Staff review detail |
| POST | `/api/staff/store-reviews/{id}/approve/` | Approve pending Store |
| POST | `/api/staff/store-reviews/{id}/reject/` | Reject pending Store |

## 12. Page-to-endpoint matrix

| Frontend route | Required endpoint(s) | Backend status |
|---|---|---|
| `/` | Public catalog/store data if dynamic | Partial; no homepage aggregate/featured contract |
| `/torobche` | Search, state, reset | Implemented |
| `/phones/[variantId]` | Variant detail, variant offers, explanation | Implemented; explanation context-dependent |
| `/stores` | Public Store list/search/pagination | Implemented |
| `/stores/[storeId]` | Store detail, latest five active offers | Implemented with `?page_size=5` |
| `/stores/[storeId]/offers` | Store-scoped active offers/pagination | Implemented |
| `/login` | Login, current user, refresh | Partial; body JWT only, no cookie/logout |
| `/register` | No page-specific endpoint | No page-specific endpoint |
| `/register/customer` | Register customer | Implemented |
| `/register/store` | Register store | Implemented; pending review is not actionable |
| `/basket` | Basket, add, update, remove | Implemented |
| `/checkout` | Basket, wallet, order creation | Implemented; atomic wallet checkout |
| `/orders` | Customer order list | Implemented |
| `/orders/[orderId]` | Order detail, cancel | Implemented with wallet refund |
| `/orders/confirmation` | Structured multi-order checkout response, order detail | Implemented |
| `/wallet` | Balance, transactions, demo charge | Implemented |
| `/account` | Current user, logout | Partial; current user exists, logout missing |
| `/store/dashboard` | Store status, metrics, recent Orders/Offers | Implemented via `GET /api/stores/me/dashboard/` |
| `/store/offers` | Owner offer list, create/delete/update links | Implemented |
| `/store/catalog` | TG012 parent list/search/pagination | Implemented |
| `/store/catalog/[phoneId]` | Parent detail/variants, owned Offer match, price guidance | Implemented with TG019 context |
| `/store/offers/new` | Parent/variant context, create offer | Implemented with client-selected variant query |
| `/store/offers/[offerId]/edit` | Offer detail/update/delete | Implemented |
| `/store/profile` | Store owner profile, current user | Implemented |
| `/staff/store-reviews` | Review queue | Implemented |
| `/staff/store-reviews/[reviewId]` | Review detail/approve/reject | Implemented |

**Coverage:** 21 of 26 routes have all required page-specific backend
capabilities implemented (**80.8%**). A further 5 routes have partial support;
no approved route is missing its required backend resource/operation. This percentage
counts the approved page responsibilities, not merely whether a URL exists.

## 13. Backend gap register

| Gap ID | Capability | Required by page(s) | Severity | Recommended action |
|---|---|---|---|---|
| TG013 | HttpOnly refresh-cookie flow, rotation/invalidation, logout | `/login`, `/account`, all protected pages | blocking | Add cookie-aware login/refresh/logout and document CORS/SameSite |
| TG018 | Public Store privacy and serializer separation | `/stores`, `/stores/[storeId]`, Offers, basket, orders | important | Completed: explicit public, owner, staff, and transactional Store boundaries |
| TG019 | Store dashboard, catalog ownership, market guidance | `/store/dashboard`, `/store/catalog` | optional | Completed with derived read-only summaries |
| TG021 | Basket invalid-item/clear-all contract | `/basket` | optional | Add explicit availability state and clear endpoint if UX requires it |

## 14. OpenAPI comparison

`python manage.py spectacular --file schema.yml` generated a schema from the
current routes. The generated route set matches the URL inventory above.
Code remains authoritative where the schema is incomplete.

Observed mismatches/warnings:

1. `RegisterView` is an `APIView` without a declared `serializer_class`;
   spectacular omits/incompletely describes its request and response schema.
2. `BasketSerializer.get_total`, `BasketItemSerializer.get_total`, and all
   `DeviceVariantDetailSerializer` `SerializerMethodField`s lack explicit
   `extend_schema_field` type declarations. The schema falls back to strings
   or ambiguous objects for those fields.
3. The schema cannot express the runtime-selected registration serializer
   (`customer` vs `store`) accurately.
4. The schema documents the body-based SimpleJWT pair, which is accurate for
   code but conflicts with the locked frontend architecture's desired cookie
   flow.
5. The schema includes Store order routes and the public Offer detail route,
   while `PAGES.md` defers Store order pages and has no dedicated Offer page.

No schema or backend code was changed during this task.

## 15. Validation and evidence

- `manage.py check`: passed with one environment-only Pillow check silenced;
  the repository `requirements.txt` does not install Pillow despite the
  `Store.logo` ImageField.
- `manage.py showmigrations`: all listed migrations applied in the supplied
  SQLite database.
- `manage.py test`: 63 tests passed. Tests exercise filtering, QuerySet,
  image/backfill, Store catalog, Torobche, offers, basket, orders, and wallet
  read APIs.
- `manage.py spectacular --file schema.yml`: generated successfully with the
  warnings documented above.
- Representative supplied database counts: 2 users, 2 account profiles, 10
  brands, 233 parent models, 535 variants, 1 Store, and no persisted offers,
  basket, orders, or wallet transactions. The database is therefore useful
  for catalog inspection but does not prove populated marketplace flows.
