---
name: active-context
---

# Active Context

_Last updated: 2026-09-12_

## Current phase

**Phase 15 — Verification Intelligence**: Complete.

## What just happened

Added `src/core/verification/` — a small, genuinely new core component (like Phase 14's
memory engine, not a thin client):

1. `src/core/verification/types.ts` — `RISK_LEVELS` (`low`/`medium`/`high`),
   `RiskAssessment { level, score, factors }`.
2. `src/core/verification/riskAssessor.ts` — `assessRisk(task, primary, supporting,
   conflicts)` scores risk purely from signals earlier phases already compute: task-type
   weight (behavior-changing types like `modify`/`refactor` score higher), missing test
   coverage for touched code, low-trust (`inference`/`unknown`) primary evidence, Phase 7's
   surfaced conflicts, and blast radius (primary evidence count). Deterministic and rule-based
   (same style as Phase 3's `classifyTask`), not learned.
3. `src/core/verification/verificationPlanner.ts` — `planVerification(...)` calls `assessRisk`
   then returns a step list always led by `Risk: <level> (<factors>)`, layering on stricter
   steps as risk rises (run existing tests / flag missing coverage always; manually verify at
   medium+; peer review + resolve conflicts at high).
4. `contextCompiler.ts` now calls `planVerification()` once and assigns the result to
   `EngineeringContextPackage.verification` — a field that existed since Phase 1's schema but
   was always `[]` until now. No schema/type change needed.

Satisfies Phase 15's exit criteria directly: every `ecc context` call (and MCP/VS Code/GitHub,
since they all call `compileContext` transitively via `runContext`) now returns a real,
risk-scaled verification plan instead of an empty array — with zero changes to any of those
surfaces. Phase 13's `renderMarkdownReport` already had a "Suggested verification" section
(previously always empty); it now renders real content automatically.

**Bug caught during the built-binary smoke test, fixed before it shipped**: the first version
of `assessRisk` added the task-type weight to the score but never listed it as a `factor`, so
a `refactor` task alone reached "medium" risk while the message read "Risk: medium (no
elevated risk factors detected)" — self-contradictory. Fixed by pushing a
`task type '<type>' inherently carries elevated risk` factor whenever the task-type weight is
non-zero. Caught by actually running the built CLI against the fixture repo, not just unit
tests — same verification discipline as every prior phase.

Updated `04-decisions.md` (#21), `02-architecture.md` (candidate list + new descriptive
paragraph), `05-roadmap.md` (Phase 15 → complete, Phase 16 recommended next), and
`implementation-status.md` (directory tree, new Phase 15 section, "Explicitly NOT built yet",
"Next module to build").

Verified: `npm run typecheck`, `npm run lint`, `npm test` (168/168 passing, 41 test files, up
from 156/39 — 12 new tests across 2 new test files plus 2 additive assertions in
`contextCompiler.test.ts`), `npm run build`, `npm audit` all green. No new runtime dependency.
New files ≤74 lines (`riskAssessor.ts`). Smoke-tested the **built** `dist/cli/index.js` twice
(a `refactor` task and an `explain` task against the fixture repo, confirming the plan's
length/content actually scales with risk) and confirmed `renderMarkdownReport` renders the
result correctly.

## In progress

Nothing — Phase 15 closed out cleanly. Awaiting user authorization to plan Phase 16.

## Next task

Per [[05-roadmap]], the next gated phase is **Phase 16 — Engineering Intelligence**: close
Section 72's feedback loop at least once (outcomes feed back into ranking/memory quality over
time). Requires explicit authorization before planning/implementation begins (Rule 3).

## Open questions carried forward

- `SOURCE_AUTHORITY_WEIGHT` (Phase 5), `DEFAULT_TOKEN_BUDGET`/`MAX_SYMBOLS_PER_ITEM` (Phase 6),
  and now Phase 15's risk-scoring thresholds (`MEDIUM_SCORE_FLOOR`/`HIGH_SCORE_FLOOR`/
  `LARGE_PRIMARY_SET_SIZE`) remain hand-picked static values. Phase 11's evaluation harness
  could tune these against measured metrics once more benchmark tasks/repos exist to tune
  against without overfitting — and Phase 16's feedback loop is the more natural mechanism for
  the risk thresholds specifically, once real outcome data exists.
- Conflict detection (Phase 7) is structural only - same subject (path/identifier) with a
  differing `trustLevel`. Still a known gap, not a regression.
- The trust rule table (`classifyTrust`, Phase 7) is static and per-source-type - not learned,
  not user-configurable yet. Still worth revisiting alongside Phase 16.
- The CLI now has two commands (`context`, `memory` as of Phase 14) and one output format
  (pretty JSON) - no `--help`/`--version`, no machine-compact output mode.
- The Phase 9 skill doc mentions `ecc memory` (Phase 14) but still doesn't mention the Phase 10
  MCP tool or the Phase 12 VS Code command as alternatives to shelling out to the CLI, and does
  not yet mention that `verification` is now populated - `skills/ecc-context/SKILL.md` should
  be revisited for both gaps.
- The MCP server exposes exactly one tool over stdio only - no resources/prompts, no HTTP/SSE
  transport, no auth, and no workspace-root sandboxing beyond what the OS/filesystem already
  enforces on the `path` argument. Revisit if a hosted/remote MCP deployment is ever required.
- The Phase 11 "agent alone" baseline is a simulated heuristic, not a real second AI agent -
  see [[04-decisions]] #17. The benchmark also has only three tasks, all against this one
  repository - no unseen-repo/temporal-holdout/adversarial coverage yet, and none of them
  measure verification-plan quality (Phase 15 has no evaluation-harness coverage yet).
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
  yet (see [[04-decisions]] #20). The schema's `history: HistoricalClaim[]` field remains
  defined but always empty - deliberately not used by this phase.
- Phase 15's risk assessment is a static rule table (see [[04-decisions]] #21) with no learned
  component, no awareness of the actual diff/change being made (it reasons only over compiled
  evidence + conflicts + task type), and doesn't distinguish "no tests exist at all" from
  "tests exist but weren't retrieved as evidence." The risk level is only exposed as text
  inside `verification[0]`, not as a structured schema field - `assessRisk`/`RiskAssessment`
  are exported for a future surface that wants the structured form without string-parsing.
