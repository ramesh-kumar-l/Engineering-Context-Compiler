---
name: active-context
---

# Active Context

_Last updated: 2026-09-12_

## Current phase

**Phase 14 — Engineering Memory**: Complete.

## What just happened

Added `src/core/memory/` — the first genuinely new **core** component since Phase 11 (every
other surface added since then, Phases 12/13, was a thin client; this is a capability every
surface gains for free):

1. `src/core/memory/types.ts` — `MemoryEntry { id, type, summary, detail?, tags?,
   relatedPaths?, timestamp }`, `type` one of `decision`/`incident`/`outcome`.
2. `src/core/memory/memoryStore.ts` — `loadMemoryEntries(repoRoot)` reads
   `<repoRoot>/.ecc/memory.json` synchronously (never throws — a missing/corrupt file just
   means no memory yet, same tolerance `gitEvidenceRetriever.ts` applies to a non-git
   directory); `recordMemoryEntry(repoRoot, input)` appends one entry, creating `.ecc/` on
   first use.
3. `src/core/memory/memoryRetriever.ts` — `retrieveMemoryEvidence(task, entries)` scores
   stored entries against a task's keywords using the same heuristic
   `codeEvidenceRetriever.ts` uses, emitting `EvidenceItem`s with `source: 'memory'`.
4. `src/cli/memoryCommand.ts` (+ `argv.ts`/`cli.ts` wiring) — `ecc memory --type
   <decision|incident|outcome> --summary "..." [--detail ...] [--tags a,b] [--paths x,y]
   [--path <dir>]`, the one write surface built this phase.
5. `evidenceRetriever.ts` now also loads+scores memory evidence for the target repository
   alongside code/test/git — the only change to existing retrieval code. `fileClassifier.ts`
   gained `.ecc` in `EXCLUDED_DIRS` so the store is never walked as a candidate file.

No `EvidenceItem`/schema/ranking/trust code changed: `EVIDENCE_SOURCE_TYPES` already included
`'memory'`, and Phase 5/7's `SOURCE_AUTHORITY_WEIGHT`/`classifyTrust` already had rules for it
(`inference` trust, 0.45 authority) — built in anticipation of this phase, unused until now.
See [[04-decisions]] #20 for the full rationale, including why memory routes through the
existing `EvidenceItem` pipeline rather than the schema's still-unused
`history: HistoricalClaim[]` field.

Satisfies Phase 14's exit criteria directly: a decision/incident/outcome recorded via
`ecc memory` persists to disk and is retrievable as evidence (`source: 'memory'`) by any
later `ecc context` call against that same repository — and, since every surface calls
`retrieveEvidence` transitively via `runContext`, by MCP/VS Code/GitHub too, with zero changes
to any of them. Verified end-to-end against the **built** `dist/cli/index.js`, not just unit
tests: recorded an entry, ran a matching `context` request, confirmed it appeared in
`context.supporting`.

Updated all memory-bank files (`implementation-status.md`, `04-decisions.md` #20,
`05-roadmap.md`, `02-architecture.md`) and `skills/ecc-context/SKILL.md` (new "Recording
memory" section, so the skill doc doesn't go stale on this new CLI command — addresses part
of a carried-forward open item below).

Verified: `npm run typecheck`, `npm run lint`, `npm test` (156/156 passing, 39 test files, up
from 135/35 — 21 new tests across 4 new test files plus additive cases in `argv.test.ts`/
`cli.test.ts`), `npm run build`, `npm audit` all green. No new runtime dependency. New files
≤62 lines; largest touched file 108 lines (`argv.ts`).

## In progress

Nothing — Phase 14 closed out cleanly. Awaiting user authorization to plan Phase 15.

## Next task

Per [[05-roadmap]], the next gated phase is **Phase 15 — Verification Intelligence**: ECC
recommends a verification plan (tests/checks) scaled to task risk. Requires explicit
authorization before planning/implementation begins (Rule 3).

## Open questions carried forward

- `SOURCE_AUTHORITY_WEIGHT` (Phase 5), `DEFAULT_TOKEN_BUDGET`/`MAX_SYMBOLS_PER_ITEM` (Phase 6)
  remain hand-picked static values. Phase 11's evaluation harness could tune these against
  measured metrics once more benchmark tasks/repos exist to tune against without overfitting.
- Conflict detection (Phase 7) is structural only - same subject (path/identifier) with a
  differing `trustLevel`. Still a known gap, not a regression.
- The trust rule table (`classifyTrust`, Phase 7) is static and per-source-type - not learned,
  not user-configurable yet. Phase 14 didn't change this (memory got the pre-existing
  `inference` rule); still worth revisiting alongside Phase 16 (Engineering Intelligence).
- The CLI now has two commands (`context`, `memory` as of Phase 14) and one output format
  (pretty JSON) - no `--help`/`--version`, no machine-compact output mode.
- The Phase 9 skill doc was updated this phase to mention `ecc memory`, but still doesn't
  mention the Phase 10 MCP tool or the Phase 12 VS Code command as alternatives to shelling
  out to the CLI - `skills/ecc-context/SKILL.md` should be revisited for that gap.
- The MCP server exposes exactly one tool over stdio only - no resources/prompts, no HTTP/SSE
  transport, no auth, and no workspace-root sandboxing beyond what the OS/filesystem already
  enforces on the `path` argument. Revisit if a hosted/remote MCP deployment is ever required.
- The Phase 11 "agent alone" baseline is a simulated heuristic, not a real second AI agent -
  see [[04-decisions]] #17. The benchmark also has only three tasks, all against this one
  repository - no unseen-repo/temporal-holdout/adversarial coverage yet.
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
