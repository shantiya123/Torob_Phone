# API Views Specification

## 1. Purpose

This document defines the API views and backend behavior of the project.

The purpose of this document is to define:

* Available API endpoints
* Responsibilities of each endpoint
* Authentication and authorization requirements
* Expected business behavior
* Relationships between API domains
* Important rules that implementations must preserve

The implementation should use standard Django REST Framework patterns and choose the most appropriate generic views, mixins, serializers, permissions, pagination, and query logic for each endpoint.

The implementation should not blindly create separate views for every HTTP method if a clean combined DRF generic view is more appropriate.

---

# 2. Core Architectural Principles

## 2.1 LLM-Based Product Discovery

Product discovery and product filtering are performed through the LLM search pipeline.

The user should not directly filter `DeviceVariant` objects through arbitrary query parameters.

The primary product search flow is:

```text
User natural-language message
        ↓
Search API
        ↓
LLM
        ↓
QuerySet
        ↓
QuerySet validation
        ↓
QuerySet adaptation
        ↓
DeviceVariant database filtering
        ↓
User-selected ordering
        ↓
Pagination
        ↓
Response
```

The LLM:

* Understands natural-language user intent.
* Creates a structured QuerySet.
* Modifies an existing QuerySet when the user continues a search.

The LLM must not:

* Access the database.
* Retrieve products directly.
* Decide the final product ranking.
* Return product data instead of a QuerySet.

The backend:

* Validates the QuerySet.
* Converts the QuerySet into database filters.
* Executes the database query.
* Applies user-selected ordering.
* Applies pagination.
* Serializes the resulting `DeviceVariant` objects.

---

## 2.2 Filtering and Sorting Are Different

Filtering determines which products match the user's request.

```text
User request
    ↓
LLM
    ↓
QuerySet
    ↓
Database filtering
```

Sorting only determines the order of matching products.

```text
Filtered results
        ↓
User-selected ordering
        ↓
Paginated results
```

The project currently does not implement a product ranking or recommendation score.

There is no:

* Product score
* "Best phone" score
* AI ranking
* Weighted recommendation system

Sorting must be deterministic and based on supported fields.

---

## 2.3 Product Identity

From the customer's perspective, each `DeviceVariant` is a separate product.

Different RAM/storage configurations should be represented as separate customer-facing products.

A product may have multiple offers:

```text
DeviceVariant
    ├── Offer - Store A
    ├── Offer - Store B
    └── Offer - Store C
```

The customer chooses a specific `Offer` when purchasing.

---

# 3. Authentication API

## 3.1 Register

### Endpoint

```text
POST /api/auth/register/
```

### View

```text
RegisterView
```

### Purpose

Creates a new user account.

The user chooses their account role during registration.

Supported roles include:

* Customer
* Store

### Customer registration

Creates a user account.

```text
User
    ↓
Customer
```

### Store registration

Creates the user and their store profile.

```text
User
    ↓
Store(status=PENDING)
```

The store must immediately enter a pending state after registration.

The store cannot create offers until the store has been approved.

The creation of the user and store should be handled atomically.

If store creation fails, the registration should not leave an incomplete account state.

---

## 3.2 Login

### Endpoint

```text
POST /api/auth/login/
```

### View

```text
LoginView
```

### Purpose

Authenticates the user and returns JWT authentication tokens.

The project uses JWT authentication.

The implementation should use the standard, reliable Django REST Framework JWT ecosystem rather than implementing JWT authentication manually.

---

## 3.3 Refresh Token

### Endpoint

```text
POST /api/auth/token/refresh/
```

### View

```text
TokenRefreshView
```

### Purpose

Refreshes an expired access token using a valid refresh token.

---

## 3.4 Current User

### Endpoints

```text
GET /api/auth/me/
PATCH /api/auth/me/
```

### View

```text
CurrentUserView
```

### Purpose

Allows an authenticated user to retrieve and update their own account information.

A user may access only their own user profile.

There is no public user-profile system.

The project does not provide:

```text
GET /api/users/<id>/
```

Users cannot access other users' private profiles.

Users cannot communicate with each other through the API.

Sensitive authorization fields must not be editable by the user.

The user must not be able to modify:

* Role
* Staff status
* Superuser status
* Permissions
* Other security-related fields

---

# 4. Product Search API

## 4.1 Search

### Endpoint

```text
POST /api/search/
```

### View

```text
SearchView
```

### Purpose

This is the primary and exclusive product discovery endpoint.

All natural-language product search and filtering must pass through this view.

The view must support:

