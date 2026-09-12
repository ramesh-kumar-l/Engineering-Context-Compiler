# Engineering Context Compiler (ECC)

The context and evidence layer for AI-native software engineering: converts a messy
engineering task into the smallest, highest-value, evidence-backed context package an AI
coding agent needs to solve it.

**Status**: Phase 12 of 16 (VS Code Extension). See
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

## MCP usage

Build once, then run the MCP server over stdio and register it with any MCP client:

```bash
npm run build
node dist/mcp/index.js
```

Exposes one tool, `compile_engineering_context`, over the same pipeline the CLI uses:

- `task` (required) — free-text task description
- `path` (optional) — repository to analyze (default: server's current directory)
- `tokenBudget` (optional) — token budget for evidence selection (default: 4000)

Returns the same schema-valid `EngineeringContextPackage` as the CLI, as the tool result's
text content. A failure (bad path, invalid input) comes back as an MCP tool error
(`isError: true`) rather than crashing the server.

## Evaluation

Build once, then run the "agent alone vs. agent+ECC" benchmark against a repository:

```bash
npm run build
npm run benchmark [path]
```

Defaults to the current directory. Runs each task in
[`src/benchmark/benchmarkTasks.ts`](src/benchmark/benchmarkTasks.ts) through a naive keyword-
grep baseline ("agent alone") and the real ECC pipeline ("agent+ECC"), then prints a markdown
report comparing evidence recall, irrelevant-evidence rate, provenance completeness, and
estimated tokens. See
[`project-memory-bank/07-evaluation.md`](project-memory-bank/07-evaluation.md) for the metrics
definitions and the last measured run.

## VS Code extension

[`vscode-extension/`](vscode-extension/) is a thin client over the same `runContext` pipeline
the CLI/MCP use: right-click a folder/file (Explorer or editor context menu), or use the
Command Palette, and choose **Compile Engineering Context** to describe a task and preview the
resulting `EngineeringContextPackage` in a webview panel. See
[`vscode-extension/README.md`](vscode-extension/README.md) for setup and development
(`cd vscode-extension && npm install && npm run build`, then F5 in VS Code to try it).

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
