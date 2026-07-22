# Models Foundation

## Purpose

This document defines the domain model foundation for the project.

Codex must read and understand this document before implementing or modifying models.

The goal is to build a clean marketplace and shopping system around the existing `catalog` app while keeping the existing catalog data structure intact.

This document defines the important domain concepts, relationships, constraints, and business rules discussed during architecture design.

Codex may complete unspecified implementation details using Django and backend best practices, but must not contradict the decisions in this document.

---

# 1. Core Architectural Principle

The existing `catalog` app owns the phone catalog.

The marketplace and shopping system must be built around it.

The catalog should not be unnecessarily modified to support marketplace functionality.

The existing catalog models and relationships are currently:

```text
DataSource
ImportRun
Brand
DeviceModel
SourceRecord
CanonicalFieldEvidence
DeviceVariant
PerformanceSpec
DisplaySpec
BatterySpec
CameraSystem
CameraLens
ConnectivitySpec
PhysicalSpec
SoftwareSpec
BenchmarkMeasurement
```

The most important relationship for the marketplace is:

```text
DeviceModel
    │
    └── DeviceVariant
```

From the customer's perspective:

> Each `DeviceVariant` is treated as a separate phone/product.

For example:

```text
Samsung Galaxy S26 - 8GB / 128GB
Samsung Galaxy S26 - 12GB / 256GB
Samsung Galaxy S26 - 16GB / 512GB
```

These are separate products from the customer's perspective.

The marketplace must not create a second product representation that duplicates `DeviceVariant`.

The marketplace should reference:

```text
catalog.DeviceVariant
```

directly.

---

# 2. Application Structure

The project should use separate Django apps.

```text
catalog/
    Existing phone/catalog domain

accounts/
    Account identity and account type

marketplace/
    Stores and offers

shopping/
    Baskets and orders

wallet/
    User balance and wallet transactions
```

## App Responsibilities

### `catalog`

Owns:

* phone/device information
* brands
* device models
* device variants
* technical specifications
* source records
* catalog imports

The marketplace must not duplicate phone/product information.

---

### `accounts`

Owns:

* account profile
* account type
* customer/store account distinction

The project uses Django's built-in `User` model.

Do not create a custom replacement user model unless there is a strong technical reason.

---

### `marketplace`

Owns:

* stores
* store legal/business information
* offers

A store can only submit an offer for a `catalog.DeviceVariant` that already exists in the catalog.

Stores cannot create new phones or modify catalog information.

---

### `shopping`

Owns:

* baskets
* basket items
* orders
* order items

---

### `wallet`

Owns:

* user wallets
* wallet balances
* wallet transactions

---

# 3. Account Model

## `AccountProfile`

Relationship:

```text
User
  │
  └── AccountProfile
```

Fields:

```text
AccountProfile
├── user → Django User (OneToOne)
├── account_type
├── created_at
└── updated_at
```

### `account_type`

Possible values:

```text
CUSTOMER
STORE
```

The account type is selected during signup.

There must not be an initial undefined account type.

Rules:

```text
CUSTOMER
    → the account is a customer account

STORE
    → the account owns exactly one Store
```

A user has only one account role.

A store account cannot simultaneously function as a customer account.

A store can only return to the customer role after its store has been removed from the platform.

The exact implementation of this transition may be designed by Codex.

---

# 4. Store Model

## `Store`

A Store represents a marketplace seller/company.

Relationship:

```text
AccountProfile
    │
    └── Store
```

A store belongs to exactly one account profile.

A store account owns exactly one store.

Suggested fields:

```text
Store
├── account_profile → AccountProfile (OneToOne)
├── name
├── slug
├── description
├── logo
├── business_phone
├── business_email
├── address
├── status
├── reviewed_by → Django User (nullable)
├── reviewed_at (nullable)
├── rejection_reason (nullable)
├── created_at
└── updated_at
```

## Store Information

### Required business information

The store should have the necessary information to represent a real business.

At minimum:

```text
name
business_phone
address
```

The exact required/optional choices for minor fields may be finalized by Codex according to standard Django design.

### Public business contact information

The store may have business contact information separate from the user's Django account information.

For example:

```text
Django User email:
owner@gmail.com

Store business email:
support@store.com
```

Therefore, store business contact fields must not be assumed to be the same as authentication/account contact fields.

### Address

The store has one address.

The address should be stored as a simple free-text field.

Do not create a separate address model.

Do not unnecessarily split the address into country, province, city, street, etc.

### Logo

The logo is optional.

An `ImageField` is appropriate.

The exact upload configuration may be completed by Codex.

---

# 5. Store Status and Review

