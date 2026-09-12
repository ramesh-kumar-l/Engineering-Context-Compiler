---
name: active-context
---

# Active Context

_Last updated: 2026-09-12_

## Current phase

**Phase 10 — MCP**: Complete.

## What just happened

Added `src/mcp/`, structurally parallel to Phase 8's `src/cli/`:

1. `tool.ts` — the `compile_engineering_context` tool: a zod input shape (`task` required,
   `path`/`tokenBudget` optional) and a handler that calls the same `runContext` orchestrator
   the CLI uses, then returns an MCP `CallToolResult`. Never throws — any failure (bad path,
   invalid input, an internal `validateContextPackage` failure) comes back as
   `{isError: true, content: [...]}` instead of crashing the server connection.
2. `server.ts` — `createEccMcpServer()` builds an `@modelcontextprotocol/sdk` `McpServer` and
   registers the tool on it. Does not connect a transport, mirroring how `runCli` stays
   separate from `src/cli/index.ts`'s process wiring.
3. `index.ts` — a shebang entry point (`bin.ecc-mcp` → `dist/mcp/index.js`) connecting the
   server over `StdioServerTransport`.

No `src/core` module changed and no new pipeline logic was written — `src/mcp/` only wraps
`runContext`, exactly like the CLI does (see [[02-architecture]] and [[04-decisions]] #16).

Added three layers of test coverage:
- `test/mcp/tool.test.ts` — unit tests of `compileEngineeringContextTool` against the fixture
  repo (valid package, budget-driven exclusion, error result for an unreadable path).
- `test/mcp/server.test.ts` — a **real MCP `Client` talking to `createEccMcpServer()` over
  `InMemoryTransport.createLinkedPair()`**: lists tools, calls `compile_engineering_context`,
  and asserts a schema-valid package comes back — this is what Phase 10's exit criteria
  literally asks for ("a real MCP client can call it and get a valid package back"), not just
  a unit test of the handler function.
- A one-off manual smoke test (not committed) spawning the *built* `dist/mcp/index.js` as a
  real subprocess via `StdioClientTransport`, confirming the shebang and process wiring work
  end-to-end — mirrors the Phase 8 CLI smoke test.

Updated `package.json` (new dependency `@modelcontextprotocol/sdk`, new `bin.ecc-mcp` entry),
`README.md` (new "## MCP usage" section, status bump to Phase 10), and all memory-bank files
(`implementation-status.md`, `04-decisions.md` #16, `05-roadmap.md`, `02-architecture.md`).

Verified: `npm run typecheck`, `npm run lint`, `npm test` (113/113 passing across 27 test
files, up from 107/25), `npm run build`, `npm audit` (0 vulnerabilities) all green. New files:
`src/mcp/tool.ts`, `src/mcp/server.ts`, `src/mcp/index.ts`, `test/mcp/tool.test.ts`,
`test/mcp/server.test.ts` (all ≤75 lines).

## In progress

Nothing — Phase 10 closed out cleanly. Awaiting user authorization to plan Phase 11.

## Next task

Per [[05-roadmap]], the next gated phase is **Phase 11 — Evaluation + Benchmarking**: run at
least one "agent alone vs. agent+ECC" comparison, measuring the metrics in [[07-evaluation]]
rather than just defining them. Requires explicit authorization before planning/
implementation begins (Rule 3).

## Open questions carried forward

- No target repository/task type has been chosen by the user to validate compilation against
  beyond fixtures. Both the CLI and the MCP tool can now be pointed at any real repo to check
  this — worth doing before Phase 11's evaluation, since a benchmark is only as meaningful as
  the repos/tasks it runs against.
- `SOURCE_AUTHORITY_WEIGHT` (Phase 5), `DEFAULT_TOKEN_BUDGET`/`MAX_SYMBOLS_PER_ITEM` (Phase 6)
  remain hand-picked static values, unchanged this phase - still worth revisiting once
  Phase 11's evaluation exists.
- Conflict detection (Phase 7) is structural only - same subject (path/identifier) with a
  differing `trustLevel`. Unchanged this phase; still a known gap, not a regression.
- The trust rule table (`classifyTrust`, Phase 7) is static and per-source-type - not learned,
  not user-configurable yet. Revisit alongside Phase 11's evaluation and Phase 14 (Engineering
  Memory), per the same note as last phase.
- The CLI has exactly one command (`context`) and one output format (pretty JSON) - no
  `--help`/`--version`, no subcommands. Unchanged this phase; revisit only if real usage
  reveals a need.
- `vitest.config.ts`'s `testTimeout: 15000` (Phase 8) is a blunt fix for occasional slow
  process-spawning tests under parallel load on this machine; if flakiness persists on a
  different CI runner, the more targeted fix is a per-test timeout override on just the
  git-spawning tests rather than raising the global default further.
- The Phase 9 skill has no automated install step (manual copy/symlink); it also does not yet
  mention Phase 10's MCP tool as an alternative invocation path to shelling out to the CLI —
  `skills/ecc-context/SKILL.md` should be revisited to add that so it doesn't go stale by
  omission. Not done this phase since it wasn't part of Phase 10's own exit criteria, but it's
  now a live gap, not a hypothetical one.
- The MCP server exposes exactly one tool over stdio only - no resources/prompts, no HTTP/SSE
  transport, no auth, and no workspace-root sandboxing beyond what the OS/filesystem already
  enforces on the `path` argument. Fine for a locally-installed tool; revisit if a hosted/
  remote MCP deployment or multi-tenant use case is ever required.
