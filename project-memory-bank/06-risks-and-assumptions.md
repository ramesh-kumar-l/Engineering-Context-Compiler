# 06 — Risks and Assumptions

## Assumptions (unverified — revisit once real usage exists)

- Target users are AI-heavy engineers already using Claude Code / Codex / Cursor / Copilot
  on real repositories (Section 46).
- A dedicated context/evidence layer measurably improves agent performance beyond the
  agent's own repo-native tools (Section 77, "first-principles test") — **not yet tested**,
  no implementation exists to evaluate.
- No target repository, language, or framework has been specified by the user yet.

## Risks specific to starting from zero

- **Scope creep**: master prompt lists ~19 components and 16 phases; risk of building
  breadth before any single phase proves value. Mitigation: strict phase gating (Rule 5),
  build order in [[05-roadmap]].
- **Premature abstraction**: designing `EngineeringContextPackage` / adapters before a real
  task/repo exists to validate against risks over-engineering. Mitigation: Section 60 (no
  gold-plating), keep [[02-architecture]] explicitly marked "target, not implemented."
- **No falsifiable baseline yet**: can't measure "with ECC vs. without ECC" until something
  is built and there's a real agent + repo to test on (Section 43). Until then, evaluation
  criteria in [[07-evaluation]] are placeholders only.
- **Competitive absorption**: agent vendors continuously improve native repo context
  (Section 78). Differentiation must move toward evidence/history/constraints/verification/
  memory, not generic retrieval — relevant once Phase 4+ begins.

## Open questions for the user (raise before/at Phase 1 planning)

- What language/runtime should ECC itself be built in?
- Is there a specific target repository or task type to design the first vertical slice
  against, or should Phase 1 remain deliberately abstract?
