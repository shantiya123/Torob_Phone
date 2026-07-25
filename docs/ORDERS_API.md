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

`POST /api/orders/` accepts no price, stock, store, or status input. It keeps
the compatible bare array response, with one order summary for each store in
the basket. The frontend confirmation page should use that returned array.

`POST /api/orders/<id>/cancel/` returns `{ "order": {...},
"stock_restored": true }`. Repeating cancellation returns
`stock_restored: false`; there is no basket recreation or wallet refund. A
non-cancellable order returns error code `order_not_cancellable`.
