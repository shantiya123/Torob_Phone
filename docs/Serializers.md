# Serializer Specification

## 1. Purpose

This document defines the serializer layer of the backend.

Serializers are responsible for:

* Validating incoming API data.
* Converting validated request data into model operations.
* Controlling which model fields are writable.
* Controlling which model fields are read-only.
* Representing model data in API responses.
* Preventing clients from modifying ownership, prices, balances, statuses, and other protected data.

The serializers must work together with:

* `views.md`
* `models.md`
* Django permissions
* DRF authentication
* Domain/service logic where business operations require transactions or multiple model changes.

Serializers must not be treated as the only security layer.

Authorization and ownership must also be enforced by views, permissions, querysets, and domain logic where appropriate.

---

# 2. General Serializer Principles

## 2.1 Never Trust Ownership From the Client

The client must not be allowed to choose ownership fields.

For example, this must not be trusted:

```json
{
    "store": 15
}
```

The store must be determined from:

```text
request.user
    ↓
AccountProfile
    ↓
Store
```

The same principle applies to:

* User ownership
* Basket ownership
* Wallet ownership
* Store ownership
* Order ownership

The client must not be able to submit another user's ID and claim ownership of an object.

---

## 2.2 Protected Fields Must Be Read-Only

Fields controlled by the backend must not be writable through normal serializers.

Examples include:

```text
id
created_at
updated_at
owner
store
reviewed_by
reviewed_at
status
balance
balance_after
unit_price snapshots
```

The exact field may be writable through a specialized administrative or domain workflow, but it must not be exposed as an unrestricted client-controlled field.

---

## 2.3 Do Not Create One Universal Serializer For Everything

Different contexts require different representations.

For example:

```text
Public Store
    ↓
Minimal public information

Store Owner
    ↓
Own editable store information

Staff
    ↓
Private review and verification information
```

Therefore, separate serializers should be preferred when the data visibility or write behavior differs significantly.

---

# 3. Authentication Serializers

## 3.1 Customer Registration

### Serializer

```text
CustomerRegistrationSerializer
```

### Purpose

Creates a customer account.

The request should contain the necessary Django user credentials and account information.

Example:

```json
{
    "username": "customer",
    "email": "customer@example.com",
    "password": "secure-password",
    "account_type": "CUSTOMER"
}
```

The serializer must:

1. Validate the user credentials.
2. Validate the password using Django's password validation system.
3. Create the Django User.
4. Create the AccountProfile.
5. Set:

```text
account_type = CUSTOMER
```

The operation should be atomic.

The client must not be able to create:

* Staff users.
* Superusers.
* Arbitrary permissions.
* An account with an undefined type.

The client must not submit:

```text
is_staff
is_superuser
groups
user_permissions
```

as registration-controlled values.

---

## 3.2 Store Registration

### Serializer

```text
StoreRegistrationSerializer
```

### Purpose

Creates the complete store account structure in one request.

The request may contain:

```json
{
    "username": "store_owner",
    "email": "owner@example.com",
    "password": "secure-password",
    "account_type": "STORE",

    "store": {
        "name": "Example Store",
        "description": "A phone store",
        "business_phone": "...",
        "business_email": "...",
        "address": "..."
    },

    "legal_profile": {
        "legal_name": "...",
        "business_type": "...",
        "business_registration_number": "...",
        "national_identifier": "...",
        "tax_identifier": "...",
        "legal_representative_name": "...",
        "legal_representative_national_identifier": "..."
    }
}
```

The serializer must create:

```text
User
    ↓
AccountProfile(account_type=STORE)
    ↓
Store(status=PENDING)
    ↓
StoreLegalProfile
```

The complete operation must be atomic.

If any required part fails validation, the complete registration must fail without leaving partial account data.

The initial store status must be:

```text
PENDING
```

The client must not choose the initial status.

The client must not submit:

```text
reviewed_by
reviewed_at
rejection_reason
```

during registration.

---

## 3.3 Current User Serializer

