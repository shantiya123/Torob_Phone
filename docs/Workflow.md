# WORKFLOW.md

# Development Workflow

## 1. Development Unit

The project is developed through Task Groups.

A Task Group should represent a coherent unit of progress.

Good:

```text
Task Group: Implement product feature normalization
```

Bad:

```text
Task Group: Build the entire application
```

A Task Group should ideally produce a meaningful checkpoint.

---

# 2. Standard Flow

```text
User defines Task Group
        ↓
Codex inspects repository
        ↓
Codex analyzes task
        ↓
Codex challenges important ambiguity
        ↓
Codex proposes clarification if necessary
        ↓
User approves or clarifies
        ↓
Codex implements
        ↓
Codex tests
        ↓
Codex verifies
        ↓
Codex produces Completion Report
        ↓
Codex recommends next Task Group
        ↓
Codex stops
        ↓
User manually reviews and tests
        ↓
User decides whether to continue
        ↓
User gives next Task Group
```

---

# 3. Task Group Size

A Task Group may contain multiple internal subtasks.

Example:

```text
Task Group:
Implement deterministic recommendation engine

Internal subtasks:

1. Product feature normalization
2. Hard constraint evaluation
3. Preference scoring
4. Product ranking
5. Explanation data
6. Unit tests
```

Codex may execute these sequentially.

The user does not need to approve every internal implementation step.

---

# 4. Large Task Protocol

Codex may continue if the task is simply internally decomposable.

Codex must stop before continuing if:

* A major architectural boundary is crossed.
* The scope grows substantially.
* A new subsystem is required.
* A major product decision is discovered.
* Existing architecture must be significantly changed.

The required response is:

```text
The original task group is larger than expected.

Original scope:
...

Discovered additional scope:
...

Why this matters:
...

Recommended split:
...

I recommend stopping here before implementation of the additional scope.
```

---

# 5. Completion Report Format

At the end of a Task Group, Codex should report:

## Summary

What was implemented.

## Completed Tasks

* Task 1
* Task 2
* Task 3

## Files Created

```text
path/to/file.py
path/to/test.py
```

## Files Modified

```text
path/to/file.py
```

## Tests Added

What behavior is covered.

## Tests Executed

```text
Command:
...

Result:
PASS / FAIL
```

## Manual Verification

What was manually checked.

## Remaining Manual Verification

What the user should check.

## Architectural Decisions

Important decisions made during implementation.

## Deviations

Anything that differs from the original task.

## Risks and Problems

Known problems, limitations, or technical debt.

## Recommended Next Task Group

The next logical task group.

Explain why it should be next.

Codex must stop after this report.

---

# 6. Task Group Template

```markdown
# Task Group: [Name]

## Objective

[What should exist after completion?]

## Scope

### Included

- [Task]
- [Task]
- [Task]

### Excluded

- [Feature]
- [Unrelated refactor]

## Requirements

- [Requirement]
- [Requirement]

## Acceptance Criteria

- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Expected Areas

- [Module]
- [Module]

## Constraints

- [Constraint]
- [Constraint]

## Testing Requirements

- [Test requirement]

## Notes

[Additional context]
```

---

# 7. Architecture Documentation

Create:

```text
docs/ARCHITECTURE.md
```

It should describe:

```text
System
    ↓
Applications / Modules
    ↓
Domain Responsibilities
    ↓
Data Flow
    ↓
External Integrations
```

It must describe the current architecture.

---

# 8. Decision Documentation

Create:

```text
docs/DECISIONS.md
```

Use this format:

```markdown
# Decision: [Title]

## Date

[Date]

## Context

[What problem existed?]

## Decision

[What was decided?]

## Alternatives Considered

- Option A
- Option B

## Reason

[Why was this chosen?]

## Consequences

[What does this decision make easier or harder?]
```

Only important decisions need to be recorded.

Do not record every small coding choice.

---

# 9. Task Roadmap

Create:

```text
docs/TASK_GROUPS.md
```

Use:

```markdown
# Task Groups

## Phase 1: Foundation

- [ ] TG-001 Project foundation
- [ ] TG-002 Core product models
- [ ] TG-003 Initial data pipeline

## Phase 2: Product Intelligence

- [ ] TG-004 Feature normalization
- [ ] TG-005 Hard constraint filtering
- [ ] TG-006 Recommendation scoring
- [ ] TG-007 Ranking and explanations

## Phase 3: Search

- [ ] TG-008 Search foundation
- [ ] TG-009 Natural language query interpretation

## Phase 4: AI

- [ ] TG-010 LLM abstraction
- [ ] TG-011 Intent extraction
- [ ] TG-012 Conversational recommendation

## Phase 5: Integration

- [ ] TG-013 API integration
- [ ] TG-014 End-to-end tests
- [ ] TG-015 Deployment foundation
```

The roadmap is not a prison.

It may change as the project teaches us more.

However, changes should be intentional.

---

# 10. Recommended Repository Structure

The exact structure may evolve, but the conceptual separation should remain clear:

```text
project/
│
├── AGENTS.md
├── RULES.md
├── WORKFLOW.md
│
├── docs/
│   ├── ARCHITECTURE.md
│   ├── DECISIONS.md
│   └── TASK_GROUPS.md
│
├── backend/
│   ├── config/
│   ├── apps/
│   │   ├── products/
│   │   ├── offers/
│   │   ├── search/
│   │   ├── recommendations/
│   │   └── ai/
│   │
│   ├── tests/
│   └── manage.py
│
├── data/
│   ├── raw/
│   ├── normalized/
│   └── fixtures/
│
├── infrastructure/
│   ├── docker/
│   └── nginx/
│
└── README.md
```

The exact names are less important than clear responsibility boundaries.

---

# 11. Recommended Initial Task Group Format

Before giving Codex a task, the user should preferably provide:

```markdown
# Task Group: [Name]

## Objective

[The desired outcome]

## Context

[Why this task exists]

## Scope

[What is included]

## Exclusions

[What is explicitly not included]

## Acceptance Criteria

[How we know it is complete]

## Constraints

[Important technical or architectural limitations]

## Testing

[What must be tested]
```

Codex should then inspect the repository and determine whether the task is:

```text
READY
```

or:

```text
NEEDS CLARIFICATION
```

or:

```text
REQUIRES ARCHITECTURAL DECISION
```

---

# 12. The Core Philosophy

The project should operate using this principle:

```text
Human:
Defines direction, priorities, and important product decisions.

Codex:
Inspects, challenges, designs locally, implements, tests, and reports.

Human:
Reviews, manually tests, approves, and chooses the next task.
```

The goal is not to make Codex completely autonomous.

The goal is to make Codex highly effective while keeping the human in control of:

* Scope.
* Architecture.
* Product decisions.
* Quality checkpoints.
* Budget.
* Direction.
