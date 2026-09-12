---
name: implementation-status
---

# Implementation Status

_Last updated: 2026-09-12 (Phase 1)_

Update this file at the end of every major feature — it is the compressed "what actually
exists" record so future tasks don't have to re-derive it by reading source.

## Stack

- **Language/runtime**: TypeScript on Node.js (>=20), ESM (`"type": "module"`).
- **Rationale** (see [[04-decisions]] #5): MCP's reference SDK is TypeScript; the planned
  VS Code extension (Phase 12) must be TypeScript regardless; `npx`-based zero-install
  distribution matches the CLI-first strategy in the master prompt. Consolidating on one
  language across CLI + MCP + VS Code avoids polyglot maintenance overhead.
- **Runtime schema validation**: `zod` (only non-dev dependency so far).
- **Test runner**: `vitest`. **Typecheck**: `tsc --noEmit`. **Lint**: `eslint` (flat
  config, typescript-eslint recommended rules).
- **CI**: `.github/workflows/ci.yml` runs typecheck + lint + test on push/PR to `main`.

## Modularity convention

Every file is kept well under 300 lines, one concern per file, so future tasks (agent or
human) can read only the specific module they need. Current largest file is 90 lines
(the test file). Directory shape:

```
src/
  core/
    types/            # pure TS interfaces: task, evidence, trust, contextPackage
    schema/            # zod schema + validateContextPackage()
    contextPackage.ts  # createEmptyContextPackage() factory
    index.ts           # barrel
  index.ts             # package public entry
test/
  core/contextPackage.test.ts
```

## Implemented (Phase 1 — ECC Foundation)

| Module | Path | What it does |
|---|---|---|
| Task type | `src/core/types/task.ts` | `TaskType` enum + `EngineeringTask` (Section 25 task types) |
| Trust model | `src/core/types/trust.ts` | `TrustLevel`: fact / derived / inference / unknown |
| Evidence model | `src/core/types/evidence.ts` | `EvidenceItem`, `EvidenceProvenance`, source types (Section 19) |
| Context package type | `src/core/types/contextPackage.ts` | `EngineeringContextPackage` — the central contract (Section 18) |
| Schema | `src/core/schema/contextPackage.schema.ts` | zod schema mirroring the type, for runtime validation |
| Validator | `src/core/schema/validate.ts` | `validateContextPackage()` — never throws, returns a discriminated result |
| Factory | `src/core/contextPackage.ts` | `createEmptyContextPackage(task, repo)` — schema-valid empty shell |

Test coverage: schema accepts a fully populated valid package and the empty factory
output; rejects out-of-range relevance, unknown task type enum values, and non-object
input without throwing. 5/5 tests passing, 0 lint errors, 0 typecheck errors, 0 npm audit
vulnerabilities.

## Explicitly NOT built yet (do not assume these exist)

- No repository analysis, retrieval, ranking, or compression logic (Phases 2, 4, 5, 6).
- No CLI entry point / `bin` (Phase 8) — deliberately deferred; Phase 1 is types + schema
  only, no invocable surface yet.
- No skill or MCP server (Phases 9-10).
- No build/bundle step (`tsc` is `noEmit`-only for now) — will be added when the CLI
  phase needs an executable artifact.
- No persistence/memory engine beyond the markdown files in this directory.

## Next module to build

Phase 2 (Repository Intelligence) — see [[05-roadmap]] for exit criteria — is the next
gated phase. It will need a `RepositoryAnalyzer`/`FileClassifier` module, not yet started.
