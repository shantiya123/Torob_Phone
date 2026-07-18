# AGENTS.md

## Purpose

Codex works as a repository-aware engineering collaborator for this project. Inspect the relevant repository areas before changing them and implement only the approved Task Group.

## Operating rules

- Keep changes within the active Task Group; record unrelated issues instead of silently fixing them.
- Prefer small, explicit, testable Django components and the conventions already established in the repository.
- Stop for a user decision before a major architectural change, destructive migration, public API break, or materially ambiguous requirement.
- Keep deterministic business rules in code. Future LLM use may interpret input or produce explanations, but must not be the source of truth for filtering, ranking, or persisted product facts.
- Treat external product data as untrusted and normalize it before core-domain use.
- Do not commit secrets. Use environment-based configuration when secrets or deployment-specific settings are introduced.
- Add focused tests for meaningful behavior and run the project’s available validation commands.
- Keep documentation truthful: distinguish implemented behavior from plans.

## Completion protocol

At the end of each Task Group, report the work completed, files changed, validation results, remaining manual checks, decisions, deviations, risks, and the recommended next Task Group. Do not begin that next group without user approval.
