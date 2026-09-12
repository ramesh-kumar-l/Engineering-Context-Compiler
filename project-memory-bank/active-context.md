---
name: active-context
---

# Active Context

_Last updated: 2026-09-12_

## Current phase

**Phase 3 — Task Understanding**: Complete.

## What just happened

Built `src/core/task/`: a weighted keyword/phrase classifier (`classifyTask`) that maps a
free-text engineering request to one of the 9 `TaskType` values already defined in
`src/core/types/task.ts` (explain, debug, modify, review, refactor, investigate, plan,
test, optimize). Signals are regex patterns with weights (generic single verbs = 1,
specific/compound phrases = 2-3) so a specific signal (e.g. "integration test") outranks a
generic one from another type (e.g. "add") when both appear in the same request. See
[[implementation-status]] for the module table.

Tested against a new 54-example hand-labeled fixture
(`test/fixtures/task-requests.json`, 6 per TaskType) — **100% measured accuracy**, with the
test asserting a ≥85% floor so future signal edits can't silently regress it. Also unit
tests for empty input, case-insensitivity, and the weighted tie-break behavior itself.
Verified: `npm run typecheck`, `npm run lint`, `npm test` (34/34 passing across 7 test
files), `npm audit` (0 vulnerabilities) all green. All new files ≤128 lines.

No new runtime dependency — plain regex over the already-typed `TaskType` union.

## In progress

Nothing — Phase 3 closed out cleanly. Awaiting user authorization to plan Phase 4.

## Next task

Per [[05-roadmap]], the next gated phase is **Phase 4 — Evidence Retrieval**: given a
classified task + an analyzed repo (Phase 2's `RepositoryAnalysis`), retrieve a candidate
evidence set (code/git/tests) relevant to the task. Requires explicit authorization before
planning/implementation begins (Rule 3).

## Open questions carried forward

- No target repository/task type has been chosen by the user to validate retrieval
  against in Phase 4+. Resolved for Phase 2/3 by using static fixtures instead of
  waiting; still worth raising before Phase 4 planning goes deep, since retrieval quality
  is easier to judge against a real repo than a fixture.