The platform validates stores before they become active.

Suggested lifecycle:

```text
PENDING
    ↓
Admin review
    ↓
ACTIVE
```

Possible rejection flow:

```text
PENDING
    ↓
REJECTED
    ↓
Store updates information
    ↓
PENDING
```

A rejected store can update its information and resubmit.

There is no requirement to preserve a full application history at this stage.

The current/latest review information is sufficient.

Suggested fields:

```text
status
reviewed_by
reviewed_at
rejection_reason
```

The exact status names and implementation may be completed by Codex using standard Django practices.

The project must include a staff/admin role capable of validating and managing stores.

Django's built-in staff and permission system may be used as the foundation.

A custom staff/admin panel may be implemented later.

---

# 6. Store Legal Profile

## `StoreLegalProfile`

Private legal/business information belongs to the platform and should not automatically be treated as public store profile information.

Relationship:

```text
Store
    1 ───────── 1
        StoreLegalProfile
```

A store and its legal profile are created together.

A valid Store should have exactly one StoreLegalProfile.

Suggested fields:

```text
StoreLegalProfile
├── store → Store (OneToOne)
├── legal_name
├── business_type
├── business_registration_number
├── national_identifier
├── tax_identifier
├── legal_representative_name
├── legal_representative_national_identifier
├── created_at
└── updated_at
```

These fields represent knowledge of a real store-registration process.

For now, the platform does not need to perform full legal verification of every field.

The fields represent the information the platform would collect and keep privately.

Codex may choose appropriate field types and optionality for legal fields based on standard practice.

---

# 7. Offer Model

## `Offer`

An Offer represents a store saying:

> I have this specific catalog product, at this price, with this quantity.

An offer is not a separate product.

An offer belongs to exactly one store and exactly one catalog device variant.

Relationship:

```text
Store
    1 ───────── N
        Offer
          N ───────── 1
                catalog.DeviceVariant
```

Suggested fields:

```text
Offer
├── store → Store
├── device_variant → catalog.DeviceVariant
├── price
├── quantity
├── description
├── created_at
└── updated_at
```

## Offer Uniqueness

There can be only one offer for a specific store and specific `DeviceVariant`.

```text
Store + DeviceVariant = UNIQUE
```

Example:

```text
Store A
    └── Galaxy S26 8/128
        └── One Offer
```

This is invalid:

```text
Store A
    ├── Galaxy S26 8/128 → Offer 1
    └── Galaxy S26 8/128 → Offer 2
```

The store may update its existing offer.

The store may delete its existing offer.

The store may create offers for multiple different variants.

Example:

```text
Store A
├── S26 8/128
├── S26 12/256
└── S26 16/512
```

This is valid.

---

# 8. Offer Price

The price is an integer monetary value.

All monetary values in this project should use integer representation.

The exact currency/unit convention should be consistent throughout the project.

Do not use floating-point numbers for money.

The exact integer unit may be finalized by Codex according to the project's currency conventions.

---

# 9. Offer Quantity and Availability

The offer has a quantity field representing the quantity currently available for purchase.

```text
quantity
```

Availability is derived from quantity.

```text
quantity > 0
    → available

quantity = 0
    → unavailable
```

Do not store a separate `is_available` field unless a future requirement explicitly makes it necessary.

This prevents contradictory states such as:

```text
quantity = 0
is_available = true
```

The store cannot manually mark a zero-quantity offer as available.

The quantity should have appropriate validation.

Negative quantity is invalid.

---

# 10. Offer Description

Each store may write its own description for its offer.

This description is free-form.

The description belongs to the offer, not the catalog product.

Example:

```text
Store A:
"Official warranty included."

Store B:
"Fast delivery available."
```

The platform does not need to control the exact content structure of the description at this stage.

---

# 11. Offer Deletion Rules

If a Store is physically deleted:

```text
Store
    ↓ delete
Offers belonging to Store
    ↓
Deleted immediately
```

Therefore:

```text
Store → Offer
    ON DELETE CASCADE
```

If a `DeviceVariant` is referenced by offers:

```text
DeviceVariant
    ↓
Offer exists
    ↓
Deletion should be protected
```

Therefore:

```text
Offer → DeviceVariant
    ON DELETE PROTECT
```

Deleting a catalog variant must not silently destroy marketplace offers.

---

# 12. Basket

A customer has one basket at a time.

Relationship:

```text
User
  │
  └── Basket
```

Suggested fields:

```text
Basket
├── user → Django User (OneToOne)
├── created_at
└── updated_at
```

There should not be multiple active baskets for one user.

The exact behavior when a basket is emptied or checked out may be completed by Codex.

