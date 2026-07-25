"""Strict boundary for the conversational GapGPT response wrapper."""

import json
import logging
from dataclasses import dataclass

from .query_set import QuerySetValidationError, validate_query_set

logger = logging.getLogger(__name__)
FALLBACK_MESSAGE = "تغییرات موردنظر شما اعمال شد."
MAX_MESSAGE_LENGTH = 500


class ProviderResponseError(ValueError):
    pass


@dataclass(frozen=True)
class ProviderQueryResponse:
    message: str
    query_set: dict
    message_fallback: bool = False


def parse_provider_query_response(content):
    """Validate the wrapper, then send only its nested queryset to the old validator."""
    try:
        value = json.loads(content)
    except json.JSONDecodeError as exc:
        raise ProviderResponseError("GapGpt returned invalid JSON.") from exc
    if not isinstance(value, dict) or set(value) != {"message", "queryset"}:
        raise ProviderResponseError("GapGpt returned an invalid response wrapper.")
    if not isinstance(value["queryset"], dict):
        raise ProviderResponseError("GapGpt response queryset must be an object.")
    try:
        query_set = validate_query_set(value["queryset"])
    except QuerySetValidationError as exc:
        raise ProviderResponseError(f"GapGpt returned an invalid QuerySet: {exc}") from exc

    message = value["message"]
    valid_message = isinstance(message, str) and bool(message.strip()) and len(message.strip()) <= MAX_MESSAGE_LENGTH
    if not valid_message:
        logger.warning("GapGpt returned an invalid conversational message; using fallback.")
        return ProviderQueryResponse(FALLBACK_MESSAGE, query_set, message_fallback=True)
    return ProviderQueryResponse(message.strip(), query_set)
