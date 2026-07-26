# Simulation test data guide

The seed command uses a deterministic Python random generator. The same
`--seed`, preset, and catalog state produce logically equivalent records.

| Preset | Customers | Stores | Offers | Historical orders |
|---|---:|---:|---:|---:|
| small | 10 | 4 | 30 | 20 |
| medium | 100 | 20 | 500 | 300 |
| large | 1,000 | 100 | 3,000 | 2,000 |

The catalog is reference data. Seeding reuses eligible available
`DeviceVariant` rows and does not delete them during cleanup.

Store data includes active, pending, rejected, and suspended states. Offers
include public, out-of-stock, and inactive-context records. Shopping data
includes wallets, charge/purchase/refund transactions, baskets, reservations,
and historical orders.

Passwords are generated only in memory from the seed for synthetic users.
They are never written to reports.
