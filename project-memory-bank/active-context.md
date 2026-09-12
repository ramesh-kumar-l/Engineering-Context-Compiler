---
name: active-context
---

# Active Context

_Last updated: 2026-09-12_

## Current phase

**Phase 13 — GitHub / CI Integrations**: Complete.

## What just happened

Added `src/github/` and `src/reporting/` as a fifth thin surface over the same `runContext`
pipeline every other surface (CLI/skill/MCP/VS Code) calls — this time living **inside** the
root package rather than a separate sibling one, since a GitHub Actions step needs no special
manifest incompatible with the root ESM/CLI/MCP package (unlike Phase 12's VS Code extension):

1. `src/reporting/markdownReport.ts` — `renderMarkdownReport(pkg)`, pure and
   GitHub-independent: task/repository header, a primary-evidence table, a collapsible
   supporting-evidence table, and conditional conflicts/constraints/unknowns/verification/
   excluded sections. Escapes `|`/newlines so free-text evidence paths or identifiers can't
   break the Markdown table.
2. `src/github/prEventContext.ts` — `loadPullRequestEventContext(eventPath, repoSlug)` reads
   the GitHub Actions `pull_request` event JSON and derives a task request from the PR
   title+body (generic fallback if both are empty).
3. `src/github/githubCommentClient.ts` — `upsertPrComment(target, body)`, plain Node 20
   `fetch` against the GitHub REST API (no `@octokit`/`@actions` dependency); finds a prior ECC
   comment via a hidden HTML marker and `PATCH`es it instead of posting a duplicate on every
   push.
4. `src/github/runPrCompile.ts` — `main()` wires `loadPullRequestEventContext` →
   `runContext` → `validateContextPackage` → `renderMarkdownReport` → `upsertPrComment`. No
   pipeline or formatting logic of its own.
5. `src/github/index.ts` — shebang entry calling `main()`, mirroring `cli/index.ts`/
   `mcp/index.ts`.
6. `.github/workflows/pr-context.yml` — new workflow on `pull_request`
   (`opened`/`synchronize`/`reopened`), `pull-requests: write` permission, `fetch-depth: 0`
   checkout (so git evidence retrieval has real history), builds then runs
   `node dist/github/index.js` with the workflow's own `GITHUB_TOKEN`.

Satisfies Phase 13's exit criteria directly: opening/updating a PR against this repo now gets
an automatically-posted (and automatically-updated on re-push) Markdown comment containing the
ECC-compiled context — affected components (primary evidence), relevant tests (part of that
same evidence set), and a risk-scaled verification list. See [[04-decisions]] #19 for the full
rationale (why this stayed a root-package surface instead of a separate package like Phase 12,
why `fetch` over an SDK, why `pull_request` over `pull_request_target`).

Updated `package.json` (`bin.ecc-pr-context`), and all memory-bank files
(`implementation-status.md`, `04-decisions.md` #19, `05-roadmap.md`, `02-architecture.md`).

Verified: `npm run typecheck`, `npm run lint`, `npm test` (135/135 passing, 35 test files, up
from 123/31 — 12 new tests across 4 new test files), `npm run build`, `npm audit` all green.
No `src/core`/`src/cli` module changed, **no new runtime dependency**. New files ≤85 lines.

## In progress

Nothing — Phase 13 closed out cleanly. Awaiting user authorization to plan Phase 14.

## Next task

Per [[05-roadmap]], the next gated phase is **Phase 14 — Engineering Memory**: architectural
decisions/incidents/outcomes persist across sessions and are retrievable as evidence in later
compilations. Requires explicit authorization before planning/implementation begins (Rule 3).

## Open questions carried forward

- `SOURCE_AUTHORITY_WEIGHT` (Phase 5), `DEFAULT_TOKEN_BUDGET`/`MAX_SYMBOLS_PER_ITEM` (Phase 6)
  remain hand-picked static values. Phase 11's evaluation harness could tune these against
  measured metrics once more benchmark tasks/repos exist to tune against without overfitting.
- Conflict detection (Phase 7) is structural only - same subject (path/identifier) with a
  differing `trustLevel`. Still a known gap, not a regression.
- The trust rule table (`classifyTrust`, Phase 7) is static and per-source-type - not learned,
  not user-configurable yet. Revisit alongside Phase 14 (Engineering Memory) and Phase 16
  (Engineering Intelligence).
- The CLI has exactly one command (`context`) and one output format (pretty JSON) - no
  `--help`/`--version`, no subcommands. Revisit only if real usage reveals a need.
- The Phase 9 skill has no automated install step and doesn't yet mention the Phase 10 MCP
  tool or the Phase 12 VS Code command as alternatives to shelling out to the CLI -
  `skills/ecc-context/SKILL.md` should be revisited so it doesn't go stale by omission - worth
  doing together with a mention of the Phase 13 PR-comment surface too, not addressed this
  phase either.
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
  been performed in any session so far since none has had a GUI; the mocked test suite plus a
  clean `esbuild` build remain the only verification - worth a real F5 smoke test before
  relying on this in daily use.
- The Phase 13 GitHub integration only fires on `pull_request` from branches within this same
  repository - fork PRs get a read-only `GITHUB_TOKEN` under that trigger and so receive no
  comment; fixing this would mean switching to `pull_request_target`, which was deliberately
  rejected as a "pwn request" security risk (see [[04-decisions]] #19). There is also no actual
  live-PR smoke test yet (no session so far has push access to open a real PR against GitHub) -
  verification so far is a unit/integration-tested `main()` against the fixture repo with
  `fetch` stubbed, not an observed real comment on a real pull request. Worth doing once this
  branch/repo is actually pushed and a PR opened.
