---
name: active-context
---

# Active Context

_Last updated: 2026-09-12_

## Current phase

**Phase 12 — VS Code Extension**: Complete.

## What just happened

Added `vscode-extension/`, a **separate npm package** (own `package.json`/`node_modules`/CI
job — a VS Code manifest needs fields the root ESM/CLI/MCP package doesn't carry):

1. `src/extension.ts` — `activate()`/`deactivate()`, registers the one contributed command
   (`ecc.compileContext`) and delegates to `compileContextCommand.ts`. Deliberately the
   thinnest file in the extension.
2. `src/compileContextCommand.ts` — the command handler: resolves a target directory (the
   right-clicked resource, its containing folder if a file was clicked, or the first workspace
   folder), prompts for the task via `showInputBox`, reads `ecc.tokenBudget` from VS Code
   settings, and calls `runContext` — imported **directly** from `../src/cli/runContext.js`
   (not spawned as a child process, not reimplemented) inside a progress notification. Shows
   the schema-validated result in a webview panel.
3. `src/preview.ts` — `renderPreviewHtml(pkg)`, a pure, vscode-independent HTML renderer
   (task/repository/primary+supporting evidence/conflicts/unknowns/excluded), HTML-escaping
   all free-text fields.
4. `test/vscodeMock.ts` + three test files — the `vscode` module is aliased to a hand-written
   test double (`vitest.config.ts`'s `resolve.alias`), so command registration and delegation
   get real automated coverage without a `@vscode/test-electron` host; the command-handler
   tests run the **real** `runContext` pipeline against `test/fixtures/sample-repo/`.
5. `esbuild.mjs` — bundles `src/extension.ts` and everything it imports (including
   `../src/cli/runContext.ts`'s full core dependency chain, `zod`, `typescript`) into one
   self-contained `dist/extension.js`, marking only `vscode` external.

Contributes **Compile Engineering Context** to the Explorer context menu, the editor context
menu, and the Command Palette — satisfying Phase 12's exit criteria directly. See
[[04-decisions]] #18 for the full rationale (why direct import over child-process spawn, why a
separate package, why a mocked-`vscode` test strategy over `@vscode/test-electron`).

Updated `.github/workflows/ci.yml` (new `vscode-extension` job: typecheck/lint/test/build
inside that folder), `.gitignore` (`*.vsix`), `README.md` (status bump + new "## VS Code
extension" section), and all memory-bank files (`implementation-status.md`, `04-decisions.md`
#18, `05-roadmap.md`, `02-architecture.md`).

Verified: root project unaffected — `npm run typecheck`, `npm run lint`, `npm test` (123/123,
unchanged), `npm run build`, `npm audit` all still green, **no root `package.json` dependency
added**. `vscode-extension/` (its own toolchain): `npm run typecheck`, `npm run lint`, `npm
test` (11/11 passing, 3 test files), `npm run build` (clean `esbuild` bundle, confirmed
`activate`/`deactivate` are exported and `vscode` stays external via string inspection of the
built bundle — the module can't be `require()`d standalone outside a real extension host,
which is expected), `npm audit` (0 vulnerabilities). New files ≤95 lines.

## In progress

Nothing — Phase 12 closed out cleanly. Awaiting user authorization to plan Phase 13.

## Next task

Per [[05-roadmap]], the next gated phase is **Phase 13 — GitHub / CI Integrations**: a PR gets
ECC-compiled context (affected components, relevant tests, risk) posted or made available
automatically. Requires explicit authorization before planning/implementation begins (Rule 3).

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
  tool as an alternative to shelling out to the CLI - `skills/ecc-context/SKILL.md` should be
  revisited so it doesn't go stale by omission. Now that Phase 12 adds a third way to reach
  the same pipeline (the VS Code command), the skill arguably should mention all three
  surfaces - worth doing together, not addressed this phase either.
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
  interactive verification (an actual right-click in a running VS Code window) was not
  performed in this session since it has no GUI; the mocked test suite plus a clean `esbuild`
  build are the verification that exists so far - worth a real F5 smoke test before relying on
  this in daily use.
