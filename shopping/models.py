from django.conf import settings
from django.db import models
from django.db.models import Q

from marketplace.models import Offer, Store


class Basket(models.Model):
    """A customer's single active basket."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="basket"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Basket({self.user})"


class BasketItem(models.Model):
    """A specific Offer selected by the customer, with reserved quantity.

    Points to an Offer (not just a DeviceVariant), since different stores may
    offer the same product at different prices. The same offer can appear
    only once per basket; adding it again should update the quantity.
    """

    basket = models.ForeignKey(Basket, on_delete=models.CASCADE, related_name="items")
    offer = models.ForeignKey(Offer, on_delete=models.CASCADE, related_name="basket_items")
    quantity = models.PositiveIntegerField(default=1)
    # The initial migration and serializer contract already persist this
    # purchase-time snapshot; keep the model state aligned with both.
    unit_price = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["basket", "offer"], name="unique_basket_offer_item"),
            models.CheckConstraint(condition=Q(quantity__gt=0), name="basket_item_quantity_positive"),
        ]

    def __str__(self):
        return f"{self.offer} x{self.quantity}"


class Order(models.Model):
    """One store's portion of a checked-out basket.

    A checkout may create multiple orders — one per store represented in the
    basket. References the originating basket for provenance.
    """

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"
        CANCELLED = "cancelled", "Cancelled"
        COMPLETED = "completed", "Completed"

    basket = models.ForeignKey(Basket, on_delete=models.CASCADE, related_name="orders")
    store = models.ForeignKey(Store, on_delete=models.PROTECT, related_name="orders")
    status = models.CharField(max_length=20, choices=Status, default=Status.PENDING)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Order #{self.pk} - {self.store.name} ({self.status})"


class OrderItem(models.Model):
    """A specific Offer purchased from a store, at its purchase-time price.

    ``unit_price`` is captured at purchase time and must not follow later
    changes to the Offer's current price.
    """

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name="items")
    offer = models.ForeignKey(Offer, on_delete=models.PROTECT, related_name="order_items")
    quantity = models.PositiveIntegerField()
    unit_price = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.CheckConstraint(condition=Q(quantity__gt=0), name="order_item_quantity_positive"),
        ]

    def __str__(self):
        return f"{self.offer} x{self.quantity} @ {self.unit_price}"


class CheckoutAttempt(models.Model):
    """Durable idempotency record for customer financial operations."""

    class Status(models.TextChoices):
        PROCESSING = "processing", "Processing"
        SUCCEEDED = "succeeded", "Succeeded"
        FAILED = "failed", "Failed"

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="checkout_attempts"
    )
    operation = models.CharField(max_length=32)
    idempotency_key = models.CharField(max_length=128)
    status = models.CharField(max_length=16, choices=Status, default=Status.PROCESSING)
    response_payload = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "operation", "idempotency_key"],
                name="unique_financial_idempotency_key",
            )
        ]
