---
name: implementation-status
---

# Implementation Status

_Last updated: 2026-09-12 (Phase 15)_

Update this file at the end of every major feature — it is the compressed "what actually
exists" record so future tasks don't have to re-derive it by reading source.

## Stack

- **Language/runtime**: TypeScript on Node.js (>=20), ESM (`"type": "module"`).
- **Rationale** (see [[04-decisions]] #5): MCP's reference SDK is TypeScript; the VS Code
  extension (Phase 12) is TypeScript regardless; `npx`-based zero-install distribution
  matches the CLI-first strategy in the master prompt. Consolidating on one language across
  CLI + MCP + VS Code avoids polyglot maintenance overhead.
- **VS Code extension packaging**: `vscode-extension/` is a **separate npm package** (own
  `package.json`/`node_modules`/CI job — see [[04-decisions]] #18) bundled with `esbuild` into
  one self-contained `dist/extension.js`, since a VS Code manifest needs fields (`engines.
  vscode`, `contributes`, `activationEvents`, a `require()`-able CJS `main`) the root ESM
  package/CLI/MCP `bin`s don't carry.
- **Runtime schema validation**: `zod`.
- **MCP**: `@modelcontextprotocol/sdk` (official reference SDK) — added in Phase 10 solely for
  the `compile_engineering_context` tool server; not used anywhere else.
- **AST parsing**: `typescript` compiler API, syntactic-only (no `Program`/type checker) —
  used to resolve top-level symbols and import specifiers. Moved from devDependency to
  dependency in Phase 2 since it's now used at runtime, not just for `tsc`.
- **Test runner**: `vitest`. **Typecheck**: `tsc --noEmit`. **Lint**: `eslint` (flat
  config, typescript-eslint recommended rules).
- **Build**: `tsc -p tsconfig.build.json` emits plain JS to `dist/` (git-ignored, rebuilt on
  demand) — added in Phase 8 solely to produce an executable `bin` artifact; `tsconfig.json`
  itself stays `noEmit` for fast typecheck-only runs.
- **CI**: `.github/workflows/ci.yml` runs typecheck + lint + test + build on push/PR to `main`,
  plus a `vscode-extension` job for that sibling package. `.github/workflows/pr-context.yml`
  (Phase 13) posts ECC context on `pull_request` events using only Node 20's built-in `fetch`
  (no `@octokit`/`@actions` dependency) — see [[04-decisions]] #19.
- **Engineering memory storage**: Phase 14 persists memory as one JSON file per target
  repository (`<repoRoot>/.ecc/memory.json`), read/written synchronously via plain `node:fs`
  — no database, no new dependency. See [[04-decisions]] #20.

## Modularity convention

Every file is kept well under 300 lines, one concern per file, so future tasks (agent or
human) can read only the specific module they need. Current largest file is 101 lines
(`dependencyAnalyzer.ts`). Directory shape:

```
src/
  core/
    types/               # pure TS interfaces: task, evidence, trust, contextPackage
    schema/               # zod schema + validateContextPackage()
    contextPackage.ts     # createEmptyContextPackage() factory
    repository/           # Phase 2: repo analysis (see table below)
    task/                 # Phase 3: task classification (see table below)
    evidence/             # Phase 4-5: evidence retrieval + ranking (see table below)
    compilation/          # Phase 6: context compilation (see table below)
    trust/                # Phase 7: provenance guarantee + trust classification + conflicts
    evaluation/            # Phase 11: agent-alone-vs-agent+ECC metrics engine (see table below)
    memory/                 # Phase 14: engineering memory store + retriever (see table below)
    verification/           # Phase 15: risk assessment + verification planning (see table below)
    index.ts              # barrel
  cli/                   # Phase 8: ecc CLI (see table below)
  mcp/                   # Phase 10: MCP server (see table below)
  benchmark/              # Phase 11: runnable benchmark surface (see table below)
  reporting/              # Phase 13: renderMarkdownReport(pkg) - pure, GitHub-independent
  github/                 # Phase 13: PR context posting surface (see table below)
  # Note: analyzed target repos get their own <repoRoot>/.ecc/memory.json (Phase 14) -
  # unrelated to this project's own source tree above.
  index.ts                # package public entry
skills/
  ecc-context/SKILL.md    # Phase 9: agent-facing skill doc (when/how to call the CLI)
test/
  core/contextPackage.test.ts
  repository/              # unit tests per module
  task/                     # unit tests + labeled-set accuracy test
  evidence/                 # unit + fixture-repo integration tests per retriever/ranker
  compilation/              # unit + fixture-repo integration tests for Phase 6 modules
  trust/                    # unit tests for Phase 7 modules
  cli/                      # unit + fixture-repo integration tests for Phase 8 CLI modules
  skill/                    # Phase 9: doc-consistency test for skills/ecc-context/SKILL.md
  mcp/                      # Phase 10: real-MCP-client tests for src/mcp/
  evaluation/               # Phase 11: unit + fixture-repo tests for src/core/evaluation/
  benchmark/                # Phase 11: unit test for src/benchmark/report.ts
  reporting/                # Phase 13: unit tests for src/reporting/markdownReport.ts
  github/                   # Phase 13: unit + fixture-repo integration tests for src/github/
  memory/                   # Phase 14: unit + isolated-temp-repo integration tests for src/core/memory/
  verification/             # Phase 15: unit tests for src/core/verification/
  fixtures/sample-repo/    # static fixture dir analyzed end-to-end by repositoryAnalyzer.test.ts
  fixtures/task-requests.json  # 54 labeled {request, expected TaskType} examples
  fixtures/pull-request-event.json  # sample GitHub Actions pull_request event payload

vscode-extension/          # Phase 12: separate npm package (own package.json/node_modules)
  src/
    extension.ts            # activate()/deactivate() - registers ecc.compileContext
    compileContextCommand.ts # vscode-dependent glue: resolves target dir, prompts, calls runContext
    preview.ts               # pure renderPreviewHtml(pkg) - no vscode import, unit-tested directly
  test/
    vscodeMock.ts             # hand-written 'vscode' module test double, aliased in vitest.config.ts
    extension.test.ts
    compileContextCommand.test.ts
    preview.test.ts
  esbuild.mjs                 # bundles src/extension.ts + its ../src imports into dist/extension.js
```

## Implemented (Phase 1 — ECC Foundation)

| Module | Path | What it does |
|---|---|---|
| Task type | `src/core/types/task.ts` | `TaskType` enum + `EngineeringTask` (Section 25 task types) |
| Trust model | `src/core/types/trust.ts` | `TrustLevel`: fact / derived / inference / unknown |
| Evidence model | `src/core/types/evidence.ts` | `EvidenceItem`, `EvidenceProvenance`, source types (Section 19) |
| Context package type | `src/core/types/contextPackage.ts` | `EngineeringContextPackage` — the central contract (Section 18) |
| Schema | `src/core/schema/contextPackage.schema.ts` | zod schema mirroring the type, for runtime validation |
| Validator | `src/core/schema/validate.ts` | `validateContextPackage()` — never throws, returns a discriminated result |
| Factory | `src/core/contextPackage.ts` | `createEmptyContextPackage(task, repo)` — schema-valid empty shell |

Test coverage: schema accepts a fully populated valid package and the empty factory
output; rejects out-of-range relevance, unknown task type enum values, and non-object
input without throwing. 5/5 tests passing, 0 lint errors, 0 typecheck errors, 0 npm audit
vulnerabilities.

## Implemented (Phase 2 — Repository Intelligence)

| Module | Path | What it does |
|---|---|---|
| Types | `src/core/repository/types.ts` | `FileCategory`, `Language`, `ResolvedSymbol`, `DependencyEdge`, `RepositoryAnalysis`, etc. |
| File classifier | `src/core/repository/fileClassifier.ts` | `classifyFile()` (source/test/config/documentation/build/other) + `detectLanguage()`; `EXCLUDED_DIRS` (node_modules, .git, dist, build, coverage, ...) |
| Walker | `src/core/repository/walker.ts` | `walkRepository(rootDir)` — recursive fs walk skipping excluded dirs, returns posix-relative paths |
| Symbol resolver | `src/core/repository/symbolResolver.ts` | `resolveSymbols(path, source)` — TypeScript-compiler-API (syntactic only) extraction of top-level function/class/interface/type/enum/const declarations, with exported flag + line number |
| Dependency analyzer | `src/core/repository/dependencyAnalyzer.ts` | `extractImports()` (static import/export-from + `require`/dynamic `import()`), `resolveImportSpecifier()` (resolves relative specifiers incl. TS-ESM `.js`→`.ts` mapping and directory `/index`), `buildDependencyGraph()` |
| Orchestrator | `src/core/repository/repositoryAnalyzer.ts` | `analyzeRepository(rootDir)` — walk → classify → resolve symbols for source files → build dependency graph → `RepositoryAnalysis` |

Supports TypeScript/JavaScript (one language family, per no-gold-plating — see
[[04-decisions]] #7). Analysis is **syntactic only**: no full type checker/program, no
cross-package resolution beyond relative imports — sufficient for "what exists and how does
it connect", not semantic analysis (that's a later-phase concern if ever needed).

Tested against `test/fixtures/sample-repo/` (a static 3-file TS package with a test file, a
`package.json`, and a `README.md`) plus focused unit tests per module. 27/27 tests passing
(5 test files), 0 lint errors, 0 typecheck errors, 0 npm audit vulnerabilities. All new
files 101 lines or fewer.

## Implemented (Phase 3 — Task Understanding)

| Module | Path | What it does |
|---|---|---|
| Types | `src/core/task/types.ts` | `TaskClassification { type, confidence }`, `TaskSignal { pattern, weight }` |
| Signals | `src/core/task/signals.ts` | `TASK_SIGNALS`: per-`TaskType` regex/weight pairs (weight 1 = generic verb, weight 2-3 = specific/compound phrase) |
| Classifier | `src/core/task/taskClassifier.ts` | `classifyTask(request)` — lowercases the request, sums weighted signal matches per `TaskType`, returns the top scorer; falls back to `explain` at confidence 0 when nothing matches |

Deliberately rule-based, not model-based: deterministic, dependency-free (no network call,
no new package), and instantly testable — sufficient for "reasonable accuracy" per the
Phase 3 exit criteria. Confidence is `(best - runnerUp) / best`, so exact ties are
confidence 0 and a lone matching type is confidence 1; downstream phases (e.g. Trust/
Provenance in Phase 7) can use this to flag low-confidence classifications rather than
treating them as fact.

Tested against a 54-example hand-labeled set (`test/fixtures/task-requests.json`, 6 per
`TaskType`) plus unit tests for edge cases (empty input, case-insensitivity, weighted
tie-breaking). **Measured accuracy: 54/54 (100%) on the labeled set**; test asserts a
≥85% floor so the suite doesn't silently regress if signals are edited later. 34/34 tests
passing overall (7 test files), 0 lint/typecheck errors, 0 npm audit vulnerabilities. All
new files ≤128 lines.

## Implemented (Phase 4 — Evidence Retrieval)

| Module | Path | What it does |
|---|---|---|
| Keyword extractor | `src/core/evidence/keywordExtractor.ts` | `extractKeywords(text)` (stopword-filtered request tokens), `tokenizeIdentifier(name)` (splits camelCase/snake_case/kebab-case/paths into comparable words) |
| Code retriever | `src/core/evidence/codeEvidenceRetriever.ts` | `retrieveCodeEvidence(task, repository)` — scores `source`-category files by keyword overlap against file path words and resolved symbol names; returns `EvidenceItem[]` (source `code`), capped at 50 candidates |
| Test retriever | `src/core/evidence/testEvidenceRetriever.ts` | `retrieveTestEvidence(codeEvidence, repository)` — finds test files related to matched code, via dependency-graph edges (test imports source) and a naming-convention fallback (`foo.ts` <-> `foo.test.ts`) |
| Git retriever | `src/core/evidence/gitEvidenceRetriever.ts` | `retrieveGitEvidence(repoRoot, paths)` — shells out to `git log` per path (`execFileSync`, array args, no shell interpolation) for recent commit history; returns `[]` gracefully (never throws) when not a git repo or git is unavailable |
| Orchestrator | `src/core/evidence/evidenceRetriever.ts` | `retrieveEvidence(task, repository)` — runs code -> test -> git (git only for the top 10 code matches, bounding process spawns) and concatenates into one candidate `EvidenceItem[]` |

Retrieval only, per the Phase 4 exit criteria — no cross-signal ranking beyond each
retriever's own basic keyword-overlap relevance score (that is Phase 5's job). All evidence
items conform to the existing `EvidenceItem`/`EvidenceProvenance` types from Phase 1
(`src/core/types/evidence.ts`), so no schema changes were needed.

Tested against `test/fixtures/sample-repo/` (same fixture as Phase 2) for code/test
retrieval, and an isolated throwaway temp git repo (created and torn down per test via
`mkdtemp`) for git retrieval, so results are deterministic and don't depend on this
project's own commit history. 47/47 tests passing overall (12 test files, up from 34/7),
0 lint/typecheck errors, 0 npm audit vulnerabilities, no new runtime dependency. All new
files ≤77 lines.

## Implemented (Phase 5 — Evidence Ranking)

| Module | Path | What it does |
|---|---|---|
| Ranker | `src/core/evidence/evidenceRanker.ts` | `rankEvidence(items)` — sorts Phase 4's candidate `EvidenceItem[]` by `computeRankScore()`: relevance × a static per-`EvidenceSourceType` authority weight (`SOURCE_AUTHORITY_WEIGHT`), plus a small specificity bonus for items with resolved `symbols`. Deterministic tiebreak by source-type priority then path/identifier. |

Three independent signals, addressing the cross-source-comparability gap flagged at the end
of Phase 4 (see [[active-context]] and [[04-decisions]] #9): (1) each item's own relevance
score from its retriever, (2) a static authority weight per source type (code is ground
truth > test > git/docs/etc.), and (3) a specificity bonus for symbol-level matches. This
means a highly-relevant but merely-supplementary git commit no longer outranks a modestly-
relevant source file — verified directly by a known-good-ordering test. Ranking is a pure,
non-mutating reordering step, kept separate from retrieval (Phase 4) and from token-budget
selection (Phase 6's job).

Tested with hand-constructed "known-good ordering" cases (relevance-only ordering,
authority-driven reordering that contradicts relevance-alone sort, specificity bonus,
deterministic tie-break, no mutation/no dropped items) plus one fixture-repo integration
test confirming code evidence ranks above test evidence for the same matched file. 53/53
tests passing overall (13 test files, up from 47/12), 0 lint/typecheck errors, 0 npm audit
vulnerabilities, no new runtime dependency. New files ≤80 lines.

## Implemented (Phase 6 — Context Compilation)

| Module | Path | What it does |
|---|---|---|
| Token budget | `src/core/compilation/tokenBudget.ts` | `estimateTokens(text)` (chars/4 heuristic), `estimateItemTokens(item)` (path+identifier+symbols text plus a flat per-item overhead), `DEFAULT_TOKEN_BUDGET` |
| Compressor | `src/core/compilation/contextCompressor.ts` | `compressEvidenceItem(item)` — truncates `symbols` to `MAX_SYMBOLS_PER_ITEM` (8), returns a new object, never mutates |
| Selector | `src/core/compilation/contextSelector.ts` | `selectEvidence(rankedEvidence, tokenBudget)` — walks ranked evidence in order, compressing + estimating each item, greedily including everything that still fits (skipping an oversized item without stopping, so a later smaller item can still fit); splits into `primary` (code/test) and `supporting` (everything else); returns `excluded: [{reason: 'token_budget_exceeded', count}]` for what didn't fit |
| Compiler (orchestrator) | `src/core/compilation/contextCompiler.ts` | `compileContext(task, repository, rankedEvidence, options?)` — builds on Phase 1's `createEmptyContextPackage()` + Phase 5's `rankEvidence()` output, calls `selectEvidence()`, and returns a fully populated `EngineeringContextPackage` |

Consumes Phase 5's ranked evidence as-is (does not re-rank); production-scale concerns
handled here: a bounded, dependency-free token estimate (no tokenizer to install/version),
a greedy rank-order fill so higher-priority evidence is never displaced by a same-cost
lower-priority item, and an explicit, counted `excluded` reason so a caller (CLI, MCP, ...)
can tell the user *why* an item was left out rather than getting a silently smaller package.
See [[04-decisions]] #12 for the token-estimation and greedy-selection rationale.

Tested with known-good selection/compression cases (generous budget keeps everything, tight
budget excludes lower-ranked items with the right count, primary/supporting split by source
type, a smaller later item fills space an earlier oversized item couldn't use, no mutation)
plus a fixture-repo end-to-end test (`retrieveEvidence` → `rankEvidence` → `compileContext`)
asserting the result validates against Phase 1's `validateContextPackage()` schema. 72/72
tests passing overall (17 test files, up from 53/13), 0 lint/typecheck errors, 0 npm audit
vulnerabilities, no new runtime dependency. New files ≤63 lines.

## Implemented (Phase 7 — Trust + Provenance)

| Module | Path | What it does |
|---|---|---|
| Types | `src/core/types/trust.ts` | `TrustedEvidenceItem` (`EvidenceItem` + required `trustLevel`), `EvidenceConflict { subject, items }` |
| Provenance guard | `src/core/trust/provenanceGuard.ts` | `ensureProvenance(item)` — returns the item's existing `provenance` if present, otherwise reconstructs one from the item's own `source`/`path`/`identifier` (never invents a new fact) |
| Trust classifier | `src/core/trust/trustClassifier.ts` | `classifyTrust(item)` — static per-`EvidenceSourceType` rule table -> exactly one of `fact`/`derived`/`inference`/`unknown`; `attachTrust(item)` composes `ensureProvenance` + `classifyTrust` into a `TrustedEvidenceItem`, never mutates |
| Conflict detector | `src/core/trust/conflictDetector.ts` | `detectConflicts(items)` — groups by subject (`path` or `identifier`); any subject with more than one distinct `trustLevel` across its items becomes an `EvidenceConflict`, reported rather than resolved |

`compileContext()` (Phase 6's orchestrator) now runs every selected item through `attachTrust`
before assigning it to `context.primary`/`context.supporting`, and calls `detectConflicts()`
over the combined result into a new `EngineeringContextPackage.conflicts` field (schema +
type updated; `createEmptyContextPackage()` defaults it to `[]`). This makes all three exit
criteria structural, not incidental:
- **Every item has provenance**: `TrustedEvidenceItem`/the schema's `evidenceItemSchema` both
  require `trustLevel`, and `attachTrust` guarantees `provenance` is populated before an item
  can become one — a `EngineeringContextPackage` that skipped this can't pass
  `validateContextPackage()`.
- **FACT/DERIVED/INFERENCE/UNKNOWN never blurred**: `classifyTrust` is a single deterministic
  function and the *only* place a `TrustLevel` is assigned — never inferred from `relevance`/
  `confidence`, which measure fit and certainty, not evidentiary kind.
- **Conflicts surfaced, not silently resolved**: `detectConflicts` runs unconditionally over
  every compiled package; conflicting items stay in `context.primary`/`supporting` as before
  (nothing is dropped or auto-merged) and are additionally listed in `conflicts`.

Trust rules (see [[04-decisions]] #13): `code`/`test` with a `path` -> `fact`; `git`/`ci`/
`incident`/`runtime` with a `commit` or `identifier` -> `fact`, else `derived`; `pr`/`issue`/
`documentation`/`constraint` -> `derived`; `memory` -> `inference`; anything with no
verifiable `path`/`identifier`/`commit` at all -> `unknown`.

Tested with known-good classifications per source type, provenance reconstruction (present
vs. missing, never inventing new facts, no mutation), conflict grouping (by path, by
identifier, same-trust-level not flagged, single-item subjects not flagged, no-subject items
ignored), and two `compileContext` integration tests (every included item carries provenance
+ a valid trust level; two items sharing a path but differing trust level produce a surfaced
conflict). 91/91 tests passing overall (20 test files, up from 72/17), 0 lint/typecheck
errors, 0 npm audit vulnerabilities, no new runtime dependency. New/changed files ≤78 lines
(schema file, due to the added conflict schema).

## Implemented (Phase 8 — CLI)

| Module | Path | What it does |
|---|---|---|
| Repository ref | `src/cli/repositoryRef.ts` | `resolveRepositoryRef(rootDir)` — folder name + `git rev-parse HEAD`; falls back to commit `"unknown"` for a non-git directory rather than throwing (same tolerance as `gitEvidenceRetriever.ts`) |
| Orchestrator | `src/cli/runContext.ts` | `runContext(repoPath, request, options?)` — the single end-to-end pipeline call: `analyzeRepository` → `classifyTask` → `retrieveEvidence` → `rankEvidence` → `compileContext`; every future surface (skill/MCP) is meant to call this, not re-implement it |
| Arg parsing | `src/cli/argv.ts` | `parseArgs(argv)` — hand-rolled parser for `context "<task>" [--path] [--out] [--budget]`; no dependency |
| Output | `src/cli/output.ts` | `formatPackage(pkg)` (pretty JSON), `writePackage(pkg, path)` (writes to a file) |
| CLI runner | `src/cli/cli.ts` | `runCli(argv)` — wires argv → `runContext` → `validateContextPackage` → print/write; returns an exit code instead of calling `process.exit`, so it's unit-testable without spawning a subprocess |
| Entry point | `src/cli/index.ts` | Shebang (`#!/usr/bin/env node`) thin wrapper calling `runCli(process.argv.slice(2))` |

`ecc context "<task>"` now runs the full pipeline against a real repository and prints a
schema-valid `EngineeringContextPackage` to stdout (or writes it to `--out <file>`), satisfying
Phase 8's exit criteria directly. `npm run build` (`tsc -p tsconfig.build.json`) compiles
`src/` to `dist/` preserving the shebang, and `package.json`'s `bin.ecc` points at
`dist/cli/index.js`; CI (`.github/workflows/ci.yml`) now also runs `npm run build` so a
build-breaking change fails the same way a test-breaking one does. See [[04-decisions]] #14
for why a build step and hand-rolled arg parsing were chosen over alternatives.

Tested via `runCli`/`runContext` directly (no subprocess spawn, consistent with every other
integration test in this repo): unknown command and missing-task-description error paths;
full fixture-repo pipeline produces a package that passes `validateContextPackage`; task
type/request/repository name flow through unchanged; a tiny `--budget` produces a non-empty
`excluded`; `resolveRepositoryRef` against a real temp git repo and a non-git directory. Also
manually smoke-tested the *built* `dist/cli/index.js` end-to-end (shebang intact, `context`,
`--out`, unknown-command, and missing-task paths all behave as expected). 103/103 tests
passing overall (24 test files, up from 91/20), 0 lint/typecheck errors, 0 npm audit
vulnerabilities, no new runtime dependency (typescript's own compiler handles the build).
New/changed files ≤50 lines.

## Implemented (Phase 9 — Skill Integration)

| Module | Path | What it does |
|---|---|---|
| Skill doc | `skills/ecc-context/SKILL.md` | Frontmatter (`name`, `description`) + instructions teaching an agent when to call `ecc context "<task>"`, how to invoke it (flags, build prerequisite), and how to read the resulting `EngineeringContextPackage` (primary vs. supporting evidence, `trustLevel`, `conflicts`, `unknowns`/`excluded`) |
| Doc-consistency test | `test/skill/skillDoc.test.ts` | Asserts the skill file has valid frontmatter, documents the real CLI flags (`--path`/`--out`/`--budget`) and package fields (`context.primary`, `trustLevel`, `conflicts`), and stays under 300 lines — guards against the doc drifting from the actual CLI as it evolves |

The skill is deliberately narrow: it teaches *when/how to invoke ECC and read its output*,
nothing else. It explicitly tells the agent not to fold planning/coding/review/verification
guidance into it, so it composes with (rather than duplicates) whatever methodology skills a
consuming agent already has — directly satisfying Phase 9's exit criteria. It is a thin
surface over the Phase 8 CLI exactly like Phase 8 was a thin surface over core (see
[[02-architecture]]); it calls no code and adds no new source module, so there was no
`runContext`-level integration to build — only documentation for an existing capability plus
a test that keeps that documentation honest.

Since a `SKILL.md` is an instructions artifact, not executable code, "testing" it means
doc-consistency rather than behavior: the new test reads the file and checks its documented
CLI syntax/fields against what Phase 8 actually implemented, so a future CLI change (e.g. a
renamed flag) fails this test instead of silently going stale. Verified: `npm run typecheck`,
`npm run lint`, `npm test` (107/107 passing across 25 test files, up from 103/24), `npm run
build`, `npm audit` all green. New files: `skills/ecc-context/SKILL.md` (~90 lines of
markdown, not source code so the 300-line code-modularity rule doesn't strictly apply, but
kept under it anyway per the doc-consistency test) and `test/skill/skillDoc.test.ts` (34
lines).

## Implemented (Phase 10 — MCP)

| Module | Path | What it does |
|---|---|---|
| Tool | `src/mcp/tool.ts` | `compileEngineeringContextTool(input)` — zod input shape (`task`, optional `path`/`tokenBudget`) + handler that calls `runContext` and returns a `CallToolResult`; never throws, returns `{isError: true, ...}` on any failure (bad path, invalid input, internal validation error) |
| Server | `src/mcp/server.ts` | `createEccMcpServer()` — builds an `@modelcontextprotocol/sdk` `McpServer` and registers `compile_engineering_context` on it; does not connect a transport |
| Entry point | `src/mcp/index.ts` | Shebang (`#!/usr/bin/env node`) thin wrapper connecting `createEccMcpServer()` over `StdioServerTransport` |

`compile_engineering_context` now runs the identical pipeline the Phase 8 CLI runs
(`runContext`), exposed as a real MCP tool over stdio (`bin.ecc-mcp` → `dist/mcp/index.js`),
satisfying Phase 10's exit criteria directly. No `src/core` module changed; `src/mcp/` is
structurally parallel to `src/cli/` (schema+handler / registration / entry point) per
[[02-architecture]] and [[04-decisions]] #16.

Tested three ways: (1) unit tests calling `compileEngineeringContextTool` directly against
the fixture repo (valid package, budget-driven exclusion, error result for an unreadable
path); (2) a real `@modelcontextprotocol/sdk` `Client` talking to `createEccMcpServer()` over
`InMemoryTransport.createLinkedPair()` — an actual MCP client/server pair exchanging the real
protocol, listing tools and calling `compile_engineering_context`, which is what the exit
criteria literally asks for; (3) a manual one-off smoke test spawning the *built*
`dist/mcp/index.js` as a subprocess via `StdioClientTransport`, confirming the shebang and
real process wiring work end-to-end (mirrors the Phase 8 CLI smoke test). 113/113 tests
passing overall (27 test files, up from 107/25), 0 lint/typecheck errors, 0 npm audit
vulnerabilities. New runtime dependency: `@modelcontextprotocol/sdk`. New files ≤75 lines.

## Implemented (Phase 11 — Evaluation + Benchmarking)

| Module | Path | What it does |
|---|---|---|
| Types | `src/core/evaluation/types.ts` | `BenchmarkTask { name, request, groundTruthRelevantPaths }`, `ConditionMetrics { evidenceRecall, irrelevantEvidenceRate, provenanceCompleteness, totalTokens, itemCount }`, `EvaluationResult` |
| Metrics | `src/core/evaluation/metrics.ts` | `computeConditionMetrics(input)` — pure scoring shared by both conditions: recall/irrelevance against ground truth, path de-duplication |
| Baseline retriever | `src/core/evaluation/baselineRetriever.ts` | `retrieveBaselineEvidence(rootDir, request, tokenBudget)` — the "agent alone" condition: naive keyword grep over source-file paths in walk order, reading whole matched files until the token budget runs out; no ranking/trust/compression |
| Evaluation runner | `src/core/evaluation/evaluationRunner.ts` | `runEvaluation(rootDir, task, tokenBudget?)` — runs both conditions against the same repo/task and scores each; the "agent+ECC" side re-composes `analyzeRepository → classifyTask → retrieveEvidence → rankEvidence → compileContext` directly (not via `runContext`) to stay a pure core module |
| Benchmark tasks | `src/benchmark/benchmarkTasks.ts` | Three `BenchmarkTask`s against **this repository's own real codebase** (trust-level extension, token-budget fix, ranking-recency signal) |
| Report | `src/benchmark/report.ts` | `formatReport(results)` — per-task comparison tables + an averaged summary, as markdown |
| Entry point | `src/benchmark/runBenchmark.ts` | `npm run benchmark` — runs every task in `benchmarkTasks.ts` against `process.argv[2] ?? '.'` and prints the report |

Satisfies Phase 11's exit criteria directly: `npm run benchmark` is an actual, repeatable
"agent alone vs. agent+ECC" comparison run (not just a defined framework), against a real
codebase, with the metrics from [[07-evaluation]] (recall, irrelevant-evidence rate,
provenance completeness, tokens) measured and recorded there. See [[04-decisions]] #17 for why
"agent alone" is a simulated naive-agent baseline (deterministic, offline, no live LLM call)
rather than a real second agent, and why `src/core/evaluation/` avoids importing `runContext`
from `src/cli/` to keep core independent of any surface, per [[02-architecture]].

**Measured result** (averaged across the three real-repo tasks, full breakdown in
[[07-evaluation]]): evidence recall 67% → 100%, provenance completeness 0% → 100%, estimated
tokens 2833 → 1053, comparing agent-alone to agent+ECC. Irrelevant-evidence rate went the
other way (72% → 87%) because ECC's supplementary git/test evidence counts as "irrelevant"
against each task's narrow ground-truth list — reported honestly, not tuned away.

Tested with: pure unit tests for `computeConditionMetrics` (exact-match, partial-match,
empty-ground-truth, de-duplication cases); `retrieveBaselineEvidence` against the fixture
repo (keyword match, no-match, budget cutoff); `runEvaluation` against the fixture repo,
asserting the one guarantee that holds regardless of this project's growing git history
(provenance completeness 0 vs. 1) rather than brittle exact token/item counts; a unit test
for `formatReport`'s output shape. 123/123 tests passing overall (31 test files, up from
113/27), 0 lint/typecheck errors, 0 npm audit vulnerabilities, **no new runtime dependency**.
New files ≤65 lines.

## Implemented (Phase 12 — VS Code Extension)

| Module | Path | What it does |
|---|---|---|
| Extension entry | `vscode-extension/src/extension.ts` | `activate(context)`/`deactivate()` — registers the single `ecc.compileContext` command and delegates to `compileContextCommand.ts`; no other logic |
| Command handler | `vscode-extension/src/compileContextCommand.ts` | `compileEngineeringContext(uri?)` — resolves a target directory (right-clicked resource, or its containing folder if a file, or the first workspace folder), prompts for the task via `showInputBox`, reads `ecc.tokenBudget` from VS Code settings, calls `runContext` (imported directly from `../src/cli/runContext.js`) inside a progress notification, validates the result, and shows it in a webview panel |
| Preview renderer | `vscode-extension/src/preview.ts` | `renderPreviewHtml(pkg)` — pure, vscode-independent function rendering task/repository/primary+supporting evidence/conflicts/unknowns/excluded as themed, HTML-escaped HTML |
| Test double | `vscode-extension/test/vscodeMock.ts` | Hand-written fake of the subset of the `vscode` API this extension uses (`commands`, `window`, `workspace`), aliased to the real `vscode` import via `vitest.config.ts`'s `resolve.alias` so command-wiring logic gets automated coverage without a real VS Code host |
| Build | `vscode-extension/esbuild.mjs` | Bundles `src/extension.ts` and everything it imports (including `../src/cli/runContext.ts` and its core dependencies, `zod`, `typescript`) into one self-contained `dist/extension.js`, marking only `vscode` external |

Satisfies Phase 12's exit criteria directly: the extension contributes **Compile Engineering
Context** to the Explorer context menu, the editor context menu, and the Command Palette;
invoking it against a real directory prompts for a task, runs the identical `runContext`
pipeline the CLI/MCP use, and renders a schema-validated `EngineeringContextPackage` as a
webview preview beside the editor — a thin client, not a reimplementation (see
[[04-decisions]] #18 and [[02-architecture]]).

Tested three ways: (1) `preview.test.ts` — pure unit tests of `renderPreviewHtml` (content
rendering, empty-list handling, conditional sections, HTML-escaping of free-text input); (2)
`compileContextCommand.test.ts` — the `vscode` module mocked, but `runContext` itself is
**real**, run against `test/fixtures/sample-repo/` (no-workspace error path, cancelled-prompt
no-op, right-clicked-file-falls-back-to-its-folder, and the full happy path producing a
webview with the compiled package's content); (3) `extension.test.ts` — command registration
and delegation, with `compileContextCommand.ts` mocked to isolate the wiring itself. Not
covered: a real `@vscode/test-electron` end-to-end run (menu actually appearing, real webview
rendering in a live VS Code window) — see [[04-decisions]] #18 for why, and the "Explicitly
NOT built yet" list below. `vscode-extension/` has its own `npm run typecheck && npm run lint
&& npm test && npm run build`: 11/11 tests passing (3 test files), 0 lint/typecheck errors, 0
npm audit vulnerabilities, clean `esbuild` bundle. Root project unaffected: still 123/123
tests, 0 lint/typecheck errors, 0 audit vulnerabilities, no root `package.json` dependency
added. New files ≤95 lines. CI (`.github/workflows/ci.yml`) gained a second job running the
same four checks inside `vscode-extension/`.

## Implemented (Phase 13 — GitHub / CI Integrations)

| Module | Path | What it does |
|---|---|---|
| Markdown report | `src/reporting/markdownReport.ts` | `renderMarkdownReport(pkg)` — pure, GitHub-independent renderer: task/repository header, primary evidence table, collapsible supporting-evidence table, conflicts/constraints/unknowns/verification/excluded sections, all `\|`-escaped for safe Markdown tables |
| Event parser | `src/github/prEventContext.ts` | `loadPullRequestEventContext(eventPath, repoSlug)` — reads the GitHub Actions `pull_request` event JSON off disk, extracts `{owner, repo, prNumber}` and derives a task request from the PR title+body (falls back to a generic request if both are empty) |
| Comment client | `src/github/githubCommentClient.ts` | `upsertPrComment(target, body)` — plain `fetch` against the GitHub REST API; finds a prior ECC comment via a hidden HTML marker and `PATCH`es it, or `POST`s a new one; throws with the response status/body on any non-OK response |
| Orchestrator | `src/github/runPrCompile.ts` | `main()` — reads `GITHUB_EVENT_PATH`/`GITHUB_REPOSITORY`/`GITHUB_TOKEN`/`GITHUB_WORKSPACE`, calls `runContext` (the same pipeline CLI/MCP/VS Code use), validates the result, renders it via `renderMarkdownReport`, and upserts the PR comment |
| Entry point | `src/github/index.ts` | Shebang (`#!/usr/bin/env node`) thin wrapper calling `main()` |
| Workflow | `.github/workflows/pr-context.yml` | Runs on `pull_request` (`opened`/`synchronize`/`reopened`) with `pull-requests: write` permission; checks out full git history (`fetch-depth: 0`, so git evidence retrieval has real history to read), builds, and runs `node dist/github/index.js` with the workflow's ambient `GITHUB_TOKEN` |

Satisfies Phase 13's exit criteria directly: opening or updating a pull request against this
repository posts a Markdown comment with the ECC-compiled context (affected components as
primary evidence, relevant tests as part of that same evidence set, and a risk-scaled
verification list) — posted automatically by CI, with no manual step. A repeat push to the
same PR replaces the prior comment (marker-based upsert) instead of piling up duplicates. No
`src/core`/`src/cli` module changed, no new runtime dependency (`fetch` is a Node 20 built-in).
See [[04-decisions]] #19 and [[02-architecture]] for why this stayed inside the root package
(unlike Phase 12's VS Code extension) and why no GitHub SDK was added.

Tested with: unit tests for `renderMarkdownReport` (content rendering, empty-list "None"
fallback, conditional optional sections, table-cell escaping); unit tests for
`loadPullRequestEventContext` (happy path, malformed `GITHUB_REPOSITORY`, missing
`pull_request` field) against a static fixture event (`test/fixtures/pull-request-event.json`);
unit tests for `upsertPrComment` with a stubbed global `fetch` (create path, update-existing
path, error propagation on a non-OK response); and an integration test for `main()` running the
**real** `runContext` pipeline against `test/fixtures/sample-repo/` with only `fetch` stubbed,
confirming the posted comment body actually contains the compiled context. 135/135 tests
passing overall (35 test files, up from 123/31), 0 lint/typecheck errors, 0 npm audit
vulnerabilities, no new runtime dependency. New files ≤85 lines.

## Implemented (Phase 14 — Engineering Memory)

| Module | Path | What it does |
|---|---|---|
| Types | `src/core/memory/types.ts` | `MEMORY_ENTRY_TYPES` (`decision`/`incident`/`outcome`), `MemoryEntry { id, type, summary, detail?, tags?, relatedPaths?, timestamp }` |
| Store | `src/core/memory/memoryStore.ts` | `loadMemoryEntries(repoRoot)` — reads `<repoRoot>/.ecc/memory.json`, returns `[]` on a missing or corrupt file (never throws); `recordMemoryEntry(repoRoot, input)` — assigns an id/timestamp, appends, and writes the file back (creating `.ecc/` on first use) |
| Retriever | `src/core/memory/memoryRetriever.ts` | `retrieveMemoryEvidence(task, entries)` — keyword-overlap scoring against each entry's summary/detail/tags/relatedPaths (same heuristic as `codeEvidenceRetriever.ts`), emitting `EvidenceItem`s with `source: 'memory'`; drops zero-overlap entries, floors relevance for a lone weak match |
| CLI command | `src/cli/memoryCommand.ts` | `runMemoryCommand(args)` — validates `--type`/`--summary`, calls `recordMemoryEntry`, prints confirmation; wired into `src/cli/argv.ts` (`memory` command) and `src/cli/cli.ts` |

`evidenceRetriever.ts`'s orchestrator now also loads and scores memory evidence for the
target repository, alongside code/test/git — the only change to existing retrieval code is
one additional call. `fileClassifier.ts`'s `EXCLUDED_DIRS` gained `.ecc` so the store itself
is never walked as a candidate source file. No `EvidenceItem`/schema/ranking/trust changes
were needed: `EVIDENCE_SOURCE_TYPES` already included `'memory'`, and Phase 5's
`SOURCE_AUTHORITY_WEIGHT`/Phase 7's `classifyTrust` already had rules for it (`inference`
trust, 0.45 authority) — built in anticipation of this phase, unused until now.

Satisfies Phase 14's exit criteria directly: `ecc memory --type decision --summary "..."`
persists an entry to `<repoRoot>/.ecc/memory.json`; any later `ecc context` call against that
same repository (or any other surface — MCP/VS Code/GitHub — since they all call the same
`retrieveEvidence` transitively via `runContext`) retrieves it as evidence if its content
overlaps the new task's keywords. Verified end-to-end against the **built** `dist/cli/index.js`
(not just unit tests): recorded an entry, ran a matching `context` request, confirmed the
entry appeared in `context.supporting` with `source: 'memory'`. See [[04-decisions]] #20 for
why memory flows through the existing `EvidenceItem` pipeline rather than the schema's
still-unused `history: HistoricalClaim[]` field, why the store is a flat JSON file (not a
database), and why the CLI is the only write surface built this phase.

Tested with: unit tests for `memoryStore.ts` (create-on-first-use, unique ids across repeat
entries, empty result for a missing file, empty result for corrupt/non-array JSON) using
isolated `mkdtemp` temp directories per test (never this project's own `.ecc/`); unit tests
for `memoryRetriever.ts` (no-keyword/no-entries/no-overlap → `[]`, keyword-overlap matching
via summary/detail/tags/relatedPaths, relevance floor, descending-relevance sort); an
integration test running the real `analyzeRepository` → `retrieveEvidence` chain against an
isolated temp repo (confirms a recorded entry surfaces as evidence, confirms `.ecc/` is never
walked as a classified file, confirms no memory evidence when nothing was recorded); unit
tests for `runMemoryCommand` (valid record, missing/invalid `--type`, missing `--summary`);
extended `argv.test.ts`/`cli.test.ts` with `memory`-command parsing and end-to-end cases.
156/156 tests passing overall (39 test files, up from 135/35 — 21 new tests), 0 lint/
typecheck errors, 0 npm audit vulnerabilities, **no new runtime dependency**. New files ≤62
lines (`memoryStore.ts`); largest touched file remains 108 lines (`argv.ts`).

## Implemented (Phase 15 — Verification Intelligence)

| Module | Path | What it does |
|---|---|---|
| Types | `src/core/verification/types.ts` | `RISK_LEVELS` (`low`/`medium`/`high`), `RiskAssessment { level, score, factors }` |
| Risk assessor | `src/core/verification/riskAssessor.ts` | `assessRisk(task, primary, supporting, conflicts)` — deterministic score from task-type weight, missing test coverage for touched code, low-trust primary evidence, surfaced conflicts, and blast radius (primary evidence count); maps the score to a level and lists the human-readable factors that contributed |
| Planner | `src/core/verification/verificationPlanner.ts` | `planVerification(task, primary, supporting, conflicts)` — calls `assessRisk`, then returns a step list always led by `Risk: <level> (<factors>)`, adding "run existing tests" / "add missing test coverage" always, "manually verify" at medium+, and "request peer review" / "resolve conflicts" at high |

`compileContext()` (`contextCompiler.ts`) now calls `planVerification()` once, after computing
`conflicts`, and assigns the result to `EngineeringContextPackage.verification` — a field that
existed since Phase 1's schema/type but was always `[]` until this phase. No schema/type
change was needed. This is the only change to existing code; `src/core/verification/` is a
self-contained new module.

Satisfies Phase 15's exit criteria directly: any `ecc context` (or MCP/VS Code/GitHub) call now
returns a non-empty, risk-scaled `verification` list instead of an empty array. Verified
end-to-end against the **built** `dist/cli/index.js`: a `refactor` task against the fixture
repo produced `["Risk: medium (task type 'refactor' inherently carries elevated risk)", "Run
the existing tests: test/index.test.ts", "Manually verify the primary evidence above reflects
the intended change"]`, while an `explain` task on the same repo produced a shorter, low-risk
plan — and Phase 13's `renderMarkdownReport` (which already had a "Suggested verification"
section, previously always empty) now renders it directly. See [[04-decisions]] #21.

Tested with: unit tests for `assessRisk` (low-risk baseline, task-type weighting, missing-test
factor, low-trust factor, conflict factor, multi-factor high-risk case) and `planVerification`
(risk line always first, test-suite step when tests exist, add-coverage step when they don't,
no test-related step when there's no code evidence at all, peer-review + conflict-resolution
steps only at high risk, no peer-review step at low risk); two new assertions added to the
existing `contextCompiler.test.ts` confirming `pkg.verification` is populated end-to-end
(known-good case and real fixture-repo pipeline). 168/168 tests passing overall (41 test
files, up from 156/39 — 12 new tests across 2 new test files plus 2 additive assertions), 0
lint/typecheck errors, 0 npm audit vulnerabilities, **no new runtime dependency**. New files
≤74 lines (`riskAssessor.ts`).

## Explicitly NOT built yet (do not assume these exist)

- Conflict detection is structural only (same subject, differing `trustLevel`) — there is no
  semantic/content diff between two claims about the same file, since no such capability
  exists yet. A `path`+`identifier` collision with the *same* `trustLevel` is not flagged even
  if the underlying claims disagree in content.
- The Phase 9 skill only documents the CLI — it does not itself invoke `runContext` or ship
  any code; there is no automatic skill-discovery/install mechanism, a user/agent must copy
  or symlink `skills/ecc-context/` into their own skills directory. It also does not yet
  mention the Phase 10 MCP tool as an alternative invocation path (carried-forward open item).
- The CLI has exactly one command (`context`) and one output format (pretty JSON) — no
  `--help`/`--version`, no subcommands, no machine-compact output mode.
- The MCP server exposes exactly one tool (`compile_engineering_context`) over stdio only —
  no resources, no prompts, no SSE/StreamableHTTP transport, no auth; `path` defaults to the
  server process's own working directory when omitted, there is no per-call sandboxing/
  workspace-root restriction beyond what the OS/filesystem already enforces.
- No persistence/memory engine beyond the markdown files in this directory.
- Repository analysis has no caching/incremental re-analysis — full walk every call; fine
  at current scale, revisit only if a real repo makes it a measured bottleneck.
- Symbol resolution does not follow re-exports (`export * from './x.js'`) to attribute
  symbols to their original declaring file — each file's symbols are its own top-level
  declarations only.
- Task classification is single-label and keyword/regex-based only — no multi-label
  output, no ML/embedding-based classification, no request normalization beyond
  lowercasing (e.g. no typo correction).
- The Phase 11 "agent alone" baseline is a **simulated** naive-agent heuristic (keyword grep,
  whole-file reads), not a real second AI agent or a live LLM call — deliberately, to keep
  the comparison deterministic/offline/CI-safe (see [[04-decisions]] #17). Real agent-in-the-
  loop evaluation (spinning up an actual coding agent with/without ECC and comparing task
  outcomes) is a possible future extension, not built.
- The benchmark suite has exactly three tasks, all against this one repository — no unseen-
  repo, temporal-holdout, adversarial, or cross-language coverage yet (see [[07-evaluation]]'s
  "Benchmark" section for what's still open).
- The VS Code extension has no `@vscode/test-electron` end-to-end test (a real VS Code host
  actually rendering the context menu / webview) — only a mocked-`vscode`-module unit-test
  suite plus a documented manual F5 smoke-test procedure (`vscode-extension/README.md`). It is
  not published to the Marketplace, not packaged as a `.vsix`, has no icon/gallery banner, and
  offers no way to save/copy the preview's content back out (e.g. "send to agent" is manual
  copy-paste from the webview, not a button) — `contributes.commands`/`menus` intentionally
  stay to the single command Phase 12's exit criteria asks for.
- The Phase 13 GitHub integration only triggers on `pull_request` (`opened`/`synchronize`/
  `reopened`) against this repository's own workflow; fork PRs get a read-only `GITHUB_TOKEN`
  under that trigger and so will **not** receive a comment (fixing this would require
  `pull_request_target`, deliberately rejected as a security risk — see [[04-decisions]] #19).
  There is no status-check/annotation surface (only a PR comment), no per-repo configuration
  (token budget is a fixed env var, not a workflow input), and no CI-integration beyond GitHub
  (no GitLab/Bitbucket equivalent).
- Phase 14's memory store is per-repository, flat-file, and **retrieval-only beyond keyword
  overlap** — no update/delete of an existing entry (append-only), no size cap/pruning of
  `.ecc/memory.json` as it grows, no dedup of near-identical entries, no cross-repository
  memory sharing, and no exposure via MCP/VS Code/GitHub (CLI is the only write surface so
  far — see [[04-decisions]] #20). Matching is the same basic keyword-overlap heuristic as
  Phase 4's code retriever, not embedding/semantic similarity, so a relevant entry phrased
  very differently from the new task's request can be missed.
- The schema's `history: HistoricalClaim[]` field remains defined but always empty —
  Phase 14 deliberately routed memory through the `EvidenceItem` pipeline instead (see
  [[04-decisions]] #20); nothing populates `history` yet.
- Phase 15's risk assessment is a **static rule table**, not learned/configurable — the same
  no-gold-plating rationale as Phase 3's task classifier and Phase 5's authority weights (see
  [[04-decisions]] #21). It only reasons over what a compilation already gathered (evidence,
  conflicts, task type); it does not run any tests, does not know the actual diff/change being
  made, and does not distinguish "no tests exist for this code at all" from "tests exist but
  weren't matched as evidence." The schema gained no new `risk`/`riskLevel` field — the risk
  level is only exposed as the leading string in `verification`, not as structured data, so a
  caller that wants just the level must parse that string (`RiskAssessment`/`assessRisk` are
  exported for any future surface that wants the structured form directly).

## Next module to build

Phase 16 (Engineering Intelligence) — see [[05-roadmap]] for exit criteria — is the next
gated phase. Not started.
