---
name: active-context
---

# Active Context

_Last updated: 2026-09-12_

## Current phase

**Phase 16 — Engineering Intelligence**: Complete. **All 16 phases in the master prompt's
recommended sequence are now complete.**

## What just happened

Added `src/core/intelligence/` — the smallest new core component yet, closing Section 72's
feedback loop:

1. `src/core/memory/types.ts` — `MemoryEntry` (Phase 14) gained one new optional field,
   `signal?: 'positive'|'negative'` (`MEMORY_OUTCOME_SIGNALS`), meaningful only on
   `type: 'outcome'` entries.
2. `src/core/intelligence/outcomeFeedback.ts` — `computeOutcomeAdjustments(entries)` reduces
   persisted memory entries to a `Map<path, number>`: each signaled `outcome` entry contributes
   +-1 to every one of its `relatedPaths`, summed and capped at +-2 per path so no single path's
   history can dominate. `loadOutcomeAdjustments(repoRoot)` is a convenience wrapper for
   pipeline orchestrators.
3. `src/core/evidence/evidenceRanker.ts` and `src/core/memory/memoryRetriever.ts` each gained
   one new optional, default-empty `outcomeAdjustments: Map<string, number>` parameter — a
   small additive nudge to rank score / memory relevance respectively. **Neither module imports
   from `core/intelligence`** — they only consume the plain map, keeping the dependency
   one-directional (intelligence depends on memory, not the reverse).
4. `src/cli/runContext.ts` and `src/core/evaluation/evaluationRunner.ts` (the two pipeline
   orchestrators) load the map once per run and thread it through both `retrieveEvidence` and
   `rankEvidence`, so every surface (CLI/MCP/VS Code/GitHub, all of which call `runContext`
   transitively) gets the feedback loop for free.
5. `ecc memory` gained a new `--signal positive|negative` CLI flag (`argv.ts`,
   `memoryCommand.ts`) — the write side of the loop, validated the same way `--type` already is.