---

# 13. BasketItem

A BasketItem represents a specific Offer selected by the customer.

Important:

The basket item points to an `Offer`, not only to a `DeviceVariant`.

This is necessary because different stores may offer the same product at different prices.

Example:

```text
Store A
    Galaxy S26
    500

Store B
    Galaxy S26
    550
```

The customer selects a specific store offer.

Relationship:

```text
Basket
    │
    └── BasketItem
          │
          └── Offer
```

Suggested fields:

```text
BasketItem
├── basket → Basket
├── offer → Offer
├── quantity
├── created_at
└── updated_at
```

## BasketItem Uniqueness

The same offer can appear only once in the same basket.

```text
Basket + Offer = UNIQUE
```

If the customer adds the same offer again, the quantity should be updated rather than creating another BasketItem.

---

# 14. Basket Stock Reservation

When an offer is added to a basket, the selected quantity is reserved immediately.

The offer's available quantity decreases immediately.

Example:

```text
Offer.quantity = 5
```

Customer adds:

```text
BasketItem.quantity = 2
```

Result:

```text
Offer.quantity = 3
BasketItem.quantity = 2
```

If the customer removes the BasketItem:

```text
Offer.quantity = 5
```

The reserved quantity is returned to the offer.

If an offer reaches zero:

```text
Offer.quantity = 0
```

It is unavailable for new customers.

The exact transaction/concurrency implementation is an implementation concern and should be handled safely by Codex.

The model must represent the current state correctly.

---

# 15. Order

A checkout can contain offers from multiple stores.

Each store receives its own separate order.

Example:

```text
Basket
├── Store A Offer 1
├── Store A Offer 2
└── Store B Offer 3
```

After checkout:

```text
Order A
    → Store A

Order B
    → Store B
```

Therefore:

```text
Order
    └── Store
```

Each Order belongs to exactly one Store.

Suggested fields:

```text
Order
├── basket → Basket
├── store → Store
├── status
├── created_at
└── updated_at
```

An Order references the Basket from which it was created.

One Basket may produce multiple Orders because a Basket may contain products from multiple Stores.

---

# 16. Order Status

An Order has a status field.

Suggested statuses:

```text
PENDING
PAID
CANCELLED
COMPLETED
```

The exact lifecycle and transitions may be completed by Codex using standard domain design.

The status must be represented explicitly rather than inferred from unrelated fields.

---

# 17. OrderItem

An OrderItem represents a specific Offer purchased from a Store.

Relationship:

```text
Order
    │
    └── OrderItem
          │
          └── Offer
```

Suggested fields:

```text
OrderItem
├── order → Order
├── offer → Offer
├── quantity
├── unit_price
└── created_at
```

`unit_price` must be stored at purchase time.

The current Offer price may change later.

Example:

```text
Purchase:
Offer price = 500
Quantity = 2
```

OrderItem:

```text
unit_price = 500
quantity = 2
```

Later:

```text
Offer price = 600
```

The old OrderItem still represents:

```text
2 × 500
```

This is necessary so that an order represents what the customer actually purchased.

---

# 18. Wallet

Users have a wallet and balance.

Relationship:

```text
User
  │
  └── Wallet
```

Suggested fields:

```text
Wallet
├── user → Django User (OneToOne)
├── balance
├── created_at
└── updated_at
```

The balance is an integer monetary value.

No floating-point money values.

A user has one wallet.

---

# 19. WalletTransaction

Wallet balance changes should be represented by transactions.

Relationship:

```text
Wallet
    │
    └── WalletTransaction
```

Suggested fields:

```text
WalletTransaction
├── wallet → Wallet
├── order → Order (nullable)
├── amount
├── balance_after
├── transaction_type
└── created_at
```

## Transaction Types

Suggested types:

```text
CHARGE
PURCHASE
REFUND
```

The exact naming may be finalized by Codex.

---

# 20. WalletTransaction and Order

A WalletTransaction may exist without an Order.

Examples:

```text
Wallet charge
    → order = NULL
```

```text
Purchase payment
    → order = specific Order
```

```text
Refund
    → order = specific Order
```

Therefore:

```text
WalletTransaction
    └── Order (nullable)
```

is valid.

---

# 21. Wallet Transaction Amount

The amount is an integer.

The project must use one consistent convention for transaction signs.

For example, Codex may choose:

```text
positive amount
    → money added to wallet

negative amount
    → money removed from wallet
```

or another consistent convention.

The convention must be documented and used consistently.

---

# 22. Wallet Balance Snapshot

Each WalletTransaction stores the balance after the transaction:

```text
balance_after
```

Example:

