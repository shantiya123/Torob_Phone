"""Transactional shopping-domain operations."""

from django.db import transaction
from django.db.models import F
from django.utils import timezone

from marketplace.models import Offer
from wallet.models import WalletTransaction
from wallet.services import create_transaction, locked_wallet

from .models import Basket, BasketItem, CheckoutAttempt, Order, OrderItem, basket_reservation_deadline


class OrderCancellationError(ValueError):
    """Raised when an order cannot make the cancellation transition."""


class CheckoutError(ValueError):
    def __init__(self, code, detail, **extra):
        super().__init__(detail)
        self.code = code
        self.detail = detail
        self.extra = extra


def release_basket_item_locked(item, offer=None, *, dry_run=False):
    """Release one locked reservation and delete its BasketItem."""

    offer = offer or Offer.objects.select_for_update().get(pk=item.offer_id)
    if dry_run:
        return item.quantity
    offer.quantity = F("quantity") + item.quantity
    offer.save(update_fields=["quantity", "updated_at"])
    quantity = item.quantity
    item.delete()
    return quantity


def release_expired_basket_items(*, user=None, basket=None, batch_size=200, dry_run=False):
    """Release expired reservations in bounded, repeatable batches."""

    now = timezone.now()
    base = BasketItem.objects.filter(expires_at__lte=now)
    if user is not None:
        base = base.filter(basket__user=user)
    if basket is not None:
        base = base.filter(basket=basket)
    if dry_run:
        return {
            "found": base.count(),
            "released": 0,
            "units_restored": sum(base.values_list("quantity", flat=True)),
        }
    found = released = units = 0
    while True:
        with transaction.atomic():
            items = list(
                base.select_for_update()
                .select_related("basket")
                .order_by("expires_at", "pk")[:batch_size]
            )
            if not items:
                break
            found += len(items)
            for item in items:
                units += release_basket_item_locked(item)
                released += 1
    return {"found": found, "released": released, "units_restored": units}


def consume_basket_items(basket):
    """Consume reservations after successful checkout without restoring stock."""

    BasketItem.objects.filter(basket=basket).delete()


def _checkout_payload(attempt, orders, wallet):
    from .serializers import OrderSummarySerializer

    summaries = OrderSummarySerializer(
        orders, many=True, context={}
    ).data
    return {
        "checkout_id": str(attempt.pk),
        "orders": summaries,
        "order_count": len(summaries),
        "total": sum(item["total"] for item in summaries),
        "wallet_balance": wallet.balance,
    }


