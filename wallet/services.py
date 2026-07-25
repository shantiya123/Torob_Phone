from django.db import transaction

from shopping.models import CheckoutAttempt

from .models import Wallet, WalletTransaction


def locked_wallet(user):
    wallet, _ = Wallet.objects.select_for_update().get_or_create(user=user)
    return wallet


def create_transaction(wallet, *, amount, transaction_type, order=None):
    return WalletTransaction.objects.create(
        wallet=wallet,
        order=order,
        amount=amount,
        balance_after=wallet.balance,
        transaction_type=transaction_type,
    )


@transaction.atomic
def charge_wallet(user, amount, idempotency_key):
    """Atomically apply a demo charge and return ``(payload, replayed)``."""

    attempt, created = CheckoutAttempt.objects.select_for_update().get_or_create(
        user=user,
        operation="wallet_charge",
        idempotency_key=idempotency_key,
        defaults={"status": CheckoutAttempt.Status.PROCESSING},
    )
    if not created:
        if attempt.status == CheckoutAttempt.Status.SUCCEEDED:
            return attempt.response_payload, True
        if attempt.status == CheckoutAttempt.Status.PROCESSING:
            raise ValueError("A wallet charge with this idempotency key is already processing.")

    wallet = locked_wallet(user)
    wallet.balance += amount
    wallet.save(update_fields=["balance", "updated_at"])
    transaction_record = create_transaction(
        wallet,
        amount=amount,
        transaction_type=WalletTransaction.TransactionType.CHARGE,
    )
    payload = {
        "wallet": {
            "id": wallet.pk,
            "balance": wallet.balance,
            "created_at": wallet.created_at.isoformat(),
            "updated_at": wallet.updated_at.isoformat(),
        },
        "transaction": {
            "id": transaction_record.pk,
            "amount": transaction_record.amount,
            "balance_after": transaction_record.balance_after,
            "transaction_type": transaction_record.transaction_type,
            "order": None,
            "created_at": transaction_record.created_at.isoformat(),
        },
    }
    attempt.status = CheckoutAttempt.Status.SUCCEEDED
    attempt.response_payload = payload
    attempt.save(update_fields=["status", "response_payload", "updated_at"])
    return payload, False
