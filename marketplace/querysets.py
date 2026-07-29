"""Shared marketplace queryset helpers."""

from .models import Offer, Store


def public_offer_queryset():
    """Canonical public Offer eligibility rules shared by public endpoints."""

    return Offer.objects.select_related(
        "store", "device_variant__device_model__brand"
    ).filter(
        store__status=Store.Status.ACTIVE,
        quantity__gt=0,
        device_variant__is_available=True,
        device_variant__device_model__is_catalog_eligible=True,
    )
