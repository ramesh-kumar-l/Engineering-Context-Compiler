# 02 — Architecture (Target — NOT YET IMPLEMENTED)

Status: **design target**, partially implemented — see [[implementation-status]] for what
actually exists (Phase 1: core types/schema; Phase 2: repository analysis; Phase 3: task
classification; Phase 4: evidence retrieval; Phase 5: evidence ranking; Phase 6: context
compilation; Phase 7: trust + provenance; Phase 8: CLI; Phase 9: skill integration; Phase 10:
MCP; Phase 11: evaluation + benchmarking; Phase 12: VS Code extension; Phase 13: GitHub/CI
integration).
Recorded here so future phases don't re-derive the target shape and implementation stays
aligned with the governing spec.

## Target shape

```
                    AI AGENTS
                        │
             ┌──────────┴──────────┐
           SKILLS                 MCP
        "HOW to work"       "ACCESS ECC"
             └──────────┬──────────┘
                        ▼
                  ECC CORE
   Task Model · Repo Model · Evidence · Retrieval
   Ranking · Compression · Provenance · Trust
   Verification · Memory
                        │
         ┌──────────────┼──────────────┐
       CODE            GIT            DOCS
         │              │              │
       TESTS           PRs          ISSUES
         └──────────────┼──────────────┘
                        ▼
              ENGINEERING REALITY
```

Core must stay independent of any specific UI or agent integration.

## Candidate components (implement only as each phase requires — do not build all at once)

`TaskClassifier ✅, TaskNormalizer, RepositoryAnalyzer ✅, FileClassifier ✅, SymbolResolver ✅,
DependencyAnalyzer ✅, EvidenceRetriever ✅, GitHistoryAnalyzer ✅, ContextRanker ✅, ContextSelector ✅,
ContextCompressor ✅, TokenBudgetManager ✅, ProvenanceEngine ✅, TrustEngine ✅, VerificationPlanner,
ContextPackageBuilder ✅, EvaluationEngine ✅, MemoryEngine, AgentAdapter`

✅ = implemented: repository analysis (Phase 2, `src/core/repository/`), task classification
(Phase 3, `src/core/task/`), evidence retrieval incl. git history (Phase 4,
`src/core/evidence/`), evidence ranking (Phase 5, `src/core/evidence/evidenceRanker.ts`),
context compilation (Phase 6, `src/core/compilation/`) — token budgeting
(`tokenBudget.ts`), symbol-list compression (`contextCompressor.ts`), primary/supporting
selection with exclusion tracking (`contextSelector.ts`), and the `compileContext()`
orchestrator (`contextCompiler.ts`, the `ContextPackageBuilder`); trust + provenance (Phase 7,
`src/core/trust/`) — guaranteed provenance reconstruction (`provenanceGuard.ts`, the
`ProvenanceEngine`), per-source-type trust classification (`trustClassifier.ts`, the
`TrustEngine`), and structural conflict surfacing (`conflictDetector.ts`). All others: not
started.

The **CLI** (Phase 8, `src/cli/`) is not itself a candidate component — it's the first thin
surface over the core: `ecc context "<task>"` (`src/cli/cli.ts` → `runContext.ts`) calls the
same `analyzeRepository` → `classifyTask` → `retrieveEvidence` → `rankEvidence` →
`compileContext` pipeline above, adds a `RepositoryRef` (`repositoryRef.ts`, the missing
`{name, commit}` piece core alone can't produce), and prints/writes the resulting
`EngineeringContextPackage`.

The **Skill** (Phase 9, `skills/ecc-context/SKILL.md`) is thinner still — it wraps the CLI,
not core: it is pure instructions (frontmatter + markdown) telling an agent when to run
`ecc context "<task>"` and how to read the printed `EngineeringContextPackage`, with no
executable code of its own and no direct call into `runContext`. It is scoped to stay a
disjoint concern from any planning/coding/review skill an agent already has — "when/how to
call ECC" only, never "how to engineer" — so it composes with rather than duplicates
existing engineering-methodology skills, per its Phase 9 exit criteria.

The **MCP server** (Phase 10, `src/mcp/`) is a third thin surface, structurally parallel to
the CLI: `tool.ts` defines the `compile_engineering_context` tool's zod input schema and a
handler that calls the same `runContext` pipeline the CLI uses, `server.ts` registers that
tool on an `@modelcontextprotocol/sdk` `McpServer`, and `index.ts` is a shebang entry
(`bin.ecc-mcp`) that connects it over stdio. No pipeline logic lives in `src/mcp/` — a wrong
or divergent result there would mean a wrong `runContext`, not a wrong MCP wrapper. Unlike
the CLI's process-exit-code error model, the tool handler never throws: any failure (bad
path, invalid input, an internal validation error) comes back as a normal MCP `CallToolResult`
with `isError: true`, since an MCP server must keep the connection alive across a bad call.

