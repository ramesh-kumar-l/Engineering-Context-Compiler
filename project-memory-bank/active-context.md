---
name: active-context
---

# Active Context

_Last updated: 2026-09-12_

## Current phase

**Phase 11 — Evaluation + Benchmarking**: Complete.

## What just happened

Added an `EvaluationEngine` and a runnable benchmark surface:

1. `src/core/evaluation/types.ts` — `BenchmarkTask`, `ConditionMetrics`, `EvaluationResult`.
2. `src/core/evaluation/metrics.ts` — `computeConditionMetrics()`, pure scoring shared by both
   conditions (recall/irrelevance against ground truth, path de-duplication).
3. `src/core/evaluation/baselineRetriever.ts` — the "agent alone" condition: a naive keyword
   grep over source-file paths in filesystem-walk order, reading whole matched files until the
   token budget runs out. No ranking, no trust/provenance, no compression, no LLM call —
   deterministic and offline by design (see [[04-decisions]] #17).
4. `src/core/evaluation/evaluationRunner.ts` — `runEvaluation()`, the "agent+ECC" condition.
   Re-composes `analyzeRepository → classifyTask → retrieveEvidence → rankEvidence →
   compileContext` directly rather than importing `runContext` from `src/cli/`, so this stays
   a pure core module (core must not depend on any surface, per [[02-architecture]]).
5. `src/benchmark/benchmarkTasks.ts`, `report.ts`, `runBenchmark.ts` — a thin runnable surface
   (`npm run benchmark`) mirroring the CLI/MCP pattern: three benchmark tasks defined against
   **this repository's own real codebase** (dogfooding — resolves the "no target repo chosen"
   gap flagged since Phase 10), a markdown report formatter, and an entry point.

Ran `npm run benchmark` for real against this repo and recorded the measured comparison in
[[07-evaluation]] ("Current baseline"): averaged across the three tasks, evidence recall went
67% → 100%, provenance completeness 0% → 100%, estimated tokens 2833 → 1053 (agent-alone →
agent+ECC). Irrelevant-evidence rate went the other way (72% → 87%) because ECC's
supplementary git/test evidence counts as "irrelevant" against each task's narrow 2-path
ground truth — recorded as-is, not tuned to hide it.

Updated `package.json` (new `benchmark` script, **no new runtime dependency**), `README.md`
(status bump + new "## Evaluation" section), and all memory-bank files
(`implementation-status.md`, `04-decisions.md` #17, `05-roadmap.md`, `02-architecture.md`,
`07-evaluation.md`).

Verified: `npm run typecheck`, `npm run lint`, `npm test` (123/123 passing across 31 test
files, up from 113/27), `npm run build`, `npm audit` (0 vulnerabilities) all green. New files:
`src/core/evaluation/{types,metrics,baselineRetriever,evaluationRunner}.ts`,
`src/benchmark/{benchmarkTasks,report,runBenchmark}.ts`,
`test/evaluation/{metrics,baselineRetriever,evaluationRunner}.test.ts`,
`test/benchmark/report.test.ts` (all ≤65 lines).

## In progress

Nothing — Phase 11 closed out cleanly. Awaiting user authorization to plan Phase 12.

## Next task

Per [[05-roadmap]], the next gated phase is **Phase 12 — VS Code Extension**: right-click
"Compile Engineering Context" produces a preview the user can send to an agent; the extension
must be a thin client over the existing CLI/core, not a reimplementation. Requires explicit
authorization before planning/implementation begins (Rule 3).

## Open questions carried forward

- `SOURCE_AUTHORITY_WEIGHT` (Phase 5), `DEFAULT_TOKEN_BUDGET`/`MAX_SYMBOLS_PER_ITEM` (Phase 6)
  remain hand-picked static values, unchanged this phase. Now that Phase 11's evaluation
  harness exists, these could be tuned against the benchmark's measured metrics rather than
  purely by inspection — worth doing once more benchmark tasks/repos exist to tune against
  without overfitting to just three tasks on one repo.
- Conflict detection (Phase 7) is structural only - same subject (path/identifier) with a
  differing `trustLevel`. Unchanged this phase; still a known gap, not a regression.
- The trust rule table (`classifyTrust`, Phase 7) is static and per-source-type - not learned,
  not user-configurable yet. Revisit alongside Phase 14 (Engineering Memory) and Phase 16
  (Engineering Intelligence, whose feedback loop is the natural place to eventually learn
  these weights from the evaluation harness's measurements).
- The CLI has exactly one command (`context`) and one output format (pretty JSON) - no
  `--help`/`--version`, no subcommands. Unchanged this phase; revisit only if real usage
  reveals a need.
- `vitest.config.ts`'s `testTimeout: 15000` (Phase 8) is a blunt fix for occasional slow
  process-spawning tests under parallel load on this machine; if flakiness persists on a
  different CI runner, the more targeted fix is a per-test timeout override on just the
  git-spawning tests rather than raising the global default further.
- The Phase 9 skill has no automated install step (manual copy/symlink); it also does not yet
  mention Phase 10's MCP tool as an alternative invocation path to shelling out to the CLI —
  `skills/ecc-context/SKILL.md` should be revisited to add that so it doesn't go stale by
  omission. Still a live gap, not addressed this phase either (wasn't part of Phase 11's exit
  criteria).
- The MCP server exposes exactly one tool over stdio only - no resources/prompts, no HTTP/SSE
  transport, no auth, and no workspace-root sandboxing beyond what the OS/filesystem already
  enforces on the `path` argument. Fine for a locally-installed tool; revisit if a hosted/
  remote MCP deployment or multi-tenant use case is ever required.
- The Phase 11 "agent alone" baseline is a simulated heuristic, not a real second AI agent —
  see [[04-decisions]] #17 for why, and [[implementation-status]]'s "Explicitly NOT built yet"
  for the honest scope limit. The benchmark also has only three tasks, all against this one
  repository - no unseen-repo/temporal-holdout/adversarial coverage yet (see
  [[07-evaluation]]'s "Benchmark" section). Both are reasonable "at least one comparison run"
  fulfillments of Phase 11's literal exit criteria, not a claim of exhaustive evaluation.
