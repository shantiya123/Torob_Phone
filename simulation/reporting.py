import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


def journey_report(run_id, base_url, results):
    steps = [step for result in results for step in result.steps]
    failures = [step for step in steps if not step.passed]
    durations = sorted(step.elapsed_ms for step in steps)

    def percentile(value):
        if not durations:
            return None
        index = min(len(durations) - 1, int(round((len(durations) - 1) * value)))
        return round(durations[index], 2)

    return {
        "run_id": run_id,
        "base_url": base_url,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "scenario_count": len(results),
        "scenario_success_count": sum(result.passed for result in results),
        "step_count": len(steps),
        "success_count": len(steps) - len(failures),
        "failure_count": len(failures),
        "expected_failure_count": sum(step.expected_failure for step in steps),
        "response_time_ms": {
            "min": min(durations) if durations else None,
            "p50": percentile(0.50),
            "p90": percentile(0.90),
            "p95": percentile(0.95),
            "max": max(durations) if durations else None,
        },
        "failures_by_endpoint": dict(Counter(step.path for step in failures)),
        "scenarios": [
            {
                "scenario": result.scenario,
                "role": result.role,
                "passed": result.passed,
                "created_ids": result.created_ids,
                "steps": [step.__dict__ for step in result.steps],
            }
            for result in results
        ],
    }


def write_journey_reports(report, output_dir):
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    run_id = report["run_id"]
    json_path = output_dir / f"{run_id}-http-journeys.json"
    md_path = output_dir / f"{run_id}-http-journeys.md"
    json_path.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    lines = [
        f"# HTTP journey report: `{run_id}`",
        "",
        f"- Base URL: `{report['base_url']}`",
        f"- Scenarios: {report['scenario_success_count']}/{report['scenario_count']} passed",
        f"- Steps: {report['success_count']}/{report['step_count']} passed",
        f"- Failures: {report['failure_count']}",
        "",
        "## Response times (ms)",
        "",
    ]
    lines.extend(f"- {key}: {value}" for key, value in report["response_time_ms"].items())
    lines.extend(["", "## Scenarios", ""])
    for scenario in report["scenarios"]:
        lines.append(f"### {scenario['scenario']} ({scenario['role']}) — {'PASS' if scenario['passed'] else 'FAIL'}")
        for step in scenario["steps"]:
            status = "PASS" if step["passed"] else "FAIL"
            lines.append(
                f"- {status} `{step['method']} {step['path']}` "
                f"expected {step['expected_status']}, got {step['actual_status']} "
                f"({step['elapsed_ms']} ms)"
            )
    md_path.write_text("\n".join(lines) + "\n", encoding="utf-8")
    return json_path, md_path
