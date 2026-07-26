from collections import defaultdict
from decimal import Decimal

from django.db.models import Count, Sum

from marketplace.models import Offer, Store
from shopping.models import BasketItem, CheckoutAttempt, Order, OrderItem
from wallet.models import Wallet, WalletTransaction

from simulation.models import SimulationRun


PRIVATE_KEYS = {
    "business_phone",
    "business_email",
    "address",
    "legal_profile",
    "owner",
    "rejection_reason",
    "reviewed_by",
    "reviewed_at",
    "national_identifier",
    "tax_identifier",
    "business_registration_number",
    "legal_representative_national_identifier",
}


def _integer_ids(values):
    return [int(value) for value in values if str(value).isdigit()]


def finding(code, severity, detail, count=1):
    return {"code": code, "severity": severity, "detail": detail, "count": count}


def audit_run(run):
    artifacts = run.artifacts.all()
    user_ids = _integer_ids(
        artifacts.filter(app_label="auth", model_name="user").values_list("object_pk", flat=True)
    )
    store_ids = _integer_ids(
        artifacts.filter(app_label="marketplace", model_name="store").values_list("object_pk", flat=True)
    )
    offer_ids = _integer_ids(
        artifacts.filter(app_label="marketplace", model_name="offer").values_list("object_pk", flat=True)
    )
    wallet_ids = _integer_ids(
        artifacts.filter(app_label="wallet", model_name="wallet").values_list("object_pk", flat=True)
    )
    order_ids = _integer_ids(
        artifacts.filter(app_label="shopping", model_name="order").values_list("object_pk", flat=True)
    )
    findings = []

    negative_offers = Offer.objects.filter(pk__in=offer_ids, quantity__lt=0).count()
    if negative_offers:
        findings.append(finding("negative_offer_quantity", "critical", "Offer quantity is negative.", negative_offers))

    negative_wallets = Wallet.objects.filter(pk__in=wallet_ids, balance__lt=0).count()
    if negative_wallets:
        findings.append(finding("negative_wallet_balance", "critical", "Wallet balance is negative.", negative_wallets))

    duplicate_items = (
        BasketItem.objects.filter(basket__user_id__in=user_ids)
        .values("basket_id", "offer_id")
        .annotate(rows=Count("id"))
        .filter(rows__gt=1)
        .count()
    )
    if duplicate_items:
        findings.append(finding("duplicate_basket_offer", "critical", "A Basket contains duplicate Offer rows.", duplicate_items))

    cancelled_with_refund = Order.objects.filter(
        pk__in=order_ids,
        status=Order.Status.CANCELLED,
        wallet_transactions__transaction_type=WalletTransaction.TransactionType.REFUND,
    ).values("pk").annotate(refunds=Count("wallet_transactions")).filter(refunds__gt=1).count()
    if cancelled_with_refund:
        findings.append(finding("duplicate_refund", "critical", "An Order has more than one refund.", cancelled_with_refund))

    for wallet in Wallet.objects.filter(pk__in=wallet_ids).prefetch_related("transactions"):
        balance = 0
        ordered = list(wallet.transactions.order_by("created_at", "pk"))
        for tx in ordered:
            balance += tx.amount
            if tx.balance_after != balance:
                findings.append(finding(
                    "wallet_balance_after_mismatch",
                    "critical",
                    f"Wallet {wallet.pk} transaction {tx.pk} has an inconsistent balance_after.",
                ))
                break
        if balance != wallet.balance:
            findings.append(finding(
                "wallet_balance_mismatch",
                "critical",
                f"Wallet {wallet.pk} transaction sum does not equal current balance.",
            ))

    for order in Order.objects.filter(pk__in=order_ids).prefetch_related("items", "wallet_transactions"):
        line_total = sum(item.unit_price * item.quantity for item in order.items.all())
        purchase_total = -sum(
            tx.amount for tx in order.wallet_transactions.all()
            if tx.transaction_type == WalletTransaction.TransactionType.PURCHASE and tx.amount < 0
        )
        if line_total <= 0:
            findings.append(finding("invalid_order_total", "critical", f"Order {order.pk} has no positive line total."))
        if order.status == Order.Status.PAID and purchase_total != line_total:
            findings.append(finding(
                "purchase_order_mismatch",
                "critical",
                f"Paid Order {order.pk} purchase total does not equal item total.",
            ))

    duplicate_financial_keys = (
        CheckoutAttempt.objects.filter(user_id__in=user_ids)
        .values("user_id", "operation", "idempotency_key")
        .annotate(rows=Count("id"))
        .filter(rows__gt=1)
        .count()
    )
    if duplicate_financial_keys:
        findings.append(finding(
            "duplicate_idempotency_execution",
            "critical",
            "A financial operation has duplicate idempotency rows.",
            duplicate_financial_keys,
        ))

    active_invalid_stores = Store.objects.filter(
        pk__in=store_ids,
        status=Store.Status.ACTIVE,
    ).filter(account_profile__user_id__isnull=True).count()
    if active_invalid_stores:
        findings.append(finding(
            "store_without_owner",
            "critical",
            "An active simulation Store has no owner profile.",
            active_invalid_stores,
        ))

    return {
        "run_id": run.run_id,
        "passed": not any(item["severity"] == "critical" for item in findings),
        "findings": findings,
        "counts": {
            "users": len(user_ids),
            "stores": len(store_ids),
            "offers": len(offer_ids),
            "wallets": len(wallet_ids),
            "orders": len(order_ids),
        },
    }


def contains_private_keys(value):
    if isinstance(value, dict):
        return bool(set(value) & PRIVATE_KEYS) or any(contains_private_keys(item) for item in value.values())
    if isinstance(value, list):
        return any(contains_private_keys(item) for item in value)
    return False


def audit_public_payload(payload):
    return {
        "passed": not contains_private_keys(payload),
        "private_keys": sorted(PRIVATE_KEYS),
    }
