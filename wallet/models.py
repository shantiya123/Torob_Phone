from django.conf import settings
from django.db import models

from shopping.models import Order


class Wallet(models.Model):
    """A user's balance. Every user has exactly one wallet."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="wallet"
    )
    balance = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Wallet({self.user}) = {self.balance}"


class WalletTransaction(models.Model):
    """A single balance change on a Wallet.

    ``amount`` sign convention: positive = money added to the wallet,
    negative = money removed from the wallet. ``balance_after`` records the
    resulting balance so each transaction is a direct snapshot of wallet
    state, independent of transaction ordering.
    """

    class TransactionType(models.TextChoices):
        CHARGE = "charge", "Charge"
        PURCHASE = "purchase", "Purchase"
        REFUND = "refund", "Refund"

    wallet = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name="transactions")
    order = models.ForeignKey(
        Order, null=True, blank=True, on_delete=models.SET_NULL, related_name="wallet_transactions"
    )
    amount = models.IntegerField()
    balance_after = models.IntegerField()
    transaction_type = models.CharField(max_length=20, choices=TransactionType)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.transaction_type} {self.amount} -> {self.balance_after}"