```text
Previous balance: 1000
Transaction: -300
New balance: 700
```

Transaction:

```text
amount = -300
balance_after = 700
```

This provides a direct record of the wallet state after each transaction.

---

# 23. Staff and Administration

The project needs a platform staff/admin role.

Staff should be able to:

* review stores
* approve stores
* reject stores
* update store information where appropriate
* manage catalog-related administrative operations where appropriate
* perform future platform administration tasks

Django's built-in staff and permission system should be used as the foundation.

A custom staff panel may be implemented later.

Do not create an unnecessary separate Admin model unless a future requirement requires one.

---

# 24. Important Domain Boundaries

The following boundaries must remain clear.

## Catalog owns phone data

```text
catalog
    └── DeviceVariant
```

The catalog owns:

* phone identity
* model information
* technical specifications
* variant configuration

---

## Marketplace owns store offers

```text
marketplace
    └── Offer
```

The marketplace owns:

* store
* store profile
* store legal information
* price
* quantity
* offer description

The marketplace must not duplicate the phone's technical information.

---

## Shopping owns customer purchasing state

```text
shopping
    ├── Basket
    ├── BasketItem
    ├── Order
    └── OrderItem
```

---

## Wallet owns balance and transactions

```text
wallet
    ├── Wallet
    └── WalletTransaction
```

---

# 25. Core Relationship Summary

```text
Django User
│
├── AccountProfile
│     │
│     └── Store
│           │
│           ├── StoreLegalProfile
│           │
│           └── Offer
│                 │
│                 └── catalog.DeviceVariant
│
├── Basket
│     │
│     ├── BasketItem
│     │     └── Offer
│     │
│     └── Order
│           │
│           ├── Store
│           │
│           └── OrderItem
│                 └── Offer
│
└── Wallet
      │
      └── WalletTransaction
            └── Order (optional)
```

---

# 26. Important Constraints Summary

```text
AccountProfile.user
    → OneToOne with User

AccountProfile.account_type
    → required

Store.account_profile
    → OneToOne

StoreLegalProfile.store
    → OneToOne

Store + DeviceVariant
    → UNIQUE Offer

Basket.user
    → OneToOne

Basket + Offer
    → UNIQUE BasketItem

BasketItem.quantity
    → positive

Offer.quantity
    → non-negative

Offer.price
    → positive

Store deletion
    → delete its Offers

DeviceVariant deletion
    → protect if Offers exist

Wallet.user
    → OneToOne
```

---

# 27. Implementation Freedom for Codex

Codex should complete unspecified implementation details according to:

* Django best practices
* database integrity
* PostgreSQL best practices
* clean model design
* appropriate indexes
* appropriate validators
* appropriate `related_name`s
* appropriate `on_delete` behavior where not explicitly specified
* appropriate model `Meta` configuration
* appropriate database constraints
* appropriate field lengths
* appropriate null/blank choices

However, Codex must not change the following fundamental decisions:

1. `catalog` remains the source of truth for phones.
2. A `DeviceVariant` is treated as a separate product from the customer's perspective.
3. Stores cannot create or modify catalog phones.
4. A store has one unique offer per `DeviceVariant`.
5. Offers can be updated or deleted by their store.
6. Offer availability is derived from quantity.
7. Store deletion deletes its offers.
8. Catalog variant deletion must not silently delete offers.
9. A user has one account role: Customer or Store.
10. A store account owns one store.
11. A user has one basket.
12. A basket item points to a specific Offer.
13. One basket item exists per Offer in a basket.
14. Basket quantity is reserved against store offer quantity.
15. One checkout may create multiple orders, one per store.
16. Each order belongs to one store.
17. Orders have an explicit status.
18. Order items preserve the purchase-time unit price.
19. Users have wallets.
20. Wallet balance and transactions use integer monetary values.
21. Wallet transactions may optionally reference an Order.
22. Wallet transactions store `balance_after`.
23. Store legal information is kept separately from public store information.
24. Staff/admin functionality is required for store validation.
25. No unnecessary duplication of catalog data should be introduced.

---

# 28. Implementation Goal

The goal is not to build an unnecessarily complex enterprise marketplace.

The goal is to create a clean, understandable domain foundation for this project.

Models should represent the important business concepts and relationships.

Codex should use its knowledge and standard Django practices to complete details that were intentionally not specified here.

After implementing the models:

1. Run migrations.
2. Validate all model relationships.
3. Add appropriate database constraints.
4. Add appropriate indexes.
5. Add model tests for important invariants.
6. Do not modify the existing catalog structure unless absolutely necessary.
7. Report any contradiction between this document and the existing code before making architectural changes.
]