```text
Natural-language search
        ↓
LLM QuerySet generation
        ↓
QuerySet validation
        ↓
Database filtering
        ↓
Sorting
        ↓
Pagination
        ↓
DeviceVariant results
```

---

## 4.2 New Search

A new search contains a natural-language user message.

Example:

```text
"I want a Samsung phone with a large battery"
```

The backend sends the appropriate input to the LLM.

The LLM returns a structured QuerySet.

The backend validates and executes that QuerySet.

The response contains the matching `DeviceVariant` results.

---

## 4.3 Continuing a Search

The user may continue a previous search.

Example:

```text
User:
"I want Samsung phones"

↓

User:
"Only phones with at least 5000mAh battery"
```

The LLM receives:

```text
Previous QuerySet
+
New user message
```

and produces a modified QuerySet.

The backend validates and executes the new QuerySet.

---

## 4.4 Sorting Existing Search Results

Sorting does not require an LLM call.

The QuerySet represents the filtering state.

Sorting is independent of the QuerySet.

Conceptually:

```text
QuerySet
    ↓
Filter DeviceVariants
    ↓
Apply ordering
    ↓
Pagination
```

The client may submit an existing QuerySet with a different ordering choice.

The backend must validate the QuerySet before execution.

The LLM should not be called when the user only changes ordering.

---

## 4.5 Supported Ordering

The implementation may expose a clean set of supported ordering options.

Examples include:

```text
price_asc
price_desc
newest
oldest
battery_high
battery_low
```

The exact API representation may be chosen by the implementation, but arbitrary unsafe database ordering must not be exposed directly to clients.

---

## 4.6 Price Ordering

A `DeviceVariant` does not have one fixed marketplace price.

A `DeviceVariant` may have multiple offers:

```text
DeviceVariant
    ├── Offer A: €900
    ├── Offer B: €850
    └── Offer C: €920
```

When sorting by price, the effective price of the `DeviceVariant` is:

```text
Minimum price among currently available offers
```

Therefore:

```text
DeviceVariant A
    cheapest available offer = €850
```

must appear before:

```text
DeviceVariant B
    cheapest available offer = €920
```

when sorting from cheapest to most expensive.

Unavailable offers must not be considered for the current marketplace price.

Products without available offers may remain in the result set, but when sorting by price they should appear after products that have an available price.

The implementation should use an efficient database-level annotation/aggregation approach where appropriate.

---

## 4.7 Search Pagination

Search results must be paginated.

The API should not return an unbounded number of products in a single response.

The response should follow the project's standard DRF pagination format.

Conceptually:

```json
{
    "count": 100,
    "next": "...",
    "previous": null,
    "results": []
}
```

---

# 5. Catalog API

## 5.1 DeviceVariant Detail

### Endpoint

```text
GET /api/catalog/device-variants/<id>/
```

### View

```text
DeviceVariantDetailView
```

### Purpose

Returns the details of one customer-facing `DeviceVariant`.

Each `DeviceVariant` is treated as a separate product from the customer's perspective.

This endpoint is intended for viewing a specific product after discovery through the search system.

The endpoint must not become an alternative general product-search system.

There should not be an unrestricted public `DeviceVariantListView` that allows clients to bypass the LLM-based product discovery system.

---

# 6. Store API

Stores are separate marketplace entities.

Unlike product discovery, store search does not require an LLM.

---

## 6.1 Store List

### Endpoint

```text
GET /api/stores/
```

### View

```text
StoreListView
```

### Purpose

Returns a paginated list of public stores.

The user may search stores by store name.

Example:

```text
GET /api/stores/?search=example
```

The search should operate only on the store name.

The endpoint must not search:

* Private legal information
* Internal verification information
* Private contact information
* Arbitrary model fields

No LLM is involved.

The list should expose minimal public store information.

---

## 6.2 Store Detail

### Endpoint

```text
GET /api/stores/<id>/
```

### View

```text
StoreDetailView
```

### Purpose

Returns the public information of one store.

Only information intended to be publicly visible should be exposed.

Private and platform-internal store information must not be exposed.

---

## 6.3 Current Store

### Endpoints

```text
GET /api/stores/me/
PATCH /api/stores/me/
```

### View

```text
MyStoreView
```

### Purpose

Allows an authenticated store owner to access and update their own store profile.

A store owner cannot access or modify another store's private management information through this endpoint.

The user must own the store associated with the request.

Fields related to platform approval and authorization must not be freely editable by the store owner.

---

# 7. Offer API

An `Offer` represents a store selling a specific `DeviceVariant`.

```text
DeviceVariant
    ↓
Offer
    ├── Store
    ├── Price
    ├── Quantity
    └── Availability
```

