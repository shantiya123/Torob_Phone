# RULES.md

## Status

These rules define the engineering boundaries of the project.

They are more important than individual implementation preferences.

When a task conflicts with these rules, Codex must identify the conflict before implementation.

---

# 1. Scope Rule

Implement only the requested task group.

Do not add unrelated features.

Do not perform unrelated refactoring.

Do not expand the task because an improvement is theoretically possible.

---

# 2. No Silent Architectural Changes

Codex must not silently:

* Replace the project architecture.
* Replace the database strategy.
* Introduce a major framework.
* Move responsibilities between major layers.
* Replace the recommendation algorithm.
* Change public API contracts.

Major architectural changes require explicit discussion.

---

# 3. Deterministic Core Rule

The core recommendation system must be deterministic whenever deterministic behavior is possible.

The same:

```text
Input
+
Product Dataset
+
Configuration
```

should produce the same result.

LLM output must not be required for core filtering or ranking.

---

# 4. Hard Constraints Rule

Hard user requirements must not be treated as soft preferences.

Examples:

```text
Budget limit
Required operating system
Minimum storage
Required feature
Maximum size
Required compatibility
```

A product violating a hard constraint must not be recommended as if it satisfies the requirement.

If the system relaxes a constraint, that relaxation must be explicit.

---

# 5. Soft Preference Rule

Soft preferences may influence ranking.

Examples:

```text
Prefer better camera
Prefer longer battery life
Prefer lighter phone
Prefer better performance
Prefer better value
```

Soft preferences must not override hard constraints unless the system explicitly enters a fallback mode.

---

# 6. Explainability Rule

Recommendations should be explainable.

The system should be able to answer:

```text
Why was this product recommended?
```

The explanation should be based on actual system data.

The LLM must not invent reasons that are unsupported by product data.

---

# 7. Source of Truth Rule

The database is the source of truth for persisted product information.

Do not hardcode product data into recommendation logic.

Do not duplicate product attributes unnecessarily.

---

# 8. Separation of Concerns Rule

The following responsibilities should remain conceptually separate:

```text
Data Collection
        ↓
Data Normalization
        ↓
Product Domain
        ↓
Filtering
        ↓
Scoring
        ↓
Ranking
        ↓
Explanation
        ↓
API / Conversation
```

A single component should not unnecessarily own all of these responsibilities.

---

# 9. LLM Rule

The LLM is an intelligent interface and interpretation layer.

It is not the database.

It is not the deterministic recommendation engine.

It is not the final authority on factual product specifications.

LLM output must be validated before being used by deterministic systems.

---

# 10. External Data Rule

External product data must be treated as untrusted input.

The system must account for:

* Missing values.
* Inconsistent naming.
* Different units.
* Duplicate products.
* Invalid values.
* Stale information.
* Conflicting sources.

Normalization should happen before recommendation logic depends on the data.

---

# 11. API Rule

API behavior should be explicit and predictable.

Avoid exposing internal implementation details unnecessarily.

API contracts should not change casually.

Breaking changes must be intentional and documented.

---

# 12. Database Rule

Database queries should be considered during design.

Avoid obvious:

```text
N + 1 queries
```

Avoid retrieving large datasets when only a small subset is required.

Indexes should be added based on actual query patterns and meaningful access paths.

---

# 13. Testing Rule

Important business logic requires tests.

At minimum, tests should cover:

* Valid behavior.
* Invalid behavior.
* Boundary conditions.
* Important edge cases.
* Regression cases for discovered bugs.

A feature is not considered complete merely because the code runs once manually.

---

# 14. Error Handling Rule

Errors should be explicit.

Do not silently swallow exceptions.

Do not use broad exception handling unless there is a clear reason.

Errors should preserve enough context for debugging.

---

# 15. Security Rule

Never commit:

* API keys.
* Passwords.
* Tokens.
* Private credentials.
* Production secrets.

Use environment variables or secure configuration.

---

# 16. Dependency Rule

Do not add a dependency merely because it is convenient for a small task.

Before adding a dependency, consider:

* Is it necessary?
* Is the functionality easy to implement safely?
* Does it create long-term maintenance cost?
* Does it conflict with the current stack?

---

# 17. Migration Rule

Database migrations must be treated carefully.

Do not casually delete or rewrite migrations that may already have been applied.

Destructive migrations require explicit awareness.

---

# 18. Performance Rule

Do not prematurely optimize.

However, do not knowingly introduce obvious performance problems into core systems.

Prioritize:

```text
Correctness
    ↓
Clear design
    ↓
Measured performance optimization
```

---

# 19. Documentation Rule

Documentation must reflect reality.

Do not document future functionality as completed functionality.

When architecture changes significantly, update the relevant documentation.

---

# 20. Completion Rule

Completing code is not the same as completing a task group.

A task group is complete only when:

```text
Implementation
    +
Tests
    +
Verification
    +
Completion Report
```

are finished.

After the completion report, Codex must wait.

---

# 21. Human Approval Rule

Codex may recommend the next task group.

Codex must not automatically start it.

The user decides whether:

* The task is accepted.
* Manual testing is sufficient.
* The next task should begin.
* The architecture should change.
* The task should be revised.

---

# 22. Budget Rule

Codex should minimize unnecessary token consumption.

Prefer:

* Relevant repository inspection.
* Focused tasks.
* Existing documentation.
* Incremental implementation.
* Reusing established decisions.

Avoid:

* Repeatedly rediscovering the entire architecture.
* Rewriting working code without necessity.
* Long discussions about trivial choices.
* Repeated alternative implementations without a clear reason.

The project should preserve a budget reserve for:

* Unexpected bugs.
* Integration issues.
* Database problems.
* Deployment problems.
* Final validation.

---

# 23. Final Rule

When uncertain:

```text
Do not guess about major architecture.
Do not ask about trivial implementation details.
Do not silently expand scope.
Do not hide problems.
Do not continue into a new task group automatically.
```
