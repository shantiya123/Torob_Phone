# Task Groups Roadmap

This is a planning baseline, not a commitment. Priorities and boundaries should be revised as real product and operational requirements emerge.

## Phase 1 — Foundation

- [x] TG-001: Repository foundation and architecture baseline
- [x] TG-002: Canonical data architecture and database design
- [ ] Establish reproducible dependency and environment configuration.
- [x] TG-003: Implement the catalog app, migrations, and validated import boundary.

## Phase 2 — Product Data Model

- [ ] Define canonical product, specification, store, and offer models.
- [ ] Add migrations, data-integrity rules, and focused model tests.

## Phase 3 — Data Normalization

- [ ] Define normalized specification vocabulary, units, and validation.
- [ ] Establish a boundary for importing untrusted external product data.

## Phase 4 — Product and Offer Data

- [ ] Build approved workflows/APIs for product and offer data.
- [ ] Define freshness, source provenance, and duplicate-handling behavior.

## Phase 5 — Deterministic Recommendation Engine

- [ ] Implement hard-constraint filtering.
- [ ] Implement deterministic scoring, ranking, and data-backed explanations.

## Phase 6 — Search

- [ ] Define search requirements and add product discovery capabilities.

## Phase 7 — LLM Integration

- [ ] Introduce an LLM abstraction only after deterministic contracts exist.
- [ ] Interpret natural-language preferences into validated structured intent.

## Phase 8 — Conversational Experience

- [ ] Add a conversational interface around the validated search and recommendation capabilities.

## Phase 9 — Testing and Integration

- [ ] Expand unit, integration, API-contract, and end-to-end coverage.
- [ ] Validate data, performance, and error-handling boundaries.

## Phase 10 — Deployment

- [ ] Define production settings, secret management, database strategy, observability, and deployment automation.