The customer purchases an `Offer`, not a `DeviceVariant` directly.

---

## 7.1 DeviceVariant Offers

### Endpoint

```text
GET /api/catalog/device-variants/<device_variant_id>/offers/
```

### View

```text
DeviceVariantOfferListView
```

### Purpose

Returns the available offers for a specific `DeviceVariant`.

The endpoint should primarily return offers that are currently available to customers.

The result may support ordering, especially by price.

This is a normal marketplace offer list and does not use the LLM.

---

## 7.2 Offer Detail

### Endpoint

```text
GET /api/offers/<id>/
```

### View

```text
OfferDetailView
```

### Purpose

Returns the public details of one offer.

This endpoint is publicly available.

The response may include:

* Offer information
* Public store information
* DeviceVariant information
* Current public offer price
* Availability information

Private store information must not be exposed.

---

## 7.3 Store's Offers

### Endpoint

```text
GET /api/stores/me/offers/
```

### View

```text
MyOfferListView
```

### Purpose

Returns the offers belonging to the authenticated store.

A store must not see or manage another store's offers through this endpoint.

---

## 7.4 Create Offer

### Endpoint

```text
POST /api/offers/
```

### View

```text
OfferCreateView
```

### Authorization

Only an authenticated and approved store may create offers.

The store may create an offer for an existing `DeviceVariant`.

Stores cannot create new catalog products through the offer API.

The following rule must be enforced:

```text
One Offer per:
(Store, DeviceVariant)
```

A store cannot create multiple offers for the same `DeviceVariant`.

---

## 7.5 Update Offer

### Endpoint

```text
PATCH /api/offers/<id>/
```

### View

```text
OfferUpdateView
```

Only the owning store may update its offer.

The implementation must enforce object-level ownership.

The store may update permitted offer fields such as:

* Price
* Quantity

Availability must remain consistent with the project's quantity/availability business rules.

---

## 7.6 Delete Offer

### Endpoint

```text
DELETE /api/offers/<id>/
```

### View

```text
OfferDeleteView
```

Only the owning store may delete its offer.

The implementation should not allow one store to delete another store's offer.

---

# 8. Basket API

The basket belongs to the authenticated customer.

A user may access only their own basket.

The customer adds an `Offer` to the basket.

The customer does not add a generic `DeviceVariant` to the basket.

```text
Customer
    ↓
Basket
    ↓
BasketItem
    ↓
Offer
```

---

## 8.1 Current Basket

### Endpoint

```text
GET /api/basket/
```

### View

```text
MyBasketView
```

Returns the authenticated user's basket.

Users cannot access another user's basket.

---

## 8.2 Add Basket Item

### Endpoint

```text
POST /api/basket/items/
```

### View

```text
BasketItemCreateView
```

The request identifies an `Offer` and a quantity.

The backend must validate:

* The offer exists.
* The offer is currently available.
* The requested quantity is valid.
* The requested quantity can be fulfilled according to the inventory rules.

When the item is added, the current offer price is copied into the basket item.

```text
Offer.price
    ↓
BasketItem.unit_price
```

The basket item stores the locked price.

Example:

```text
Offer price at addition: €900

BasketItem:
    offer = Offer
    quantity = 2
    unit_price = €900
```

If the store later changes the offer price to €950, the existing basket item remains priced at €900 according to the project's business rule.

---

## 8.3 Update Basket Item

### Endpoint

```text
PATCH /api/basket/items/<id>/
```

### View

```text
BasketItemUpdateView
```

The customer may change the quantity of their own basket item.

Changing the quantity must not silently replace the locked unit price.

---

## 8.4 Delete Basket Item

### Endpoint

```text
DELETE /api/basket/items/<id>/
```

### View

```text
BasketItemDeleteView
```

Removes an item from the authenticated user's basket.

---

# 9. Order API

Orders preserve the purchase information independently of the current offer state.

The price must be copied from the basket item into the order item.

```text
Offer
    ↓
BasketItem.unit_price
    ↓
OrderItem.unit_price
```

An order must not depend on a future offer price change.

---

## 9.1 Create Order

### Endpoint

```text
POST /api/orders/
```

### View

```text
OrderCreateView
```

Creates an order from the authenticated user's basket.

The order must preserve:

* Product information needed for the order
* Offer information
* Store information needed for the transaction
* Quantity
* Locked unit price

The order should preserve historical purchase information independently from future changes to the offer.

---

## 9.2 Customer Order List

### Endpoint

```text
GET /api/orders/
```

### View

```text
MyOrderListView
```

