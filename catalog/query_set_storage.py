"""User-scoped persistence for the existing validated QuerySet contract."""

from django.db import IntegrityError, transaction

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
    with transaction.atomic():
        try:
            saved = UserQuerySet.objects.select_for_update().get(user=user)
        except UserQuerySet.DoesNotExist:
            try:
                with transaction.atomic():
                    UserQuerySet.objects.create(user=user, query_set=validated)
            except IntegrityError:
                # Another request created the one-to-one row first; lock and
                # replace it with this request's already validated state.
                saved = UserQuerySet.objects.select_for_update().get(user=user)
                saved.query_set = validated
                saved.save(update_fields=["query_set", "updated_at"])
        else:
            saved.query_set = validated
            saved.save(update_fields=["query_set", "updated_at"])
    return validated


def get_saved_query_set_state(user):
    """Return a validated QuerySet and its persisted timestamp, if any."""
    try:
        saved = UserQuerySet.objects.get(user=user)
    except UserQuerySet.DoesNotExist:
        return None, None
    return validate_query_set(saved.query_set), saved.updated_at


def reset_query_set(user):
    """Replace the user's saved state with the all-null QuerySet template."""
    return save_query_set(user, empty_query_set())


def has_active_filters(query_set):
    """Whether a QuerySet contains any non-null preference or threshold."""
    if isinstance(query_set, dict):
        return any(has_active_filters(value) for value in query_set.values())
    return query_set is not None
