# Architecture Decisions

## Decision: Preserve the generated Django baseline

**Date:** 2026-07-18

### Context

The repository contains only Django project configuration and no product-domain implementation. Replacing the layout or adding applications before a concrete domain Task Group would be speculative.

### Decision

Keep the existing Django project package, its SQLite development database configuration, and the built-in admin-only URL configuration unchanged for Task Group 001.

### Alternatives considered

- Create a full set of anticipated product, offer, search, recommendation, and AI apps now.
- Replace SQLite or introduce a production infrastructure stack now.

### Reason

Neither alternative is required to document and validate the present foundation. Deferring those choices avoids locking the project into an unvalidated design.

### Consequences

The baseline is intentionally minimal. A later Task Group should introduce reproducible dependency management and the first domain application(s) once their ownership and data model are approved.

## Decision: Canonicalize project-control document locations

**Date:** 2026-07-18

### Context

Earlier drafts of project-control documents exist under `docs/` as `Agents.md`, `Rules.md`, and `Workflow.md`, while the repository convention requested for this project uses root-level uppercase filenames.

### Decision

Create canonical root-level `AGENTS.md`, `RULES.md`, and `WORKFLOW.md`. Preserve the existing `docs/` drafts as historical references.

### Consequences

Future work should follow the root-level documents and maintain the focused architecture, decision, and roadmap documents under `docs/`.