Satisfies Phase 16's exit criteria directly: recording an `outcome` entry with `--signal
negative --paths <path>` measurably lowers that path's future rank score and any memory entry's
relevance tied to the same path in the very next compilation — outcomes now feed back into
ranking/memory quality over time. Verified end-to-end against the **built**
`dist/cli/index.js`: recorded a decision (relevance 1.0 for a matching request), recorded a
negative outcome against the same path, re-ran the identical request, confirmed relevance
dropped to exactly 0.9 with no spurious second memory item.

Updated `04-decisions.md` (#22), `02-architecture.md` (candidate list + new descriptive
paragraph), `05-roadmap.md` (Phase 16 → complete, "Next recommended phase" → none, all 16
phases done), and `implementation-status.md` (directory tree, new Phase 16 section, "Explicitly
NOT built yet", "Next module to build").

Verified: `npm run typecheck`, `npm run lint`, `npm test` (191/191 passing, 43 test files, up
from 168/41 — 23 new tests across 2 new test files plus additive assertions in 3 existing test
files), `npm run build`, `npm audit` all green. No new runtime dependency. New files ≤49 lines
(`outcomeFeedback.ts`). Smoke-tested the **built** `dist/cli/index.js` end-to-end as described
above.

## In progress

Nothing — Phase 16 closed out cleanly, and with it the full 16-phase roadmap. Awaiting user
direction on what (if anything) comes next; no further phase is pre-authorized (Rule 3/5).

## Next task

None gated. Per [[05-roadmap]], all 16 phases are complete. Any future work (richer outcome
signals, a learned re-weighting model once real outcome volume exists, exposing memory/outcome
recording via MCP/VS Code/GitHub, addressing any item in the "Open questions" list below) is an
enhancement to an existing phase and requires its own explicit authorization before
implementation begins.

## Open questions carried forward

- `SOURCE_AUTHORITY_WEIGHT` (Phase 5), `DEFAULT_TOKEN_BUDGET`/`MAX_SYMBOLS_PER_ITEM` (Phase 6),
  and Phase 15's risk-scoring thresholds (`MEDIUM_SCORE_FLOOR`/`HIGH_SCORE_FLOOR`/
  `LARGE_PRIMARY_SET_SIZE`) remain hand-picked static values that Phase 16's feedback loop does
  **not** touch — it only adjusts `evidenceRanker.ts`'s rank score and `memoryRetriever.ts`'s
  relevance, not the authority table, token budget, or risk thresholds themselves. A future
  enhancement could feed accumulated outcome history into those too, once real volume exists.
- Conflict detection (Phase 7) is structural only - same subject (path/identifier) with a
  differing `trustLevel`. Still a known gap, not a regression.
- The trust rule table (`classifyTrust`, Phase 7) is static and per-source-type - not learned,
  not user-configurable yet, and not touched by Phase 16's feedback loop either.
- The CLI now has two commands (`context`, `memory`) and one output format (pretty JSON) - no
  `--help`/`--version`, no machine-compact output mode.
- The Phase 9 skill doc mentions `ecc memory` and the new `--signal` flag but still doesn't
  mention the Phase 10 MCP tool or the Phase 12 VS Code command as alternatives to shelling out
  to the CLI - `skills/ecc-context/SKILL.md` should be revisited for that gap.
- The MCP server exposes exactly one tool over stdio only - no resources/prompts, no HTTP/SSE
  transport, no auth, and no workspace-root sandboxing beyond what the OS/filesystem already
  enforces on the `path` argument. Revisit if a hosted/remote MCP deployment is ever required.
- The Phase 11 "agent alone" baseline is a simulated heuristic, not a real second AI agent -
  see [[04-decisions]] #17. The benchmark also has only three tasks, all against this one
  repository - no unseen-repo/temporal-holdout/adversarial coverage yet, and none of them
  measure verification-plan quality or outcome-feedback effects.
- The Phase 12 VS Code extension has no `@vscode/test-electron` end-to-end test - only a
  mocked-`vscode` unit-test suite plus a documented manual F5 smoke-test procedure. It is not
  packaged as a `.vsix` or published to the Marketplace, and the preview webview has no
  "send to agent" action (copy-paste only) - see [[04-decisions]] #18 and
  [[implementation-status]]'s "Explicitly NOT built yet" for the honest scope limit. Manual
  interactive verification (an actual right-click in a running VS Code window) has still not
  been performed in any session so far since none has had a GUI.
- The Phase 13 GitHub integration only fires on `pull_request` from branches within this same
  repository - fork PRs get a read-only `GITHUB_TOKEN` under that trigger and so receive no
  comment; deliberately rejected switching to `pull_request_target` as a "pwn request"
  security risk (see [[04-decisions]] #19). There is also no actual live-PR smoke test yet (no
  session so far has push access to open a real PR against GitHub) - verification so far is a
  unit/integration-tested `main()` against the fixture repo with `fetch` stubbed, not an
  observed real comment on a real pull request.
- The Phase 14 memory store is append-only (no update/delete of an existing entry), has no
  size cap/pruning as `.ecc/memory.json` grows, no dedup of near-identical entries, no
  cross-repository sharing, and matches purely by keyword overlap (not embedding/semantic
  similarity) - a relevant entry phrased very differently from a new task's request can be
  missed. The CLI is the only write surface; MCP/VS Code/GitHub don't expose recording memory
  (or the new `--signal` flag) yet (see [[04-decisions]] #20). The schema's
  `history: HistoricalClaim[]` field remains defined but always empty - deliberately not used.
- Phase 15's risk assessment is a static rule table (see [[04-decisions]] #21) with no learned
  component, no awareness of the actual diff/change being made, and doesn't distinguish "no
  tests exist at all" from "tests exist but weren't retrieved as evidence." The risk level is
  only exposed as text inside `verification[0]`, not as a structured schema field.
- Phase 16's feedback loop (see [[04-decisions]] #22) is a static, deterministic accumulator
  (+-1 per signal, capped at +-2 per path) - not learned/trained, since no meaningful outcome
  volume exists yet. It keys on **exact path string equality** (a file rename silently drops
  accumulated history for the old path - no fuzzy/related-file matching), only the CLI can
  record `--signal`, and it feeds only ranking/memory relevance - it does not adjust Phase 15's
  risk thresholds, Phase 5's authority weights, or Phase 7's trust classification. If real
  outcome-recording volume ever grows, revisit whether a learned re-weighting model (explicitly
  deferred at Phases 11/13/16 for lack of training data) is now justified.