Returns only orders belonging to the authenticated customer.

A customer cannot access another customer's orders.

---

## 9.3 Customer Order Detail

### Endpoint

```text
GET /api/orders/<id>/
```

### View

```text
OrderDetailView
```

Returns one order belonging to the authenticated customer.

Object-level ownership must be enforced.

---

## 9.4 Store Order List

### Endpoint

```text
GET /api/stores/me/orders/
```

### View

```text
MyStoreOrderListView
```

Returns orders relevant to the authenticated store's own offers.

A store must not see unrelated orders belonging exclusively to other stores.

The implementation must carefully limit the data exposed to the store.

---

## 9.5 Store Order Detail

### Endpoint

```text
GET /api/stores/me/orders/<id>/
```

### View

```text
StoreOrderDetailView
```

Returns the relevant information from an order for the authenticated store's own sale.

The store should not automatically receive unnecessary private customer information.

---

# 10. Staff and Django Admin

There is no custom staff API.

There is no custom admin frontend.

The project uses Django Admin.

Staff members have a narrow responsibility:

```text
Review pending store applications
        ↓
Approve
or
Reject
```

Allowed store status transitions:

```text
PENDING → APPROVED
PENDING → REJECTED
```

Staff members must not have unrestricted administrative powers.

They must not be able to:

* Edit store information
* Edit users
* Edit offers
* Edit catalog data
* Manage staff
* Manage permissions

The staff workflow should be implemented through Django Admin permissions and controlled actions.

The implementation should prevent staff from arbitrarily changing the store status to any value if the business rules do not allow that transition.

Superusers retain full Django Admin access according to Django's normal permission system.

---

# 11. Complete API View List

## Authentication

```text
RegisterView
POST /api/auth/register/

LoginView
POST /api/auth/login/

TokenRefreshView
POST /api/auth/token/refresh/

CurrentUserView
GET   /api/auth/me/
PATCH /api/auth/me/
```

---

## Product Search

```text
SearchView
POST /api/search/
```

---

## Catalog

```text
DeviceVariantDetailView
GET /api/catalog/device-variants/<id>/
```

---

## Stores

```text
StoreListView
GET /api/stores/

StoreDetailView
GET /api/stores/<id>/

MyStoreView
GET   /api/stores/me/
PATCH /api/stores/me/
```

---

## Offers

```text
DeviceVariantOfferListView
GET /api/catalog/device-variants/<device_variant_id>/offers/

OfferDetailView
GET /api/offers/<id>/

MyOfferListView
GET /api/stores/me/offers/

OfferCreateView
POST /api/offers/

OfferUpdateView
PATCH /api/offers/<id>/

OfferDeleteView
DELETE /api/offers/<id>/
```

---

## Basket

```text
MyBasketView
GET /api/basket/

BasketItemCreateView
POST /api/basket/items/

BasketItemUpdateView
PATCH /api/basket/items/<id>/

BasketItemDeleteView
DELETE /api/basket/items/<id>/
```

---

## Orders

```text
OrderCreateView
POST /api/orders/

MyOrderListView
GET /api/orders/

OrderDetailView
GET /api/orders/<id>/

MyStoreOrderListView
GET /api/stores/me/orders/

StoreOrderDetailView
GET /api/stores/me/orders/<id>/
```

---

# 12. Implementation Guidance

The implementation must preserve the architectural boundaries described in this document.

In particular:

1. Product discovery must go through the LLM QuerySet pipeline.
2. The LLM must not access the database.
3. Direct arbitrary product filtering endpoints must not bypass the LLM.
4. Sorting must remain separate from filtering.
5. Product ranking and recommendation scoring are not currently implemented.
6. Price sorting must use the minimum currently available offer price.
7. A `DeviceVariant` is a separate customer-facing product.
8. Customers purchase specific `Offer` objects.
9. Store ownership must be enforced at the object level.
10. Users can access only their own private user profile.
11. Stores may expose limited public business information.
12. Store registration creates a pending store application.
13. Only approved stores may create offers.
14. The `(Store, DeviceVariant)` combination must be unique for offers.
15. Basket item prices are locked when the item is added.
16. Order item prices are copied from the basket and preserved historically.
17. Staff store validation belongs in Django Admin, not in a custom API.
18. Staff permissions must be limited to the store approval workflow.
19. Pagination should be used for list endpoints.
20. Serializers must expose only the information appropriate to the requesting user and endpoint.

The implementation may choose the most appropriate Django REST Framework class structure, permission classes, serializer structure, and internal services, provided that the externally defined behavior and business rules remain intact.
