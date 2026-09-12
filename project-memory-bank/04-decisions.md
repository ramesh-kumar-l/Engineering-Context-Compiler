# 04 — Decisions

| # | Decision | Context | Alternatives | Risk | Reversibility |
|---|----------|---------|---------------|------|----------------|
| 1 | Confirmed repo is greenfield; no existing product to assess or reuse. | Master prompt assumes valuable prior work to inventory; repo inspection found only LICENSE + 1-line README. | Treat as if prior work existed (rejected — fabricates context). | Low | N/A (factual finding) |
| 2 | Adopt the user-supplied Master System Prompt as the governing protocol for all future phases (memory-first, phase-gated, stop-after-phase). | User pasted the spec and said "execute"; it's explicit and detailed. | Freelance a different process — rejected, user intent is explicit. | Low | High — user can amend the protocol anytime |
| 3 | Bootstrapped the full 8-file + `active/` memory-bank structure now (Section 8) rather than partially, since none existed to reuse. | Section 8: "if equivalent files already exist, reuse them" — none did. | Create files lazily per-phase — rejected, Phase 0 explicitly calls for memory bank initialization. | Low | High — files can be edited/split later |
| 4 | Deferred all technology/component choices (language, storage, retrieval approach, etc.) to Phase 1. | Rule 3: no implementation before authorization; Phase 0 is assessment-only. | Pre-select a stack now — rejected, no requirements gathered yet to justify it. | N/A | N/A |

Record future significant decisions here using: Decision / Context / Evidence / Constraints
/ Alternatives / Risks / Recommendation / Confidence / Verification / Reversibility (full
form for high-stakes calls; the compact table above is fine for routine ones).
