---
name: active-context
---

# Active Context

_Last updated: 2026-09-12_

## Current phase

**Phase 4 — Evidence Retrieval**: Complete.

## What just happened

Built `src/core/evidence/`: given a classified task (`EngineeringTask`) and an analyzed
repository (Phase 2's `RepositoryAnalysis`), `retrieveEvidence()` returns a candidate
`EvidenceItem[]` covering three source types:

- **code** — source files scored by keyword overlap between the request and file path
  words / resolved symbol names (`codeEvidenceRetriever.ts`).
- **test** — test files related to matched code, found via dependency-graph edges (a test
  file importing the source) plus a naming-convention fallback (`testEvidenceRetriever.ts`).
- **git** — recent commit history per matched file, via `git log` (`execFileSync` with
  array args, no shell interpolation); gracefully returns no evidence rather than throwing
  when the directory isn't a git repo or git isn't installed (`gitEvidenceRetriever.ts`).

This is retrieval only, not ranking — each retriever assigns a basic keyword-overlap
relevance score (0-1) because `EvidenceItem.relevance` is a required field, but proper
multi-signal ranking is Phase 5's job. See [[implementation-status]] for the module table.

Tested against the existing `test/fixtures/sample-repo/` (code/test retrieval) and an
isolated throwaway git repo created/torn down per test via `mkdtemp` (git retrieval, so
results don't depend on this project's own commit history). Verified: `npm run typecheck`,
`npm run lint`, `npm test` (47/47 passing across 12 test files, up from 34/7), `npm audit`
(0 vulnerabilities) all green. All new files ≤77 lines. No new runtime dependency.

## In progress

Nothing — Phase 4 closed out cleanly. Awaiting user authorization to plan Phase 5.

## Next task

Per [[05-roadmap]], the next gated phase is **Phase 5 — Evidence Ranking**: score/rank the
candidate evidence Phase 4 retrieves using more than one signal, unit-tested against
known-good orderings. Requires explicit authorization before planning/implementation
begins (Rule 3).

## Open questions carried forward

- No target repository/task type has been chosen by the user to validate retrieval/ranking
  against beyond fixtures. Resolved for Phases 2-4 by using static fixtures (and an
  isolated temp git repo for Phase 4's git retrieval) instead of waiting; still worth
  raising before Phase 5+ goes deep, since ranking quality is easier to judge against a
  real repo with real history than a fixture.
- Phase 4's relevance scores are heuristic per-retriever and not comparable across source
  types (a 0.6 code score and a 0.6 git-recency score aren't the same kind of signal) —
  Phase 5 needs to decide how to combine/normalize them, not just sort by the raw number.
