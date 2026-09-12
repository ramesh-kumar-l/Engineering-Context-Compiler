---
name: active-context
---

# Active Context

_Last updated: 2026-09-12_

## Current phase

**Phase 6 — Context Compilation**: Complete.

## What just happened

Built `src/core/compilation/` (four focused modules, orchestrator pattern matching earlier
phases):

1. `tokenBudget.ts` — `estimateTokens(text)` (a ~4-chars-per-token heuristic) and
   `estimateItemTokens(item)` (path + identifier + symbols text, plus a flat per-item
   overhead for serialization structure). No tokenizer dependency.
2. `contextCompressor.ts` — `compressEvidenceItem(item)` truncates `symbols` to 8 entries
   (production-scale guard: a file matched on many symbols only needs the top few to be
   useful context). Returns a new object, never mutates.
3. `contextSelector.ts` — `selectEvidence(rankedEvidence, tokenBudget)` walks Phase 5's
   ranked evidence in order, compresses + estimates each item, and greedily includes
   everything that still fits. Skipping an oversized item doesn't stop the walk, so a later,
   smaller item can still use the space. Splits results into `primary` (code/test - direct
   evidence) and `supporting` (everything else), and returns `excluded:
   [{reason: 'token_budget_exceeded', count}]` for whatever didn't fit - never silently
   dropped.
4. `contextCompiler.ts` — `compileContext(task, repository, rankedEvidence, options?)`, the
   orchestrator: builds on Phase 1's `createEmptyContextPackage()`, calls `selectEvidence()`,
   and returns a fully populated, schema-valid `EngineeringContextPackage`.

This resolves the token-counting open question flagged at the end of Phase 5: chosen
approximate char-based estimation over a real tokenizer dependency (see
[[04-decisions]] #12) - good enough to bound a budget, no heavy/model-specific package
needed. Selection is greedy-in-rank-order rather than optimal bin-packing, which is simpler,
deterministic, and still recovers leftover budget via later smaller items - verified by a
dedicated test.

Tested with known-good selection/compression cases (generous budget keeps everything, tight
budget excludes lower-ranked items with an exact count, primary/supporting split by source
type, a smaller later item fills space an oversized earlier item couldn't use, no mutation)
plus a fixture-repo end-to-end test (`retrieveEvidence` -> `rankEvidence` -> `compileContext`)
asserting the output validates against Phase 1's `validateContextPackage()`. Verified:
`npm run typecheck`, `npm run lint`, `npm test` (72/72 passing across 17 test files, up from
53/13), `npm audit` (0 vulnerabilities) all green. New files ≤63 lines. No new runtime
dependency.

## In progress

Nothing - Phase 6 closed out cleanly. Awaiting user authorization to plan Phase 7.

## Next task

Per [[05-roadmap]], the next gated phase is **Phase 7 — Trust + Provenance**: ensure every
item in a compiled `EngineeringContextPackage` carries provenance, that FACT/DERIVED/
INFERENCE/UNKNOWN trust levels are never blurred, and that conflicting evidence is surfaced
rather than silently resolved. Requires explicit authorization before planning/
implementation begins (Rule 3).

## Open questions carried forward

- No target repository/task type has been chosen by the user to validate compilation
  against beyond fixtures. Still worth raising before a real CLI/MCP surface (Phases 8/10)
  goes live, since token-budget defaults are easier to tune against real evidence volumes
  than a small fixture.
- `SOURCE_AUTHORITY_WEIGHT` (Phase 5) is still a hand-picked static table - unchanged this
  phase, still worth revisiting once Phase 11's evaluation exists.
- `DEFAULT_TOKEN_BUDGET` (4000) and `MAX_SYMBOLS_PER_ITEM` (8) in the new compilation module
  are also hand-picked constants, not derived from any measured target-model context window
  or real evidence-volume data. Low risk (both are easy to override via
  `compileContext`'s `options.tokenBudget` / adjustable in `contextCompressor.ts`), but
  worth revisiting alongside the Phase 11 evaluation once there's a real "package worked
  well vs. didn't" signal to tune against.
- Phase 7 will need to decide how conflicting evidence is actually detected (e.g. two items
  making contradictory claims about the same file/symbol) - not yet designed; flagging now
  so Phase 7 planning starts with the question instead of discovering it mid-implementation.
