---
name: implementation-status
---

# Implementation Status

_Last updated: 2026-09-12 (Phase 7)_

Update this file at the end of every major feature — it is the compressed "what actually
exists" record so future tasks don't have to re-derive it by reading source.

## Stack

- **Language/runtime**: TypeScript on Node.js (>=20), ESM (`"type": "module"`).
- **Rationale** (see [[04-decisions]] #5): MCP's reference SDK is TypeScript; the planned
  VS Code extension (Phase 12) must be TypeScript regardless; `npx`-based zero-install
  distribution matches the CLI-first strategy in the master prompt. Consolidating on one
  language across CLI + MCP + VS Code avoids polyglot maintenance overhead.
- **Runtime schema validation**: `zod`.
- **AST parsing**: `typescript` compiler API, syntactic-only (no `Program`/type checker) —
  used to resolve top-level symbols and import specifiers. Moved from devDependency to
  dependency in Phase 2 since it's now used at runtime, not just for `tsc`.
- **Test runner**: `vitest`. **Typecheck**: `tsc --noEmit`. **Lint**: `eslint` (flat
  config, typescript-eslint recommended rules).
- **CI**: `.github/workflows/ci.yml` runs typecheck + lint + test on push/PR to `main`.

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
    index.ts              # barrel
  index.ts                # package public entry
test/
  core/contextPackage.test.ts
  repository/              # unit tests per module
  task/                     # unit tests + labeled-set accuracy test
  evidence/                 # unit + fixture-repo integration tests per retriever/ranker
  compilation/              # unit + fixture-repo integration tests for Phase 6 modules
  trust/                    # unit tests for Phase 7 modules
  fixtures/sample-repo/    # static fixture dir analyzed end-to-end by repositoryAnalyzer.test.ts
  fixtures/task-requests.json  # 54 labeled {request, expected TaskType} examples
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

## Explicitly NOT built yet (do not assume these exist)

- Conflict detection is structural only (same subject, differing `trustLevel`) — there is no
  semantic/content diff between two claims about the same file, since no such capability
  exists yet. A `path`+`identifier` collision with the *same* `trustLevel` is not flagged even
  if the underlying claims disagree in content.
- No CLI entry point / `bin` (Phase 8) — deliberately deferred; no invocable surface yet.
- No skill or MCP server (Phases 9-10).
- No build/bundle step (`tsc` is `noEmit`-only for now) — will be added when the CLI
  phase needs an executable artifact.
- No persistence/memory engine beyond the markdown files in this directory.
- Repository analysis has no caching/incremental re-analysis — full walk every call; fine
  at current scale, revisit only if a real repo makes it a measured bottleneck.
- Symbol resolution does not follow re-exports (`export * from './x.js'`) to attribute
  symbols to their original declaring file — each file's symbols are its own top-level
  declarations only.
- Task classification is single-label and keyword/regex-based only — no multi-label
  output, no ML/embedding-based classification, no request normalization beyond
  lowercasing (e.g. no typo correction).

## Next module to build

Phase 8 (CLI) — see [[05-roadmap]] for exit criteria — is the next gated phase. Not started.
