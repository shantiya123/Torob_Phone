# Customer orders API

All customer-order routes require a customer profile. Store accounts, staff,
and anonymous requests are rejected.

## List orders

`GET /api/orders/?status=pending` uses normal pagination and accepts only
`pending`, `paid`, `cancelled`, or `completed`.

```json
{
  "count": 1,
  "next": null,
  "previous": null,
  "results": [{
    "id": 42,
    "status": "pending",
    "store": {"id": 8, "name": "Mobile Center"},
    "item_count": 2,
    "total": 50000000,
    "created_at": "...",
    "updated_at": "..."
  }]
}
```

`item_count` is the sum of purchased quantities, not the number of item rows.
Totals and line totals come from `OrderItem.unit_price` purchase snapshots.

## Detail, checkout, and cancellation

`GET /api/orders/<id>/` includes each item’s offer ID, concise variant identity,
historical `unit_price`, and `line_total`. Offer prices can change later
without changing historical totals; offers are protected while order items
reference them.

`POST /api/orders/` accepts `{}` plus a required `Idempotency-Key` header; no
price, stock, store, or status input is trusted. It validates the reserved
BasketItem context, charges the Customer Wallet atomically, creates one paid
order per Store, and returns a structured response containing `checkout_id`,
`orders`, `order_count`, `total`, and `wallet_balance`. Replaying the same key
returns the stored response without a second charge or Order.

`POST /api/orders/<id>/cancel/` returns the Order, `stock_restored`,
`refund`, `refund_created`, and `wallet_balance`. Paid wallet Orders receive
one positive refund transaction and stock restoration; repeated cancellation
does neither again. Legacy pending Orders without a purchase transaction
restore stock but do not create money. A non-cancellable order returns
`order_not_cancellable`.
