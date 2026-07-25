"""Wallet serializers.

Implements docs/Serializers.md sections 15 (Wallet Serializers) and
16 (Wallet Transaction Serializer). Both are read-only from the client's
perspective: ``balance``, ``amount``, and ``balance_after`` are only ever
changed by controlled backend/domain operations (charges, purchases,
refunds), never accepted as serializer input.
"""

from rest_framework import serializers

from .models import Wallet, WalletTransaction


class WalletSerializer(serializers.ModelSerializer):
    """Represents the authenticated user's own wallet. See 15.1 / 15.3.

    ``balance`` is read-only; it changes only through controlled wallet
    service/payment flows, never through a direct client update.
    """

    class Meta:
        model = Wallet
        fields = ["id", "balance", "created_at", "updated_at"]
        read_only_fields = fields


class WalletTransactionSerializer(serializers.ModelSerializer):
    """Represents one balance change on a wallet. See section 16.

    Read-only to normal users: transactions are created exclusively by
    controlled backend operations (charge, purchase, refund), never by
    direct client input such as ``{"amount": 1000000}``.
    """

    class Meta:
        model = WalletTransaction
        fields = ["id", "amount", "balance_after", "transaction_type", "order", "created_at"]
        read_only_fields = fields


class WalletChargeSerializer(serializers.Serializer):
    amount = serializers.IntegerField(min_value=1_000_000, max_value=100_000_000)

    def validate_amount(self, value):
        if isinstance(value, bool):
            raise serializers.ValidationError("Amount must be an integer.")
        return value


class WalletChargeResponseSerializer(serializers.Serializer):
    wallet = WalletSerializer(read_only=True)
    transaction = WalletTransactionSerializer(read_only=True)