The **EvaluationEngine** (Phase 11, `src/core/evaluation/`) is a genuine core component, not a
surface — it measures the pipeline rather than exposing it. `baselineRetriever.ts` simulates
the "agent alone" condition (naive keyword grep, no ranking/trust/compression);
`evaluationRunner.ts` re-composes the same `analyzeRepository → classifyTask →
retrieveEvidence → rankEvidence → compileContext` chain `runContext` uses (not by importing
`runContext` itself, to keep core independent of the CLI surface per the rule above) for the
"agent+ECC" condition; `metrics.ts` scores both conditions identically against a
`BenchmarkTask`'s hand-picked ground truth. `src/benchmark/` is the runnable thin surface over
it (`benchmarkTasks.ts`, `report.ts`, `runBenchmark.ts` — `npm run benchmark`), mirroring the
CLI/MCP pattern once more: no scoring logic lives there, only task data and report formatting.

The **VS Code extension** (Phase 12, `vscode-extension/`, a separate npm package sibling to
the root one — a VS Code manifest needs `engines.vscode`/`contributes`/`activationEvents`
fields and a `require()`-able CJS `main` incompatible with the root package's ESM/CLI/MCP
`bin`s) is a fourth thin surface: `src/compileContextCommand.ts` imports `runContext` and
`validateContextPackage` directly from the root `src/cli/runContext.js` /
`src/core/schema/validate.js` (no child-process spawn, no reimplementation), resolves a target
directory from the right-clicked resource (or the first workspace folder), prompts for the
task, and hands the validated package to `src/preview.ts` (a pure, vscode-independent HTML
renderer) for display in a webview panel. `src/extension.ts` is the thinnest layer of all — it
only registers the one contributed command and delegates to `compileContextCommand.ts`. An
`esbuild` bundle (`vscode-extension/esbuild.mjs`) folds the extension plus its core/CLI
imports into one self-contained `dist/extension.js`, marking only `vscode` (provided by the
extension host at runtime) as external. See [[04-decisions]] #18.

The **GitHub integration** (Phase 13, `src/github/`) is a fifth thin surface, and — unlike the
VS Code extension — lives inside the root package, since a GitHub Actions step needs no special
manifest incompatible with the root ESM/CLI/MCP package. `runPrCompile.ts` reads the
`pull_request` event GitHub Actions writes to disk (`prEventContext.ts` parses it into an owner/
repo/PR-number/task-request tuple), calls the same `runContext` pipeline every other surface
calls, and hands the validated package to `src/reporting/markdownReport.ts` (a pure,
GitHub-independent renderer — reusable by any future surface, not GitHub-specific) before
posting or updating a PR comment through `githubCommentClient.ts` (plain `fetch` against the
GitHub REST API, no `@octokit`/`@actions` dependency). A hidden HTML-comment marker lets repeat
runs on the same PR replace their own prior comment instead of accumulating duplicates.
`.github/workflows/pr-context.yml` runs it on `pull_request` (`opened`/`synchronize`/
`reopened`) using the workflow's own ambient `GITHUB_TOKEN`. See [[04-decisions]] #19.

## EngineeringContextPackage (draft schema)

```yaml
version: "0.1"
task: {type, request}
repository: {name, commit}
context:
  primary:   [{source, path, symbols, relevance, trustLevel}]
  supporting: [{source, id, relevance, trustLevel}]
conflicts: [{subject, items}]
history: [{claim, source: {type, id}}]
constraints: [{statement, provenance: {source}}]
unknowns: [string]
verification: [string]
excluded: [{reason, count}]
```

Evidence fields (target): `source, source_type, identifier, path, line_range, commit,
timestamp, authority, relevance, confidence, freshness, applicability`. Evidence types:
Code, Git, PR, Issue, Documentation, Test, CI, Runtime, Incident, Memory, Constraint.

## Evolution stages (long-term, not sequential authorization)

`Engineering Context → Engineering Memory → Engineering Intelligence → Decision Evidence →
Verification Intelligence → Engineering Judgment Infrastructure`

See [[05-roadmap]] for the phase-gated build order.