### Serializer

```text
CurrentUserSerializer
```

### Purpose

Represents the authenticated user's own account.

The serializer may expose:

```text
id
username
email
account_type
created_at
```

The exact fields should follow the actual User and AccountProfile models.

The user may update permitted account fields such as:

```text
email
```

if the project allows it.

The user must not modify:

```text
account_type
is_staff
is_superuser
groups
user_permissions
```

through this serializer.

---

# 4. AccountProfile Serializers

## 4.1 AccountProfileSerializer

### Serializer

```text
AccountProfileSerializer
```

### Purpose

Represents the authenticated user's account type and profile metadata.

The following should generally be read-only:

```text
account_type
created_at
updated_at
```

The account type is selected during registration.

It should not be casually changed through the normal profile API.

A role transition requires a dedicated business workflow if it is ever implemented.

---

# 5. Store Serializers

## 5.1 Public Store List Serializer

### Serializer

```text
StorePublicListSerializer
```

### Purpose

Represents a store in the public store list.

The response should contain only minimal public information.

Possible fields:

```text
id
name
slug
logo
```

The serializer should not expose private legal information.

The store list supports normal name search and pagination.

No LLM is involved.

---

## 5.2 Public Store Detail Serializer

### Serializer

```text
StorePublicDetailSerializer
```

### Purpose

Represents public information about one store.

Possible fields:

```text
id
name
slug
description
logo
created_at
```

Business phone, business email, and address are private and belong only to the
Store-owner and Staff-review serializers.

The following must not be exposed publicly:

```text
StoreLegalProfile
business_registration_number
national_identifier
tax_identifier
legal_representative_national_identifier
reviewed_by
rejection_reason
private review metadata
```

---

## 5.3 Store Owner Serializer

### Serializer

```text
StoreOwnerSerializer
```

### Purpose

Allows the authenticated store owner to view and update their own store information.

The serializer may expose editable fields such as:

```text
name
description
logo
business_phone
business_email
address
```

The following must not be freely writable by the store owner:

```text
account_profile
status
reviewed_by
reviewed_at
rejection_reason
```

The store owner cannot change ownership.

---

## 5.4 Store Legal Profile Serializer

### Serializer

```text
StoreLegalProfileSerializer
```

### Purpose

Represents private legal/business information.

This serializer should not be used for public store responses.

Access should be restricted to the appropriate owner or staff workflow.

The legal fields may include:

```text
legal_name
business_type
business_registration_number
national_identifier
tax_identifier
legal_representative_name
legal_representative_national_identifier
```

The platform currently collects this information but does not necessarily perform complete legal verification of every field.

The serializer must still validate basic input correctness.

Examples:

* Appropriate maximum lengths.
* Required fields where configured.
* Appropriate string formats where practical.
* No negative or invalid numeric values if numeric fields are used.

---

# 6. Store Review Serializers

Store review is an administrative workflow.

Normal public and store-owner serializers must not expose review-control fields as writable fields.

A dedicated serializer may be used for staff review operations.

### Serializer

```text
StoreReviewSerializer
```

Possible input:

```json
{
    "status": "ACTIVE"
}
```

or:

```json
{
    "status": "REJECTED",
    "rejection_reason": "..."
}
```

The serializer must enforce valid transitions.

Examples:

```text
PENDING → ACTIVE
PENDING → REJECTED
REJECTED → PENDING
```

The exact transition implementation may be handled by the administrative workflow.

Review metadata should be assigned by the backend:

```text
reviewed_by = request.user
reviewed_at = current time
```

The client must not submit:

```text
reviewed_by
reviewed_at
```

as arbitrary values.

---

# 7. Offer Serializers

## 7.1 Public Offer List Serializer

### Serializer

```text
OfferListSerializer
```

### Purpose

Represents an offer in a list of offers for a `DeviceVariant`.

Possible fields:

```text
id
store
price
quantity
available
description
```

The store should be represented using a minimal public store serializer.

For example:

```json
{
    "id": 42,
    "store": {
        "id": 5,
        "name": "Example Store"
    },
    "price": 500,
    "quantity": 10,
    "available": true,
    "description": "..."
}
```

`available` is derived from:

```text
quantity > 0
```

It must be read-only.

It must never be accepted as an input field.

---

## 7.2 Public Offer Detail Serializer

### Serializer

```text
OfferDetailSerializer
```

### Purpose

Represents one public offer.

It may include:

```text
id
device_variant
store
price
quantity
available
description
created_at
updated_at
```

The exact representation of `device_variant` may use a nested summary serializer or a reference depending on the endpoint.

Private store information must not be exposed.

---

## 7.3 Offer Create Serializer

### Serializer

```text
OfferCreateSerializer
```

### Input

```json
{
    "device_variant": 42,
    "price": 500,
    "quantity": 10,
    "description": "..."
}
```

The client must not submit:

```text
store
available
created_at
updated_at
```

The store is determined from the authenticated user.

The serializer must validate:

### DeviceVariant

The referenced `DeviceVariant` must exist.

The serializer must not create a new catalog product.

### Price

The price must:

* Be an integer.
* Be positive.
* Not be a floating-point monetary value.
* Follow the project's chosen monetary unit convention.

Example:

```text
price > 0
```

### Quantity

The quantity must:

* Be an integer.
* Be non-negative.
* Never be negative.

Depending on the business rule for creating offers, a zero quantity may be accepted as an initially unavailable offer.

### Description

The description must respect the configured maximum length.

The serializer should reject invalid or excessively large input.

### Uniqueness

The combination:

```text
store + device_variant
```

must be unique.

The serializer should return a clean validation error if the store already has an offer for that `DeviceVariant`.

The database constraint must also enforce the rule.

---

## 7.4 Offer Update Serializer

### Serializer

```text
OfferUpdateSerializer
```

### Purpose

Allows the owning store to update permitted fields.

Permitted fields may include:

```text
price
quantity
description
```

The following must not be writable:

```text
store
device_variant
available
created_at
updated_at
```

Changing `device_variant` is not equivalent to updating an offer.

If a store wants to sell a different variant, it should create a separate offer.

---

## 7.5 Availability

Availability must be derived:

```text
quantity > 0
    → available = true

quantity = 0
    → available = false
```

The API may expose:

```json
{
    "quantity": 0,
    "available": false
}
```

but the client must never submit:

```json
{
    "quantity": 0,
    "available": true
}
```

The serializer must not store a separate availability state if the model does not have one.

---

# 8. Catalog Serializers

## 8.1 DeviceVariant List Serializer

### Serializer

```text
DeviceVariantListSerializer
```

### Purpose

Represents a `DeviceVariant` in search results.

The serializer should contain enough information for the client to identify the product.

The exact fields must follow the existing catalog model structure.

The marketplace must not duplicate catalog technical fields into a marketplace model.

---

## 8.2 DeviceVariant Detail Serializer

### Serializer

```text
DeviceVariantDetailSerializer
```

### Purpose

Represents a complete customer-facing `DeviceVariant`.

The serializer may include relevant catalog information such as:

```text
brand
device model
variant configuration
technical specifications
```

The serializer must read from the existing catalog domain.

The marketplace must not create a second product representation.

---

# 9. Search Serializers

## 9.1 Search Request Serializer

### Serializer

```text
SearchRequestSerializer
```

### Purpose

Validates the structure of a search request.

A request may contain:

```text
message
query_set
ordering
```

Example:

```json
{
    "message": "I want a Samsung phone with a large battery",
    "query_set": null,
    "ordering": "price_asc"
}
```

For a continued search:

```json
{
    "message": "Only show me newer models",
    "query_set": {
        "...": "..."
    },
    "ordering": "newest"
}
```

The serializer validates the request structure.

The existing QuerySet validation system remains responsible for validating the QuerySet itself.

The serializer must not allow arbitrary database field names or arbitrary ordering expressions.

