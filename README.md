# Engineering Context Compiler (ECC)

The context and evidence layer for AI-native software engineering: converts a messy
engineering task into the smallest, highest-value, evidence-backed context package an AI
coding agent needs to solve it.

**Status**: Phase 9 of 16 (Skill Integration). No MCP surface yet — see
[`project-memory-bank/implementation-status.md`](project-memory-bank/implementation-status.md)
for what's built and [`project-memory-bank/05-roadmap.md`](project-memory-bank/05-roadmap.md)
for the phase plan.

## Development

```bash
npm install
npm run typecheck
npm run lint
npm test
npm run build
```

## CLI usage

Build once, then run `ecc context` against any repository:

```bash
npm run build
node dist/cli/index.js context "explain the utils module" --path ./my-repo
```

Prints a schema-valid `EngineeringContextPackage` (see
[`project-memory-bank/02-architecture.md`](project-memory-bank/02-architecture.md)) as JSON to
stdout. Flags:

- `--path <dir>` — repository to analyze (default: current directory)
- `--out <file>` — write the package to a file instead of stdout
- `--budget <n>` — token budget for evidence selection (default: 4000)

## Agent skill

[`skills/ecc-context/SKILL.md`](skills/ecc-context/SKILL.md) teaches an AI coding agent
when and how to invoke the CLI above and how to read the resulting package (primary vs.
supporting evidence, trust levels, conflicts, gaps). It is scoped narrowly to "when/how to
call ECC" so it composes with, rather than duplicates, planning/coding/review skills. To use
it in an agent session, copy or symlink the `skills/ecc-context/` directory into that
session's skills directory (e.g. `.claude/skills/ecc-context/` for Claude Code).

## Project memory

This repo is developed under a phase-gated protocol with a persistent memory bank in
[`project-memory-bank/`](project-memory-bank/). Read `active-context.md` and
`implementation-status.md` first before making changes.
