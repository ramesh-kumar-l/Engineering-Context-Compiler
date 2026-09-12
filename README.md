# Engineering Context Compiler (ECC)

The context and evidence layer for AI-native software engineering: converts a messy
engineering task into the smallest, highest-value, evidence-backed context package an AI
coding agent needs to solve it.

**Status**: early foundation (Phase 1 of 16). No CLI, skill, or MCP surface yet — see
[`project-memory-bank/implementation-status.md`](project-memory-bank/implementation-status.md)
for what's built and [`project-memory-bank/05-roadmap.md`](project-memory-bank/05-roadmap.md)
for the phase plan.

## Development

```bash
npm install
npm run typecheck
npm run lint
npm test
```

## Project memory

This repo is developed under a phase-gated protocol with a persistent memory bank in
[`project-memory-bank/`](project-memory-bank/). Read `active-context.md` and
`implementation-status.md` first before making changes.
