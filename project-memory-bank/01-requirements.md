# 01 — Requirements (Operating Rules)

Source of truth: the user-supplied ECC Master System Prompt. This file compresses its
non-negotiable rules for fast lookup; the full prompt is authoritative if this drifts.

## Non-negotiable process rules

1. **Memory first** — for every new phase/task/bug/feature, read `project-memory-bank/`
   before scanning source code.
2. **Minimal code reading** — read source only when memory is insufficient; read the
   smallest relevant surface; stop once the uncertainty is resolved.
3. **No implementation without authorization** — inspect → plan → STOP → wait for explicit
   go-ahead, per phase/task. (Phase 0 memory-bank bootstrap is self-authorized by the master
   prompt's Section 81 "First Command"; nothing else is.)
4. **Build on existing code**, don't rewrite, unless there's strong evidence the current
   architecture can't support a requirement.
5. **Stop after every phase**: Implement → Test → Verify → Update memory bank → Report →
   STOP. Never auto-start the next phase.

## Reading hierarchy for a new task

`active/phase.md` → `active/task.md` → `03-current-state.md` → relevant architecture/domain
file → source code only if still necessary.

## Memory bank hygiene

Concise, structured, factual, current, non-redundant, decision-oriented. Tables/bullets over
essays. No copied source code. Repository/tests/config/user instruction outrank memory when
they conflict — update memory after resolving the conflict, never let stale memory drive
implementation.

## Core product contract (target, not yet built)

`EngineeringContextPackage` — versioned structure with `task`, `repository`, `context`
(primary/supporting evidence with relevance scores + provenance), `history`, `constraints`,
`unknowns`, `verification`, `excluded` (with reasons). See [[02-architecture]] for shape.

## Trust model

Never blur `OBSERVED → DERIVED → INFERRED → RECOMMENDED`. Minimum distinction to preserve:
`FACT / DERIVED / INFERENCE / UNKNOWN`. Never present inference as fact; never fabricate
missing information; never fabricate git/repo history when unavailable — mark it
unavailable and degrade gracefully instead.

## Guardrails against scope creep / gold-plating

- No speculative abstractions, unnecessary config/APIs/integrations, unused extension
  points, or infra for hypothetical scale.
- No Kubernetes/microservices/distributed DBs/queues unless justified by actual
  requirements; prefer filesystem/SQLite/embedded indexes/local cache first.
- Before adding a dependency: is it necessary, maintained, security-safe, and does it
  reduce (not add) complexity?
- Before changing a file: what contract does it own, what depends on it, can it be
  extended rather than replaced?
- Unrelated tech debt found mid-task: document + defer, fix only if it blocks the phase or
  is a serious/small-fix security-reliability issue.
- New ideas outside current phase: record as a "Future Opportunity" note, don't implement.

## User work preservation / git discipline

Never overwrite unrelated changes, delete unknown files, reset branches, discard
uncommitted work, or run destructive git ops without explicit authorization. Check working
tree and recent history before substantial changes.

## Distribution priority (once core exists)

CLI → Skill → MCP → VS Code → GitHub/CI → other integrations → team platform → enterprise.
One core engine, many thin surfaces — no duplicated intelligence per surface.
