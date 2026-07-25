"""Stateful orchestration for LLM query modification and deterministic filtering."""

from dataclasses import dataclass

from .filtering import filter_catalog
from .query_adapter import normalize_query_set, query_set_to_filter_requirements
from .query_set import empty_query_set, validate_query_set


@dataclass(frozen=True)
class QueryProcessingResult:
    query_set: dict
    requirements: object
    candidates: object
    message: str
    message_fallback: bool = False


class QuerySetModificationService:
    """Keep only the last fully validated QuerySet as conversation state."""

    def __init__(self, provider, initial_query_set=None):
        self.provider = provider
        self._current_query_set = validate_query_set(initial_query_set or empty_query_set())

    @property
    def current_query_set(self):
        return validate_query_set(self._current_query_set)

    def process_user_query(self, user_text, current_query_set=None):
        previous = validate_query_set(current_query_set) if current_query_set is not None else self.current_query_set
        # No state changes occur until response validation, normalization, and adaptation all succeed.
        provider_response = self.provider.modify(previous, user_text)
        # Keep test/dummy providers using the former direct-QuerySet contract
        # compatible while production providers use the validated wrapper.
        if hasattr(provider_response, "query_set"):
            modified = provider_response.query_set
            message = provider_response.message
            message_fallback = provider_response.message_fallback
        else:
            modified = provider_response
            message = "تغییرات موردنظر شما اعمال شد."
            message_fallback = True
        normalized = normalize_query_set(validate_query_set(modified))
        requirements = query_set_to_filter_requirements(normalized)
        candidates = filter_catalog(requirements)
        self._current_query_set = normalized
        return QueryProcessingResult(normalized, requirements, candidates, message, message_fallback)