---

## 9.2 Search Result Serializer

### Serializer

```text
SearchResultSerializer
```

This may reuse or extend:

```text
DeviceVariantListSerializer
```

The search response should contain paginated `DeviceVariant` results.

The backend may include calculated marketplace information such as:

```text
minimum_available_price
```

if required by the response contract.

Price ordering must use the minimum price among currently available offers.

---

# 10. Basket Serializers

## 10.1 Basket Serializer

### Serializer

```text
BasketSerializer
```

### Purpose

Represents the authenticated user's current basket.

Possible response:

```json
{
    "id": 1,
    "items": [],
    "total": 1000,
    "created_at": "...",
    "updated_at": "..."
}
```

The exact total implementation may be calculated from:

```text
BasketItem.unit_price × BasketItem.quantity
```

The client must not submit the total.

The total is read-only.

---

## 10.2 Basket Item Serializer

### Serializer

```text
BasketItemSerializer
```

### Output

Possible fields:

```text
id
offer
quantity
unit_price
total
created_at
updated_at
```

The following are read-only:

```text
unit_price
total
created_at
updated_at
```

The client must never choose the price.

---

## 10.3 Basket Item Create Serializer

### Serializer

```text
BasketItemCreateSerializer
```

### Input

```json
{
    "offer": 42,
    "quantity": 2
}
```

The serializer must validate:

* The offer exists.
* The quantity is positive.
* The requested quantity is available.
* The user is allowed to use the offer.
* The offer is not unavailable.

The client must not submit:

```text
unit_price
total
basket
```

The basket is determined from the authenticated user.

The unit price is copied from the current offer price by the backend.

Conceptually:

```text
Offer.price
    ↓
BasketItem.unit_price
```

This operation must be performed atomically with stock reservation.

---

## 10.4 Basket Item Update Serializer

### Serializer

```text
BasketItemUpdateSerializer
```

### Input

```json
{
    "quantity": 4
}
```

Only the quantity should be writable.

The serializer must not allow:

```text
offer
unit_price
total
basket
```

to be changed through normal updates.

---

# 11. Basket Reservation Rules

Basket quantity reserves inventory immediately.

Example:

```text
Offer.quantity = 5
```

The user adds:

```text
quantity = 2
```

Result:

```text
Offer.quantity = 3
BasketItem.quantity = 2
```

If the user changes the basket quantity from:

```text
2 → 4
```

the backend must reserve two additional units.

If the user changes:

```text
4 → 1
```

the backend must return three units to the offer.

The serializer validates the requested final quantity.

The service or transactional domain logic must calculate the reservation difference.

Conceptually:

```text
quantity_difference =
    new_quantity - old_quantity
```

Positive difference:

```text
reserve more inventory
```

Negative difference:

```text
return inventory
```

This operation must be protected against race conditions.

The implementation should use appropriate database transactions and row locking where necessary.

---

# 12. Basket Item Price Snapshot

The basket item stores the price at the moment it is added.

Therefore, `BasketItem` should contain:

```text
unit_price
```

The model becomes conceptually:

```text
BasketItem
├── basket
├── offer
├── quantity
├── unit_price
├── created_at
└── updated_at
```

When the item is created:

```text
Offer.price = 500
```

the backend stores:

```text
BasketItem.unit_price = 500
```

If the store later changes:

```text
Offer.price = 600
```

the basket item remains:

```text
BasketItem.unit_price = 500
```

The serializer must expose `unit_price` as read-only.

The client must never be able to submit:

```json
{
    "unit_price": 1
}
```

to manipulate the purchase price.

---

# 13. Order Serializers

## 13.1 Order Creation

### Serializer

```text
OrderCreateSerializer
```

The client should not manually submit order items, stores, or prices.

The request may be empty:

```json
{}
```

The backend obtains the authenticated user's basket.

The checkout process:

```text
Basket
    ↓
Group BasketItems by Store
    ↓
Create one Order per Store
    ↓
Create OrderItems
    ↓
Copy historical prices
```

