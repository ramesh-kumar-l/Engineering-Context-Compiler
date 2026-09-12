# 00 — Vision

## Mission

> Engineering Context Compiler (ECC) converts a messy software-engineering task into the
> smallest, highest-value, evidence-backed engineering context package an AI coding agent
> needs to solve the task effectively.

Core optimization: **minimum sufficient context → minimum decision uncertainty → maximum
useful engineering outcome.** Never maximize context volume.

## Pipeline (conceptual, not yet implemented)

```
Engineer Request → Task Understanding → Evidence Discovery → Retrieval → Ranking
→ Context Selection → Compression → Trust + Provenance → EngineeringContextPackage
→ AI Agent → Implementation/Investigation → Verification
```

## What ECC is NOT

Not another coding agent, LLM, IDE, generic RAG system, skills repo, code-search engine,
dev portal, or knowledge graph. Not a replacement for Claude Code / Codex / Cursor / Copilot.

## What ECC IS

The **context and evidence layer** for AI-native software engineering.

## Skills vs. ECC boundary

- **Skills** answer "HOW should the agent perform this task?" (TDD, debugging, code review, framework-specific practice).
- **ECC** answers "WHAT does the agent need to know about this actual engineering environment?" (relevant code, history, constraints, prior attempts, verification requirements).

`Agent → Skill ("how") → ECC ("what") → Engineering reality`. ECC complements skill
ecosystems; it must not become a generic skills library itself.

## North-star metric (once there are users)

Useful Context Compilations per Active Engineer. Supporting signal: engineers voluntarily
choosing ECC for real work / not wanting to run a coding agent on a repo without it.

Full source: user-supplied "Engineering Context Compiler — Master Claude System Prompt"
(governing protocol for this project; see [[01-requirements]]).
