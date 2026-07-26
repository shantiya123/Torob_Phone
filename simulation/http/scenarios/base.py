from dataclasses import dataclass, field

from simulation.http.assertions import is_json_object


@dataclass
class StepResult:
    name: str
    method: str
    path: str
    expected_status: list[int]
    actual_status: int
    elapsed_ms: float
    passed: bool
    expected_failure: bool = False
    error: str | None = None


@dataclass
class JourneyResult:
    scenario: str
    role: str
    steps: list[StepResult] = field(default_factory=list)
    created_ids: dict = field(default_factory=dict)

    @property
    def passed(self):
        return all(step.passed for step in self.steps)

    def step(self, name, response, expected, *, expected_failure=False, predicate=None):
        expected_values = [expected] if isinstance(expected, int) else list(expected)
        passed = response.status_code in expected_values
        if passed and predicate is not None:
            passed = bool(predicate(response))
        error = response.error
        if not passed and not error:
            error = f"unexpected_status_{response.status_code}"
        self.steps.append(
            StepResult(
                name=name,
                method=response.method,
                path=response.path,
                expected_status=expected_values,
                actual_status=response.status_code,
                elapsed_ms=round(response.elapsed_ms, 2),
                passed=passed,
                expected_failure=expected_failure,
                error=error,
            )
        )
        return response


def assert_payload_object(response):
    return is_json_object(response)
