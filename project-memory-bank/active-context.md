---
name: active-context
---

# Active Context

_Last updated: 2026-09-12_

## Current phase

**Phase 9 — Skill Integration**: Complete.

## What just happened

Added `skills/ecc-context/SKILL.md`: a Claude Code skill (YAML frontmatter `name`/
`description` + markdown body) teaching an agent:

1. **When to use it** — before a non-trivial engineering task in a real repo, instead of
   guessing at relevant files/history.
2. **When not to** — trivial local edits, no target repo, or (explicitly) as a substitute
   for planning/coding/review/verification skills. This boundary is what keeps the skill
   from duplicating existing engineering-methodology skills, per Phase 9's exit criteria.
3. **How to invoke it** — `node dist/cli/index.js context "<task>" [--path] [--out]
   [--budget]` (or `ecc context ...` once installed with its `bin` on `PATH`), after a one-
   time `npm run build`.
4. **How to read the output** — `context.primary`/`supporting`, `trustLevel` per item
   (`fact`/`derived`/`inference`/`unknown`), `conflicts` (never silently pick a side),
   `unknowns`/`excluded` (known gaps, not "nothing else exists"), `verification` (a hint,
   not a replacement for the agent's own checks).
5. **Failure modes** — non-git repos, tight `--budget` excluding evidence, low-confidence
   task classification.

The skill has **no executable code** — it's pure instructions wrapping the Phase 8 CLI, one
layer thinner than the CLI's own wrap of core (see [[02-architecture]] and [[04-decisions]]
#15 for why: it's a documentation artifact, not a new callable surface). It lives in a repo-
root `skills/` directory (not `.claude/skills/`) since its audience is agents working in
*other* repositories that install this package, not this repo's own session.

Added `test/skill/skillDoc.test.ts` — a doc-consistency test (not a behavioral one, since
there's no code to exercise): asserts the skill file has valid frontmatter, documents the
real CLI flags (`--path`/`--out`/`--budget`) and package fields (`context.primary`,
`trustLevel`, `conflicts`), and stays under 300 lines. This guards against the doc silently
drifting from the CLI as Phase 8's surface evolves.

Updated `README.md` with an "## Agent skill" section (what it is, how to install it into an
agent's skills directory) and bumped the status line to Phase 9.

This directly satisfies Phase 9's exit criteria: the skill teaches an agent when/how to
invoke ECC (via the existing CLI), and its explicit "when NOT to use" section is the
mechanism that keeps it from duplicating existing engineering-methodology skills rather than
composing with them.

Verified: `npm run typecheck`, `npm run lint`, `npm test` (107/107 passing across 25 test
files, up from 103/24), `npm run build`, `npm audit` (0 vulnerabilities) all green. New
files: `skills/ecc-context/SKILL.md` (~90 lines) and `test/skill/skillDoc.test.ts` (34
lines). No new runtime dependency, no changes to any `src/` module.

## In progress

Nothing — Phase 9 closed out cleanly. Awaiting user authorization to plan Phase 10.

## Next task

Per [[05-roadmap]], the next gated phase is **Phase 10 — MCP**: expose
`compile_engineering_context` as an MCP tool over the same `runContext` orchestrator the CLI
and skill point to, so a real MCP client can call it and get a valid package back. Requires
explicit authorization before planning/implementation begins (Rule 3).

## Open questions carried forward

- No target repository/task type has been chosen by the user to validate compilation against
  beyond fixtures. The CLI can now be pointed at any real repo to check this - worth doing
  before Phase 10's MCP surface builds on top of it, since token-budget defaults and trust
  classifications are easier to tune against real evidence volumes than a small fixture.
- `SOURCE_AUTHORITY_WEIGHT` (Phase 5), `DEFAULT_TOKEN_BUDGET`/`MAX_SYMBOLS_PER_ITEM` (Phase 6)
  remain hand-picked static values, unchanged this phase - still worth revisiting once
  Phase 11's evaluation exists.
- Conflict detection (Phase 7) is structural only - same subject (path/identifier) with a
  differing `trustLevel`. Unchanged this phase; still a known gap, not a regression.
- The trust rule table (`classifyTrust`, Phase 7) is static and per-source-type - not learned,
  not user-configurable yet. Revisit alongside Phase 11's evaluation and Phase 14 (Engineering
  Memory), per the same note as last phase.
- The CLI has exactly one command (`context`) and one output format (pretty JSON) - no
  `--help`/`--version`, no subcommands. Unchanged this phase; revisit only if Phase 10's MCP
  usage reveals a real need.
- `vitest.config.ts`'s `testTimeout: 15000` (Phase 8) is a blunt fix for occasional slow
  process-spawning tests under parallel load on this machine; if flakiness persists on a
  different CI runner, the more targeted fix is a per-test timeout override on just the
  git-spawning tests rather than raising the global default further.
- The Phase 9 skill has no automated install step (a user/agent manually copies or symlinks
  `skills/ecc-context/` into their skills directory) - fine at current scale (one skill, one
  package); revisit only if distribution friction becomes a measured problem.
- Once Phase 10's MCP tool exists, `skills/ecc-context/SKILL.md` should be revisited to
  mention it as an alternative invocation path (MCP tool call vs. shelling out to the CLI),
  so the skill doesn't become stale by omission.
