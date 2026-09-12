---
name: active-context
---

# Active Context

_Last updated: 2026-09-12_

## Current phase

**Phase 5 — Evidence Ranking**: Complete.

## What just happened

Built `src/core/evidence/evidenceRanker.ts`: `rankEvidence(items)` takes Phase 4's candidate
`EvidenceItem[]` and returns it reordered by `computeRankScore()`, which combines three
independent signals:

1. **relevance** — each item's own score from its retriever (Phase 4).
2. **source authority** — a static weight per `EvidenceSourceType` (`SOURCE_AUTHORITY_WEIGHT`):
   code is ground truth (1.0) > test (0.85) > constraint/documentation > git/pr > issue/ci/
   runtime/incident > memory.
3. **specificity** — a small bonus for items carrying resolved `symbols` (a precise code-level
   match, not just a file-level one).

This directly answers the open question carried over from Phase 4: relevance scores aren't
comparable across source types (a 0.6 code score and a 0.6 git-recency score aren't the same
kind of signal), so ranking can't just sort by raw relevance. The authority weight is what
makes cross-source comparison meaningful — verified by a test asserting a case where sorting
by relevance alone would put a git commit first, but `rankEvidence` correctly puts the
authoritative source file first instead. Ties break deterministically (source-type priority,
then path/identifier) so ordering is stable and testable. `rankEvidence` is a pure,
non-mutating reorder - it doesn't drop or alter items; that's Phase 6's job (compression /
token-budget selection).

Tested with hand-constructed known-good-ordering cases (relevance-only, authority-driven
reordering, specificity bonus, deterministic tiebreak, no mutation/no dropped items) plus one
fixture-repo integration test. Verified: `npm run typecheck`, `npm run lint`, `npm test`
(53/53 passing across 13 test files, up from 47/12), `npm audit` (0 vulnerabilities) all
green. New files ≤80 lines. No new runtime dependency.

## In progress

Nothing — Phase 5 closed out cleanly. Awaiting user authorization to plan Phase 6.

## Next task

Per [[05-roadmap]], the next gated phase is **Phase 6 — Context Compilation**: select +
compress ranked evidence into a valid `EngineeringContextPackage` within a token budget, with
`excluded` reasons populated for anything left out. Requires explicit authorization before
planning/implementation begins (Rule 3).

## Open questions carried forward

- No target repository/task type has been chosen by the user to validate retrieval/ranking
  against beyond fixtures. Resolved for Phases 2-5 by using static fixtures (and an isolated
  temp git repo for Phase 4's git retrieval) instead of waiting; still worth raising before
  Phase 6+ goes deep, since compression/budget decisions are easier to judge against a real
  repo with real evidence volume than a small fixture.
- `SOURCE_AUTHORITY_WEIGHT` (Phase 5) is a hand-picked static table, not learned or
  user-configurable. Fine for now (no ranking-quality baseline exists yet to tune against -
  see [[05-roadmap]] Phase 11 evaluation), but worth revisiting once there's a real "agent
  alone vs. agent+ECC" comparison to check the weights actually improve outcomes.
- Phase 6 will need a token-counting strategy (approximate char-based vs. a real tokenizer
  dependency) - not yet decided; flagging now so Phase 6 planning starts with the question
  instead of discovering it mid-implementation.