Example:

```text
Basket
├── Store A Offer 1
├── Store A Offer 2
└── Store B Offer 3
```

becomes:

```text
Order A → Store A
    ├── OrderItem 1
    └── OrderItem 2

Order B → Store B
    └── OrderItem 3
```

The entire checkout operation should be atomic.

---

## 13.2 Order Serializer

### Serializer

```text
OrderSerializer
```

Possible output:

```text
id
store
status
items
total
created_at
updated_at
```

The following are read-only:

```text
id
store
status
total
created_at
updated_at
```

Order status must be controlled by the backend and valid domain transitions.

---

## 13.3 Order Item Serializer

### Serializer

```text
OrderItemSerializer
```

Possible fields:

```text
id
offer
quantity
unit_price
total
created_at
```

The following are read-only:

```text
unit_price
total
created_at
```

The `unit_price` must represent the price at the time of purchase.

The serializer must not calculate the current price from:

```text
Offer.price
```

for historical order totals.

The historical price is:

```text
OrderItem.unit_price
```

---

# 14. Order Price Snapshot

The price flow is:

```text
Offer.price
    ↓ when added to basket
BasketItem.unit_price
    ↓ at checkout
OrderItem.unit_price
```

Example:

```text
Offer.price = 500
```

Customer adds it:

```text
BasketItem.unit_price = 500
```

The store changes the offer:

```text
Offer.price = 600
```

The customer checks out:

```text
OrderItem.unit_price = 500
```

The order must represent the historical transaction.

The current offer price must not rewrite historical order prices.

---

# 15. Wallet Serializers

## 15.1 Wallet Serializer

### Serializer

```text
WalletSerializer
```

### Purpose

Represents the authenticated user's wallet.

Possible fields:

```text
id
balance
created_at
updated_at
```

The wallet belongs to exactly one user.

The user may view their own wallet.

The user must not access another user's wallet.

---

## 15.2 Wallet Lifecycle

A wallet is a persistent one-to-one resource.

Conceptually:

```text
User
    ↓
Wallet
```

The normal API must not:

```text
POST /wallets/
```

to create arbitrary wallets.

The normal API must not:

```text
DELETE /wallets/
```

to delete a user's wallet.

The wallet is created as part of the account/domain lifecycle according to the project's implementation.

The wallet should not disappear merely because a user has a zero balance.

---

## 15.3 Wallet Balance

The client must not directly modify:

```text
balance
```

This must be read-only through the normal wallet serializer.

The balance changes through controlled backend operations.

The exact wallet service/payment flows may be implemented separately.

---

# 16. Wallet Transaction Serializer

## 16.1 Wallet Transaction Serializer

### Serializer

```text
WalletTransactionSerializer
```

Possible fields:

```text
id
amount
balance_after
transaction_type
order
created_at
```

These fields should be read-only to normal users.

The user must not directly submit:

```json
{
    "amount": 1000000,
    "balance_after": 1000000
}
```

to modify their wallet.

Wallet transactions must be created by controlled backend operations.

---

## 16.2 Transaction History

Users may view their own wallet transaction history.

The response may be paginated.

Users must not access another user's transactions.

Each transaction records:

```text
amount
balance_after
transaction_type
created_at
```

If the transaction is associated with an order:

```text
order
```

may reference that order.

The transaction may also exist without an order.

---

# 17. Money Validation

All monetary values must use integer representation.

The serializers must reject floating-point monetary values where appropriate.

Bad:

```json
{
    "price": 99.99
}
```

The project must use one consistent integer monetary convention.

For example, the project may define:

```text
1 integer unit = 1 currency unit
```

or:

```text
1 integer unit = smallest currency unit
```

The exact convention must be consistent across:

```text
Offer.price
BasketItem.unit_price
OrderItem.unit_price
Wallet.balance
WalletTransaction.amount
WalletTransaction.balance_after
```

The serializers must not silently convert between inconsistent conventions.

---

# 18. Read-Only Field Summary

