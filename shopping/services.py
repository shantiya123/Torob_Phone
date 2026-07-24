"""Transactional shopping-domain operations."""

from django.db import transaction
from django.db.models import F

from marketplace.models import Offer

from .models import Order, OrderItem


class OrderCancellationError(ValueError):
    """Raised when an order cannot make the cancellation transition."""


@transaction.atomic
def cancel_order(order_id):
    """Cancel an order and return ``(order, stock_restored)``.

    The locked order status is the idempotency guard. Only the transaction
    that changes a pending/paid order to cancelled restores stock.
    """
    order = Order.objects.select_for_update().get(pk=order_id)
    if order.status == Order.Status.COMPLETED:
        raise OrderCancellationError("Completed orders cannot be cancelled.")
    if order.status == Order.Status.CANCELLED:
        return order, False
    if order.status not in {Order.Status.PENDING, Order.Status.PAID}:
        raise OrderCancellationError("This order cannot be cancelled.")

    items = list(OrderItem.objects.select_for_update().filter(order=order))
    offers = {
        offer.pk: offer
        for offer in Offer.objects.select_for_update().filter(
            pk__in={item.offer_id for item in items}
        )
    }
    for item in items:
        offer = offers[item.offer_id]
        offer.quantity = F("quantity") + item.quantity
        offer.save(update_fields=["quantity", "updated_at"])

    order.status = Order.Status.CANCELLED
    order.save(update_fields=["status", "updated_at"])
    return order, True
