# Simulation invariants

The Stage 4 validator checks run-owned rows for:

- nonnegative Offer quantities;
- nonnegative Wallet balances;
- unique Basket/Offer lines;
- Wallet transaction `balance_after` reconciliation;
- Order line-total reconciliation;
- paid Order purchase-total reconciliation;
- one financial execution per Customer/operation/idempotency key;
- Store owner/profile consistency;
- duplicate refund detection.

The public-response privacy helper recursively rejects business, legal,
review, owner, national-identifier, and tax-identifier fields from public
Store and Offer payloads.

The validator returns a nonzero command result when a critical finding is
present. It does not claim PostgreSQL locking certification when run on
SQLite.