## User

```text
account_type
is_staff
is_superuser
permissions
```

must not be freely writable.

---

## Store

```text
status
reviewed_by
reviewed_at
```

must be controlled by the review workflow.

---

## Offer

```text
store
available
created_at
updated_at
```

must not be client-controlled.

---

## Basket

```text
user
total
created_at
updated_at
```

must not be client-controlled.

---

## BasketItem

```text
basket
unit_price
total
created_at
updated_at
```

must not be client-controlled.

---

## Order

```text
store
status
total
created_at
updated_at
```

must be controlled by the backend.

---

## OrderItem

```text
unit_price
total
created_at
```

must be historical backend-controlled values.

---

## Wallet

```text
user
balance
created_at
updated_at
```

must not be directly modified by the client.

---

## WalletTransaction

```text
wallet
amount
balance_after
transaction_type
order
created_at
```

must be created through controlled backend operations.

---

# 19. Validation Responsibilities

Validation should be divided appropriately.

## Serializer Validation

Serializers should handle:

* Required fields.
* Basic type validation.
* Field lengths.
* Basic value constraints.
* Positive and non-negative values.
* Password validation.
* Basic cross-field input validation.

---

## Model Validation

Models and database constraints should handle:

* Fundamental data integrity.
* Uniqueness.
* Check constraints.
* Relationship constraints.

Examples:

```text
Store + DeviceVariant
    UNIQUE

Basket + Offer
    UNIQUE

Offer.quantity >= 0

Offer.price > 0
```

---

## View and Permission Validation

Views and permissions should handle:

* Authentication.
* Object ownership.
* Store ownership.
* Staff permissions.
* Customer-only operations.
* Store-only operations.

---

## Domain/Service Validation

Domain services should handle complex operations involving multiple changes.

Examples:

```text
Adding a basket item
    ↓
Validate stock
    ↓
Reserve stock
    ↓
Create BasketItem
    ↓
Snapshot price
```

```text
Updating basket quantity
    ↓
Calculate quantity difference
    ↓
Reserve or release stock
    ↓
Update BasketItem
```

```text
Checkout
    ↓
Group by store
    ↓
Create Orders
    ↓
Create OrderItems
    ↓
Copy historical prices
    ↓
Update related state
```

These operations should be transactional.

---

# 20. Serializer Naming Convention

Serializer names should clearly describe their context.

Recommended examples:

```text
CustomerRegistrationSerializer
StoreRegistrationSerializer
CurrentUserSerializer

StorePublicListSerializer
StorePublicDetailSerializer
StoreOwnerSerializer
StoreLegalProfileSerializer
StoreReviewSerializer

DeviceVariantListSerializer
DeviceVariantDetailSerializer

SearchRequestSerializer
SearchResultSerializer

OfferListSerializer
OfferDetailSerializer
OfferCreateSerializer
OfferUpdateSerializer

BasketSerializer
BasketItemSerializer
BasketItemCreateSerializer
BasketItemUpdateSerializer

OrderSerializer
OrderItemSerializer
OrderCreateSerializer

WalletSerializer
WalletTransactionSerializer
```

The implementation may combine serializers where the behavior is genuinely identical.

However, it should not force one serializer to serve incompatible public, private, owner, and staff contexts.

---

# 21. Implementation Goal

The serializer layer should provide a clean and safe API boundary.

The client should be able to:

```text
Register
    ↓
Search
    ↓
View products
    ↓
View offers
    ↓
Add an offer to a basket
    ↓
Modify quantity
    ↓
Checkout
    ↓
View orders
    ↓
View wallet and transactions
```

The client must not be able to:

```text
Change offer ownership
Change historical prices
Set wallet balances
Create arbitrary wallet transactions
Create catalog products through marketplace APIs
Modify another user's data
Modify another store's offers
Approve its own store
Set its own review status
```

The core rule is:

> The serializer validates client input, but the backend remains the authority over ownership, prices, inventory, balances, historical records, and platform status.
