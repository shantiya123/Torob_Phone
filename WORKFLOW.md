# WORKFLOW.md

## Task Group workflow

1. The user provides one coherent Task Group.
2. Inspect the repository areas, configuration, tests, and documents relevant to that group.
3. Identify material ambiguity, architectural impact, and risks. Ask for a decision only when it would substantially change the result.
4. Implement the approved scope without expanding it.
5. Add or update focused tests where meaningful, then run the project’s existing checks.
6. Update architecture and decision documentation when the task changes them.
7. Provide a completion report and wait for the next approved Task Group.

## Decision gate

Stop before implementation when a task requires a major architecture decision, a database-strategy replacement, a destructive or irreversible operation, a public API breaking change, or a conflicting requirement. Report what was found, why it matters, options, a recommendation, and the decision needed.

## Documentation convention

Root-level `AGENTS.md`, `RULES.md`, and `WORKFLOW.md` are the canonical project-control documents. The `docs/` directory contains architecture, decisions, and roadmap material. Earlier control-document drafts retained under `docs/` are historical references and do not override the root-level documents.
