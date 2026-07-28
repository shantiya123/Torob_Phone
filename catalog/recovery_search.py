"""Conservative, proposal-only recovery plans for empty Torobche searches."""

from copy import deepcopy
from dataclasses import dataclass

from django.db import DatabaseError

from .filtering import filter_catalog
from .query_adapter import UnsupportedQuerySetFieldError, query_set_to_filter_requirements
from .query_set import QuerySetValidationError, validate_query_set


MAX_ACTIVE_CONSTRAINTS = 10
MAX_TESTED_CANDIDATES = 20
MAX_RETURNED_PLANS = 3


class RecoverySearchError(RuntimeError):
    """A recoverable planning failure after an exact search returned zero rows."""


@dataclass(frozen=True)
class RecoveryPolicy:
    priority: str
    operation: str
    steps: tuple[int, ...] = ()
    allow_null: bool = True

    def proposed_values(self, original_value):
        if self.operation == "make_optional":
            return (None,)
        if self.operation == "decrease_minimum":
            values = tuple(value for value in self.steps if value < original_value)
        elif self.operation == "increase_maximum":
            values = tuple(value for value in self.steps if value > original_value)
        else:
            values = ()
        return values + ((None,) if self.allow_null else ())


# Only adapter-supported fields with conservative, backend-defined soft semantics
# are automatic in TG019. Hard and medium constraints deliberately have no policy.
RECOVERY_FIELD_POLICIES = {
    ("display", "refresh_rate_hz", "min"): RecoveryPolicy(
        priority="soft", operation="decrease_minimum", steps=(144, 120, 90, 60)
    ),
    ("display", "brightness_peak_nits", "min"): RecoveryPolicy(
        priority="soft", operation="decrease_minimum", steps=(2000, 1500, 1200, 1000, 800, 600, 400)
    ),
    ("battery", "wireless_charging"): RecoveryPolicy(priority="soft", operation="make_optional"),
    ("physical", "weight_g", "max"): RecoveryPolicy(
        priority="soft", operation="increase_maximum", steps=(180, 200, 220, 250)
    ),
}


@dataclass(frozen=True)
class RecoveryChange:
    field: str
    operation: str
    original_value: object
    proposed_value: object


@dataclass(frozen=True)
class RecoveryPlan:
    id: str
    result_count: int
    score: int
    changes: tuple[RecoveryChange, ...]


@dataclass(frozen=True)
class RecoverySearchResult:
    plans: tuple[RecoveryPlan, ...]
    candidates_tested: int


def _path_value(query_set, path):
    value = query_set
    for key in path:
        value = value[key]
    return value


def _set_path(query_set, path, value):
    target = query_set
    for key in path[:-1]:
        target = target[key]
    target[path[-1]] = value


def _field_name(path):
    return ".".join(path)


class SearchRecoveryService:
    """Generate bounded single-field alternatives without changing user state."""

    def generate_plans(self, *, original_query_set, max_candidates=MAX_TESTED_CANDIDATES, max_plans=MAX_RETURNED_PLANS):
        original = validate_query_set(original_query_set)
        candidate_limit = min(max_candidates, MAX_TESTED_CANDIDATES)
        plan_limit = min(max_plans, MAX_RETURNED_PLANS)
        candidates_tested = 0
        plans_by_field = {}

        active = [
            (path, policy, _path_value(original, path))
            for path, policy in RECOVERY_FIELD_POLICIES.items()
            if _path_value(original, path) is not None
        ][:MAX_ACTIVE_CONSTRAINTS]

        for path, policy, original_value in active:
            for distance, proposed_value in enumerate(policy.proposed_values(original_value), start=1):
                if candidates_tested >= candidate_limit:
                    break
                candidate = deepcopy(original)
                _set_path(candidate, path, proposed_value)
                candidates_tested += 1
                try:
                    candidate = validate_query_set(candidate)
                    result_count = filter_catalog(query_set_to_filter_requirements(candidate)).count()
                except (DatabaseError, QuerySetValidationError, UnsupportedQuerySetFieldError, ValueError) as exc:
                    raise RecoverySearchError("Recovery candidate evaluation failed.") from exc
                if result_count <= 0:
                    continue

                operation = "make_optional" if proposed_value is None else policy.operation
                score = self._score(policy=policy, operation=operation, distance=distance, result_count=result_count)
                change = RecoveryChange(
                    field=_field_name(path), operation=operation,
                    original_value=original_value, proposed_value=proposed_value,
                )
                plan = RecoveryPlan(id="", result_count=result_count, score=score, changes=(change,))
                existing = plans_by_field.get(path)
                if existing is None or self._sort_key(plan) < self._sort_key(existing):
                    plans_by_field[path] = plan
            if candidates_tested >= candidate_limit:
                break

        ranked = sorted(plans_by_field.values(), key=self._sort_key)[:plan_limit]
        numbered = tuple(
            RecoveryPlan(
                id=f"recovery-{index}", result_count=plan.result_count,
                score=plan.score, changes=plan.changes,
            )
            for index, plan in enumerate(ranked, start=1)
        )
        return RecoverySearchResult(plans=numbered, candidates_tested=candidates_tested)

    @staticmethod
    def _score(*, policy, operation, distance, result_count):
        priority_penalty = {"soft": 10, "medium": 30, "hard": 100}[policy.priority]
        operation_penalty = 35 if operation == "make_optional" else distance * 5
        broad_result_penalty = max(0, result_count - 20) // 10
        return priority_penalty + operation_penalty + broad_result_penalty

    @staticmethod
    def _sort_key(plan):
        return plan.score, plan.result_count, plan.changes[0].field, str(plan.changes[0].proposed_value)
