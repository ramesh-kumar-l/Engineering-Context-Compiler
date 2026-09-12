# 02 — Architecture (Target — NOT YET IMPLEMENTED)

Status: **design target only**. Nothing in this file exists in code yet (repo is
greenfield as of Phase 0 — see [[03-current-state]]). Recorded here so future phases don't
re-derive it and so implementation stays aligned with the governing spec.

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

`TaskClassifier, TaskNormalizer, RepositoryAnalyzer, FileClassifier, SymbolResolver,
DependencyAnalyzer, EvidenceRetriever, GitHistoryAnalyzer, ContextRanker, ContextSelector,
ContextCompressor, TokenBudgetManager, ProvenanceEngine, TrustEngine, VerificationPlanner,
ContextPackageBuilder, EvaluationEngine, MemoryEngine, AgentAdapter`

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
