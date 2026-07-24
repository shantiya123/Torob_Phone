"""User-scoped persistence for the existing validated QuerySet contract."""

from .models import UserQuerySet
from .query_set import empty_query_set, validate_query_set


def get_saved_query_set(user):
    """Return a validated saved QuerySet, or ``None`` when no state exists."""
    try:
        saved = UserQuerySet.objects.get(user=user)
    except UserQuerySet.DoesNotExist:
        return None
    return validate_query_set(saved.query_set)


def save_query_set(user, query_set):
    """Persist only a strict, deep-copied QuerySet."""
    validated = validate_query_set(query_set)
    UserQuerySet.objects.update_or_create(user=user, defaults={"query_set": validated})
    return validated


def reset_query_set(user):
    """Replace the user's saved state with the all-null QuerySet template."""
    return save_query_set(user, empty_query_set())


def has_active_filters(query_set):
    """Whether a QuerySet contains any non-null preference or threshold."""
    if isinstance(query_set, dict):
        return any(has_active_filters(value) for value in query_set.values())
    return query_set is not None
