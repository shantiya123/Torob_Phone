# RULES.md

## Engineering boundaries

- Implement only the requested Task Group; do not add speculative product features or unrelated refactors.
- Major changes to architecture, database strategy, dependencies, public API contracts, or recommendation design require explicit approval.
- The persisted database is the source of truth for product data. Do not hardcode product facts in recommendation logic.
- Future recommendations must apply hard constraints deterministically; soft preferences may affect ranking only after those constraints are satisfied.
- Future recommendation explanations must be grounded in stored, computed system data.
- Keep collection, normalization, product domain, filtering, scoring, ranking, explanation, and API/conversation concerns separate as the project grows.
- External data is untrusted: account for missing, inconsistent, duplicate, stale, and invalid values before relying on it.
- Avoid obvious inefficient queries and add indexes only when supported by real access patterns.
- Preserve applied migrations; flag destructive migration work before executing it.
- Avoid speculative dependencies and never commit credentials or production secrets.
- Documentation must describe the repository as it is, not features merely planned.
