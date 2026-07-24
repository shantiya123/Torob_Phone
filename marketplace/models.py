from django.conf import settings
from django.db import models
from django.db.models import Q

from accounts.models import AccountProfile


class Store(models.Model):
    """A marketplace seller/company. A store account owns exactly one store."""

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACTIVE = "active", "Active"
        SUSPENDED = "suspended", "Suspended"
        REJECTED = "rejected", "Rejected"

    account_profile = models.OneToOneField(
        AccountProfile, on_delete=models.CASCADE, related_name="store"
    )
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=280, unique=True, allow_unicode=True)
    description = models.TextField(null=True, blank=True)
    logo = models.ImageField(upload_to="store_logos/", null=True, blank=True)
    business_phone = models.CharField(max_length=32)
    business_email = models.EmailField(null=True, blank=True)
    address = models.TextField()
    status = models.CharField(max_length=20, choices=Status, default=Status.PENDING)
    reviewed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="reviewed_stores",
    )
    reviewed_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class StoreLegalProfile(models.Model):
    """Private legal/business registration information for a store.

    This is platform-internal information and is not automatically part of
    the store's public profile.
    """

    store = models.OneToOneField(Store, on_delete=models.CASCADE, related_name="legal_profile")
    legal_name = models.CharField(max_length=255)
    business_type = models.CharField(max_length=100)
    business_registration_number = models.CharField(max_length=100, null=True, blank=True)
    national_identifier = models.CharField(max_length=100, null=True, blank=True)
    tax_identifier = models.CharField(max_length=100, null=True, blank=True)
    legal_representative_name = models.CharField(max_length=255)
    legal_representative_national_identifier = models.CharField(max_length=100, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Legal profile for {self.store.name}"


class Offer(models.Model):
    """A store's price/quantity listing for an existing catalog.DeviceVariant.

    An offer is not a separate product — it references the catalog variant
    directly and must not duplicate its technical information.
    """

    store = models.ForeignKey(Store, on_delete=models.CASCADE, related_name="offers")
    device_variant = models.ForeignKey(
        "catalog.DeviceVariant", on_delete=models.PROTECT, related_name="offers"
    )
    price = models.PositiveIntegerField()
    quantity = models.PositiveIntegerField(default=0)
    description = models.TextField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["store", "device_variant"], name="unique_store_device_variant_offer"
            ),
            models.CheckConstraint(condition=Q(price__gt=0), name="offer_price_positive"),
            models.CheckConstraint(condition=Q(quantity__gte=0), name="offer_quantity_nonnegative"),
        ]

    @property
    def is_available(self):
        return self.quantity > 0

    def __str__(self):
        return f"{self.store.name} - {self.device_variant}"
