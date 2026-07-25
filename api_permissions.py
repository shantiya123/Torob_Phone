"""Reusable role and ownership permissions for the TG-006 API layer."""

from rest_framework.permissions import BasePermission

from accounts.models import AccountProfile
from marketplace.models import Store


def user_store(user):
    """Return the authenticated user's Store without leaking relation errors."""
    if not getattr(user, "is_authenticated", False):
        return None
    profile = getattr(user, "account_profile", None)
    if profile is None or profile.account_type != AccountProfile.AccountType.STORE:
        return None
    return getattr(profile, "store", None)


class IsCustomer(BasePermission):
    message = "Only customer accounts may perform this action."

    def has_permission(self, request, view):
        profile = getattr(request.user, "account_profile", None)
        return bool(
            request.user.is_authenticated
            and profile is not None
            and profile.account_type == AccountProfile.AccountType.CUSTOMER
        )


class IsStaffUser(BasePermission):
    """Allow Django Staff users without requiring an AccountProfile."""

    message = "Only staff users may perform this action."

    def has_permission(self, request, view):
        return bool(request.user.is_authenticated and request.user.is_staff)


class IsStoreOwner(BasePermission):
    message = "Only store accounts may perform this action."

    def has_permission(self, request, view):
        return user_store(request.user) is not None


class IsStoreCatalogUser(IsStoreOwner):
    """Allow the operational catalog browser only to non-staff store users."""

    message = "Only non-staff store accounts may browse the store catalog."

    def has_permission(self, request, view):
        return not getattr(request.user, "is_staff", False) and super().has_permission(request, view)


class IsApprovedStore(IsStoreOwner):
    message = "Only approved stores may perform this action."

    def has_permission(self, request, view):
        store = user_store(request.user)
        return store is not None and store.status == Store.Status.ACTIVE


class OwnsOffer(IsStoreOwner):
    def has_object_permission(self, request, view, obj):
        store = user_store(request.user)
        return store is not None and obj.store_id == store.id


class IsTorobcheUser(BasePermission):
    """Customers and store accounts may use Torobche; staff may not."""

    message = "Only customer or store accounts may use Torobche."

    def has_permission(self, request, view):
        profile = getattr(request.user, "account_profile", None)
        return bool(
            request.user.is_authenticated
            and not request.user.is_staff
            and profile is not None
            and profile.account_type in {
                AccountProfile.AccountType.CUSTOMER,
                AccountProfile.AccountType.STORE,
            }
        )
