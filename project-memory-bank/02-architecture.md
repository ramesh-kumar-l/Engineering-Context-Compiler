# 02 — Architecture (Target — NOT YET IMPLEMENTED)

Status: **design target**, partially implemented — see [[implementation-status]] for what
actually exists (Phase 1: core types/schema; Phase 2: repository analysis). Recorded here
so future phases don't re-derive the target shape and implementation stays aligned with
the governing spec.

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

`TaskClassifier, TaskNormalizer, RepositoryAnalyzer ✅, FileClassifier ✅, SymbolResolver ✅,
DependencyAnalyzer ✅, EvidenceRetriever, GitHistoryAnalyzer, ContextRanker, ContextSelector,
ContextCompressor, TokenBudgetManager, ProvenanceEngine, TrustEngine, VerificationPlanner,
ContextPackageBuilder, EvaluationEngine, MemoryEngine, AgentAdapter`

✅ = implemented (Phase 2), in `src/core/repository/`. All others: not started.

## EngineeringContextPackage (draft schema)

```yaml
version: "0.1"
task: {type, request}
repository: {name, commit}
context:
  primary:   [{source, path, symbols, relevance}]
  supporting: [{source, id, relevance}]
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
