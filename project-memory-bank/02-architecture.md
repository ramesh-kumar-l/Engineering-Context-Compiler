# 02 — Architecture (Target — NOT YET IMPLEMENTED)

Status: **design target**, partially implemented — see [[implementation-status]] for what
actually exists (Phase 1: core types/schema; Phase 2: repository analysis; Phase 3: task
classification; Phase 4: evidence retrieval; Phase 5: evidence ranking; Phase 6: context
compilation; Phase 7: trust + provenance; Phase 8: CLI; Phase 9: skill integration; Phase 10:
MCP).
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
ContextPackageBuilder ✅, EvaluationEngine, MemoryEngine, AgentAdapter`

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