@transaction.atomic
def _checkout_customer_atomic(user, idempotency_key):
    """Perform one atomic wallet-funded checkout."""

    attempt, created = CheckoutAttempt.objects.select_for_update().get_or_create(
        user=user,
        operation="checkout",
        idempotency_key=idempotency_key,
        defaults={"status": CheckoutAttempt.Status.PROCESSING},
    )
    if not created:
        if attempt.status == CheckoutAttempt.Status.SUCCEEDED:
            return attempt.response_payload, True
        raise CheckoutError(
            "checkout_in_progress",
            "A checkout with this idempotency key is already processing.",
        )

    basket = Basket.objects.select_for_update().filter(user=user).first()
    if basket is None:
        raise CheckoutError("basket_empty", "The basket is empty.")
    items = list(
        basket.items.select_for_update().order_by("pk")
    )
    if not items:
        raise CheckoutError("basket_empty", "The basket is empty.")
    now = timezone.now()
    expired_ids = [item.pk for item in items if item.expires_at <= now]
    if expired_ids:
        raise CheckoutError(
            "basket_reservation_expired",
            "One or more Basket reservations expired before checkout.",
            expired_item_ids=expired_ids,
        )

    locked_items = []
    offers = {}
    for item in items:
        if item.quantity <= 0 or item.unit_price <= 0:
            raise CheckoutError("checkout_invalid_item", "The basket contains an invalid item.")
        if item.offer_id in offers:
            raise CheckoutError("checkout_invalid_item", "The basket contains duplicate offers.")
        try:
            offer = Offer.objects.select_for_update().select_related(
                "store", "device_variant__device_model__brand"
            ).get(pk=item.offer_id)
        except Offer.DoesNotExist as exc:
            raise CheckoutError("checkout_offer_unavailable", "An offer is no longer available.") from exc
        if offer.store.status != offer.store.Status.ACTIVE:
            raise CheckoutError("checkout_store_unavailable", "A Store is no longer active.")
        if not offer.device_variant.is_available:
            raise CheckoutError("checkout_variant_unavailable", "A selected variant is unavailable.")
        if not offer.device_variant.device_model.is_catalog_eligible:
            raise CheckoutError("checkout_variant_unavailable", "A selected phone is not catalog-eligible.")
        offers[item.offer_id] = offer
        locked_items.append(item)

    wallet = locked_wallet(user)
    total = sum(item.quantity * item.unit_price for item in locked_items)
    if wallet.balance < total:
        raise CheckoutError(
            "insufficient_wallet_balance",
            "Wallet balance is insufficient for this checkout.",
            required_total=total,
            wallet_balance=wallet.balance,
            shortfall=total - wallet.balance,
        )

    grouped = {}
    for item in locked_items:
        grouped.setdefault(offers[item.offer_id].store_id, []).append(item)

    orders = []
    for store_id in sorted(grouped):
        order = Order.objects.create(
            basket=basket,
            store_id=store_id,
            status=Order.Status.PAID,
        )
        OrderItem.objects.bulk_create(
            [
                OrderItem(
                    order=order,
                    offer=offers[item.offer_id],
                    quantity=item.quantity,
                    unit_price=item.unit_price,
                )
                for item in grouped[store_id]
            ]
        )
        orders.append(order)

    wallet_balance = wallet.balance
    for order in orders:
        order_total = sum(
            item.quantity * item.unit_price for item in grouped[order.store_id]
        )
        wallet_balance -= order_total
        wallet.balance = wallet_balance
        create_transaction(
            wallet,
            amount=-order_total,
            transaction_type=WalletTransaction.TransactionType.PURCHASE,
            order=order,
        )
    wallet.save(update_fields=["balance", "updated_at"])
    consume_basket_items(basket)

    orders = list(
        Order.objects.select_related("store")
        .prefetch_related("items")
        .filter(pk__in=[order.pk for order in orders])
        .order_by("store_id", "pk")
    )
    payload = _checkout_payload(attempt, orders, wallet)
    attempt.status = CheckoutAttempt.Status.SUCCEEDED
    attempt.response_payload = payload
    attempt.save(update_fields=["status", "response_payload", "updated_at"])
    return payload, False


def checkout_customer(user, idempotency_key):
    """Run checkout, releasing expired lines after an atomic conflict."""

    try:
        return _checkout_customer_atomic(user, idempotency_key)
    except CheckoutError as exc:
        if exc.code == "basket_reservation_expired":
            # The atomic checkout rolled back; release the expired lines in a
            # separate committed transaction so valid lines remain reserved.
            release_expired_basket_items(user=user)
        raise


@transaction.atomic
def cancel_order(order_id):
    """Cancel an order and return ``(order, stock_restored)``.

    The locked order status is the idempotency guard. Only the transaction
    that changes a pending/paid order to cancelled restores stock.
    """
    order = Order.objects.select_for_update().select_related("basket").get(pk=order_id)
    if order.status == Order.Status.COMPLETED:
        raise OrderCancellationError("Completed orders cannot be cancelled.")
    if order.status == Order.Status.CANCELLED:
        refund = WalletTransaction.objects.filter(
            order=order, transaction_type=WalletTransaction.TransactionType.REFUND
        ).first()
        wallet_balance = refund.wallet.balance if refund else None
        return order, False, None, wallet_balance
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

    refund = None
    wallet_balance = None
    if order.status == Order.Status.PAID:
        purchase = WalletTransaction.objects.select_for_update().filter(
            order=order,
            transaction_type=WalletTransaction.TransactionType.PURCHASE,
        ).first()
        if purchase is not None and purchase.amount < 0:
            wallet = locked_wallet(order.basket.user)
            refund_amount = -purchase.amount
            wallet.balance += refund_amount
            wallet.save(update_fields=["balance", "updated_at"])
            refund = create_transaction(
                wallet,
                amount=refund_amount,
                transaction_type=WalletTransaction.TransactionType.REFUND,
                order=order,
            )
            wallet_balance = wallet.balance

    order.status = Order.Status.CANCELLED
    order.save(update_fields=["status", "updated_at"])
    return order, True, refund, wallet_balance
