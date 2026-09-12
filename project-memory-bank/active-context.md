---
name: active-context
---

# Active Context

_Last updated: 2026-09-12_

## Current phase

**Phase 7 — Trust + Provenance**: Complete.

## What just happened

Built `src/core/trust/` (three focused modules + type additions, same orchestrator pattern
as Phases 2/4/5/6):

1. `provenanceGuard.ts` — `ensureProvenance(item)`: returns the item's existing `provenance`
   if present, otherwise reconstructs one from fields already on the item (`source`, `path`,
   `identifier`) - never invents a fact the item didn't already carry.
2. `trustClassifier.ts` — `classifyTrust(item)`: a static per-`EvidenceSourceType` rule table
   (same style as Phase 5/6's static tables) mapping each item to exactly one of `fact` /
   `derived` / `inference` / `unknown`. `attachTrust(item)` composes guard + classifier into a
   `TrustedEvidenceItem`, immutably.
3. `conflictDetector.ts` — `detectConflicts(items)`: groups items by subject (`path` or
   `identifier`); any subject whose items carry more than one distinct `trustLevel` becomes an
   `EvidenceConflict { subject, items }` - reported, not resolved (nothing is dropped or
   merged).

`src/core/types/trust.ts` gained `TrustedEvidenceItem` (an `EvidenceItem` with `trustLevel`
now required) and `EvidenceConflict`. `EngineeringContextPackage.context.primary/supporting`
are now typed `TrustedEvidenceItem[]`, and the package gained a new `conflicts:
EvidenceConflict[]` field (schema, factory, and type all updated together).
`compilation/contextCompiler.ts` now runs every selected item through `attachTrust` and calls
`detectConflicts()` over the combined primary+supporting set before returning the package.

This directly satisfies the three exit criteria as structural guarantees rather than
incidental behavior (see [[04-decisions]] #13):
- **Every item has provenance** - enforced by the schema (`trustLevel` required) and by
  `attachTrust` always populating `provenance` before an item can be included.
- **FACT/DERIVED/INFERENCE/UNKNOWN never blurred** - `classifyTrust` is the single,
  deterministic source of `TrustLevel`; it never derives a level from `relevance`/
  `confidence` (which measure fit/certainty, not evidentiary kind).
- **Conflicts surfaced, not silently resolved** - `detectConflicts` runs unconditionally;
  conflicting items stay in `context.primary`/`supporting` untouched and are additionally
  listed in `conflicts`.

Tested with known-good trust classifications per source type, provenance reconstruction
(present vs. missing, no invented facts, no mutation), conflict grouping (by path, by
identifier, same-trust-level not flagged, single-item subjects ignored, no-subject items
ignored), and two new `compileContext` integration tests (every included item carries
provenance + a valid trust level; two items sharing a path but differing trust level produce
a surfaced conflict). Verified: `npm run typecheck`, `npm run lint`, `npm test` (91/91 passing
across 20 test files, up from 72/17), `npm audit` (0 vulnerabilities) all green. New/changed
files ≤78 lines. No new runtime dependency.

## In progress

Nothing - Phase 7 closed out cleanly. Awaiting user authorization to plan Phase 8.

## Next task

Per [[05-roadmap]], the next gated phase is **Phase 8 — CLI**: `ecc context "<task>"` runs
end-to-end (repository analysis -> task classification -> evidence retrieval -> ranking ->
compilation -> trust/provenance) against a real repo and prints/saves a valid
`EngineeringContextPackage`, with documented usage. Requires explicit authorization before
planning/implementation begins (Rule 3).

## Open questions carried forward

- No target repository/task type has been chosen by the user to validate compilation
  against beyond fixtures. Still worth raising before the CLI (Phase 8) goes live, since
  token-budget defaults and trust classifications are easier to tune against real evidence
  volumes than a small fixture.
- `SOURCE_AUTHORITY_WEIGHT` (Phase 5), `DEFAULT_TOKEN_BUDGET`/`MAX_SYMBOLS_PER_ITEM` (Phase 6)
  remain hand-picked static values, unchanged this phase - still worth revisiting once
  Phase 11's evaluation exists.
- Conflict detection (Phase 7) is structural only - same subject (path/identifier) with a
  differing `trustLevel`. It does not compare claim *content*, so two items with the same
  `trustLevel` about the same file that actually disagree (e.g. two git commits with
  contradictory subjects) are not flagged. No semantic/diff capability exists to do better
  yet; flagging as a known gap rather than silently claiming full conflict coverage.
- The trust rule table (`classifyTrust`) is static and per-source-type, like the Phase 5/6
  tables - not learned, not user-configurable yet. Revisit alongside Phase 11's evaluation
  once there's a real "package worked well vs. didn't" signal, and alongside Phase 14
  (Engineering Memory) since `memory`-sourced items are currently always classified
  `inference` regardless of how recently or reliably that memory was recorded.
