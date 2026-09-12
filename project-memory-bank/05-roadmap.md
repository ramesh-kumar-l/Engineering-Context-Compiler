# 05 — Roadmap

Recommended phase sequence from the master prompt (Section 13). **This is a sequence, not
blanket authorization** — each phase requires its own explicit go-ahead (Rule 3/5).

| Phase | Name | Status | Exit criteria |
|-------|------|--------|----------------|
| 0 | Repository + Product Assessment | ✅ Complete | Repo/memory bank inventoried; assessment report delivered; no product code touched. |
| 1 | ECC Foundation | ✅ Complete | Project scaffolding (build/lint/test/CI) in place; core types (`Task`, `Evidence`, `Trust`, `EngineeringContextPackage`) defined and zod-validated; tests/typecheck/lint/audit all green. |
| 2 | Repository Intelligence | ✅ Complete | Can analyze a real repo: classify files, resolve symbols for at least one language, build a basic dependency graph — with tests against a real (or fixture) repo. |
| 3 | Task Understanding | ✅ Complete | Given a free-text request, classify it into a `TaskType` (Section 25) with reasonable accuracy on a small labeled test set. |
| 4 | Evidence Retrieval | ✅ Complete | Given a classified task + analyzed repo, retrieve a candidate evidence set (code/git/tests) relevant to the task. |
| 5 | Evidence Ranking | ✅ Complete | Candidate evidence is scored/ranked using >1 signal (Section 22); ranking is unit-tested against known-good orderings. |
| 6 | Context Compilation | ✅ Complete | Ranked evidence is selected + compressed into a valid `EngineeringContextPackage` within a token budget, with `excluded` reasons populated. |
| 7 | Trust + Provenance | ✅ Complete | Every included item carries provenance; FACT/DERIVED/INFERENCE/UNKNOWN is never blurred; conflicting evidence is surfaced, not silently resolved. |
| 8 | CLI | ✅ Complete | `ecc context "<task>"` runs end-to-end against a real repo and prints/saves a valid context package; documented usage. |
| 9 | Skill Integration | ✅ Complete | A Claude skill exists that teaches an agent when/how to invoke ECC, without duplicating existing engineering-methodology skills. |
| 10 | MCP | ✅ Complete | `compile_engineering_context` exposed as an MCP tool; a real MCP client can call it and get a valid package back. |
| 11 | Evaluation + Benchmarking | ✅ Complete | At least one "agent alone vs. agent+ECC" comparison run, with the metrics in [[07-evaluation]] measured, not just defined. |
| 12 | VS Code Extension | ✅ Complete | Right-click "Compile Engineering Context" produces a preview the user can send to an agent; extension is a thin client over CLI/core. |
| 13 | GitHub / CI Integrations | ✅ Complete | A PR gets ECC-compiled context (affected components, relevant tests, risk) posted or made available automatically. |
| 14 | Engineering Memory | ✅ Complete | Architectural decisions/incidents/outcomes persist across sessions and are retrievable as evidence in later compilations. |
| 15 | Verification Intelligence | ✅ Complete | ECC recommends a verification plan (tests/checks) scaled to task risk (Section 41-42). |
| 16 | Engineering Intelligence | Not started | Outcomes feed back into ranking/memory quality over time (Section 72's feedback loop closes at least once). |

## Next recommended phase

**Phase 16 — Engineering Intelligence.** Close Section 72's feedback loop at least once:
outcomes (e.g. a Phase 14 `ecc memory --type outcome` entry recording whether a past
compilation's verification plan actually caught a problem) feed back into ranking/memory
quality over time.
