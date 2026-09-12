---
name: active-context
---

# Active Context

_Last updated: 2026-09-12_

## Current phase

**Phase 8 — CLI**: Complete.

## What just happened

Built `src/cli/` (six small, single-purpose modules, same orchestrator pattern as every prior
phase):

1. `repositoryRef.ts` — `resolveRepositoryRef(rootDir)`: folder name + `git rev-parse HEAD`,
   falling back to commit `"unknown"` for a non-git directory (never throws, same tolerance
   as `gitEvidenceRetriever.ts` from Phase 4).
2. `runContext.ts` — `runContext(repoPath, request, options?)`: the single end-to-end pipeline
   call — `analyzeRepository` -> `classifyTask` -> `retrieveEvidence` -> `rankEvidence` ->
   `compileContext`. This is the one orchestration point every current and future surface
   (CLI now, skill/MCP in Phases 9-10) should call into.
3. `argv.ts` — `parseArgs(argv)`: hand-rolled parser for `context "<task>" [--path] [--out]
   [--budget]`, no dependency.
4. `output.ts` — `formatPackage(pkg)` / `writePackage(pkg, path)`: pretty-JSON stdout or file
   output.
5. `cli.ts` — `runCli(argv)`: wires argv -> `runContext` -> `validateContextPackage` ->
   print/write; returns an exit code instead of calling `process.exit`, so it's testable
   without spawning a subprocess.
6. `index.ts` — the actual `bin` entry: a shebang (`#!/usr/bin/env node`) plus a two-line call
   into `runCli`.

Also added the build tooling this phase needed but Phase 1 deliberately deferred (Decision
#6): `tsconfig.build.json` (extends the base config, `noEmit: false`, `outDir: dist`), a
`build` npm script, `package.json`'s new `bin.ecc -> ./dist/cli/index.js`, and a `build` step
in CI (`.github/workflows/ci.yml`) so a build-breaking change fails the same way a
test-breaking one does. `tsconfig.json` itself stays `noEmit` so `npm run typecheck` remains
fast. `vitest.config.ts` gained `testTimeout: 15000` after a process-spawning git test timed
out under parallel load in the full suite (passed instantly in isolation) — cold-process
spawn overhead under load, not a code defect; see [[04-decisions]] #14 for the full build/
testing rationale.

This directly satisfies Phase 8's exit criteria: `ecc context "<task>"` runs the full
pipeline against a real repository and prints a schema-valid `EngineeringContextPackage` to
stdout (or writes it via `--out <file>`). Manually verified against the built
`dist/cli/index.js` (not just the unit-tested source): ran `node dist/cli/index.js context
"explain the utils module" --path test/fixtures/sample-repo` and confirmed the shebang
survived compilation and the printed JSON is schema-valid with `provenance`/`trustLevel` on
every item; also verified `--out`, the unknown-command error path, and the missing-task-
description error path.

Tested via `runCli`/`runContext` directly (no subprocess spawn - consistent with every other
integration test in this repo, and exercises the identical code path the shebang entry
calls): unknown-command and missing-task error paths; full fixture-repo pipeline produces a
package that passes `validateContextPackage`; task type/request/repository name flow through
unchanged; a tiny `--budget` produces a non-empty `excluded`; `resolveRepositoryRef` against
a real temp git repo (regex-matched 40-hex commit) and a non-git directory (`"unknown"`).
Verified: `npm run typecheck`, `npm run lint`, `npm test` (103/103 passing across 24 test
files, up from 91/20), `npm run build` (clean compile, shebang preserved), `npm audit` (0
vulnerabilities) all green. New/changed source files ≤50 lines. No new runtime dependency.
README updated with CLI usage instructions.

## In progress

Nothing - Phase 8 closed out cleanly. Awaiting user authorization to plan Phase 9.

## Next task

Per [[05-roadmap]], the next gated phase is **Phase 9 — Skill Integration**: a Claude skill
that teaches an agent when/how to invoke ECC (via the Phase 8 CLI / `runContext`), without
duplicating existing engineering-methodology skills. Requires explicit authorization before
planning/implementation begins (Rule 3).

## Open questions carried forward

- No target repository/task type has been chosen by the user to validate compilation against
  beyond fixtures. The CLI can now be pointed at any real repo to check this - worth doing
  before Phase 9/10 build agent-facing surfaces on top of it, since token-budget defaults and
  trust classifications are easier to tune against real evidence volumes than a small fixture.
- `SOURCE_AUTHORITY_WEIGHT` (Phase 5), `DEFAULT_TOKEN_BUDGET`/`MAX_SYMBOLS_PER_ITEM` (Phase 6)
  remain hand-picked static values, unchanged this phase - still worth revisiting once
  Phase 11's evaluation exists.
- Conflict detection (Phase 7) is structural only - same subject (path/identifier) with a
  differing `trustLevel`. Unchanged this phase; still a known gap, not a regression.
- The trust rule table (`classifyTrust`, Phase 7) is static and per-source-type - not learned,
  not user-configurable yet. Revisit alongside Phase 11's evaluation and Phase 14 (Engineering
  Memory), per the same note as last phase.
- The CLI has exactly one command (`context`) and one output format (pretty JSON) - no
  `--help`/`--version`, no subcommands. Sufficient for Phase 8's exit criteria; revisit only
  if Phase 9/10 usage reveals a real need (e.g. a `--format compact` for token-constrained
  agent contexts).
- `vitest.config.ts`'s new `testTimeout: 15000` is a blunt fix for occasional slow
  process-spawning tests under parallel load on this machine; if flakiness persists on a
  different CI runner, the more targeted fix is a per-test timeout override on just the
  git-spawning tests rather than raising the global default further.
