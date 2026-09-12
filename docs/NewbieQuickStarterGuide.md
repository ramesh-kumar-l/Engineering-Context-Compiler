# Newbie Quick Starter Guide

This guide assumes you've never seen this repository before. It's longer and more detailed
than [README.md](../README.md) on purpose — the README is the landing page, this is the manual.

## Before you start

**What does this project do?** ECC (Engineering Context Compiler) takes a free-text
engineering task ("investigate the intermittent timeout in the payment service") and a real
repository, and produces a single JSON document — an `EngineeringContextPackage` — containing
the specific code, tests, git history, and recorded decisions relevant to that task, ranked by
importance, labeled with how trustworthy each piece is, and fit inside a token budget. You
feed that document to an AI coding agent (or read it yourself) instead of letting the agent
guess what's relevant by grepping around.

**Why would I use it?** Because "let the agent search the repo" scales badly: it either reads
too little (misses the actually-relevant file) or too much (burns context budget on
irrelevant files). ECC does the relevance/ranking/trust/budget work once, deterministically,
so the agent starts with a curated brief instead of a blank search.

**What do I need installed?**
- Node.js **20 or newer** (`node --version`)
- `git` (used both to clone this repo and, at runtime, to read git history from repos ECC
  analyzes — if the target repo isn't a git repo, ECC still works, it just skips git evidence)
- `npm` (ships with Node)

**Which operating systems are supported?** Nothing in the codebase is platform-specific — it's
plain Node.js/TypeScript using `node:fs`/`node:path` and shelling out to `git` via
`execFileSync`. Developed and verified on Windows in this repository's own CI/dev environment;
Linux/macOS should work identically since there's no OS-specific code path, but if you hit a
platform quirk, please open an issue.

**Do I need Docker?** No.

**Do I need an API key or AI provider account?** No. ECC never calls an LLM itself — every
ranking/trust/risk decision is a deterministic rule-based function. You only need an AI
provider if you're the one feeding ECC's output *to* an agent afterward — that's your choice
of agent, unrelated to running ECC.

**Is my code sent to the cloud?** No. Everything runs locally against your filesystem and git
history. The only network call anywhere in the codebase is the optional GitHub PR-comment
integration, which uses the GitHub Actions workflow's own token to talk to the GitHub REST
API — nothing else in the CLI/MCP/VS Code paths makes a network call.

**What data is stored locally?** If you use `ecc memory` to record a decision/incident/
outcome, it's appended to `<repo>/.ecc/memory.json` inside the repository you pointed at —
plain JSON, human-readable, nothing hidden. Nothing is written unless you explicitly run that
command.

## Installation

From a clean machine:

```bash
git clone https://github.com/ramesh-kumar-l/Engineering-Context-Compiler.git
cd Engineering-Context-Compiler
npm ci
npm run typecheck   # optional sanity check - should print nothing and exit 0
npm run build       # compiles src/ to dist/, needed before any CLI/MCP command below
```

`npm ci` (not `npm install`) reproduces the exact versions in `package-lock.json` — the
correct choice for a fresh checkout, `npm install` for when you're actively adding a
dependency yourself.

## First successful run

Try it against ECC's own repository first, so there's no ambiguity about "which repo do I
point it at":

```bash
node dist/cli/index.js context "explain the memory retriever module" --path . --budget 800
```

You should see a JSON object print to your terminal within a second or two. If you see that,
the pipeline works end to end. If you don't, see [Troubleshooting](#troubleshooting) below.

## Understanding the output

Every `context` call prints an `EngineeringContextPackage`. Field by field:

| Field | Meaning |
|---|---|
| `version` | Schema version of the package format (currently `"0.1"`). |
| `task.type` | One of nine types ECC classified your request as: `explain`, `debug`, `modify`, `review`, `refactor`, `investigate`, `plan`, `test`, `optimize`. You don't set this — ECC infers it from your wording. |
| `task.request` | Your original free-text request, unchanged. |
| `repository.name` / `.commit` | The analyzed repo's folder name and current commit hash. `commit` is the literal string `"unknown"` if the target isn't a git repository — treat evidence as less durable/traceable in that case. |
| `context.primary` | The evidence most central to the task — usually source code and tests. Read this first. |
| `context.supporting` | Secondary evidence — git history, recorded memory, etc. |
| each evidence item's `source` | Where it came from: `code`, `test`, `git`, or `memory`. |
| `path` / `identifier` | `path` is a real file path (for code/test/git items); `identifier` is a non-path label (e.g. a memory entry's summary, or a commit message for a git item). |
| `symbols` | Top-level function/class/interface/type/enum names ECC resolved in that file, if any. |
| `relevance` | 0–1 score for how well this item matches your request — from that item's own retriever, then nudged by ranking (source authority, specificity) and by recorded outcome feedback if any exists. |
| `trustLevel` | One of `fact` (directly observed — a real file/commit), `derived` (computed from facts), `inference` (a plausible but unconfirmed guess — e.g. a memory entry), or `unknown` (no verifiable source). **Never treat an `inference` item as if it were a `fact`.** |
| `provenance` | Where this specific claim traces back to — always present, never fabricated. |
| `conflicts` | Items about the same file/symbol that got *different* trust levels. Surfaced, never silently resolved — investigate rather than pick a side. |
| `history` | Reserved for a future evidence type; always empty today (see [Limitations](../README.md#limitations)). |
| `constraints` | Non-negotiable statements evidence implies (currently populated only when a retriever surfaces one). |
| `unknowns` | Things ECC couldn't determine. |
| `verification` | A risk-scaled plan: a leading `Risk: <level> (<reasons>)` line, then concrete next steps (run existing tests, add missing coverage, manually verify at medium+ risk, request peer review at high risk). |
| `excluded` | What got cut for token budget, as `{reason, count}` — never a silent truncation. Raise `--budget` if this shows something you actually needed. |

## Using it with a real repository

Point `--path` at any repository on your machine:

```bash
node dist/cli/index.js context "investigate why login sessions expire early" --path /path/to/your/repo
```

Realistic workflow:

1. Run `context` with your actual task description against your actual repo.
2. Read `context.primary` first — that's what ECC judged most central.
3. Check `verification` for the risk level and suggested steps before you start changing code.
4. If `excluded` shows something you expected to see, re-run with a larger `--budget`.
5. Paste the JSON (or the file from `--out result.json`) into your AI coding agent's context,
   or hand it to a human reviewer as a compact brief.
6. After the work lands, optionally record what happened (`ecc memory ... --type outcome
   --signal positive|negative`) so future compilations against this repo learn from it — see
   below.

### Recording and using memory (a full example)

This is a real, reproducible transcript — every command below was actually run against a tiny
throwaway git repository to verify it works exactly as shown.

```bash
# inside some git repo with src/payment.ts committed
node dist/cli/index.js memory --type decision \
  --summary "Chose synchronous card charge over async queue for simplicity" \
  --paths src/payment.ts
# → Recorded decision "Chose synchronous card charge over async queue for simplicity" (88a0c1bc-...) to .../.ecc/memory.json

node dist/cli/index.js context "why does the payment charge function work the way it does"
```

That `context` call's `supporting` evidence now includes the recorded decision as a
`source: "memory"`, `trustLevel: "inference"` item at `relevance: 0.4` — automatically, with
no extra flag needed.

Now suppose that design caused a production incident. Record the outcome with a signal:

```bash
node dist/cli/index.js memory --type outcome \
  --summary "Sync charge caused a timeout under load" \
  --paths src/payment.ts --signal negative
```

Re-running the exact same `context` command afterward drops that decision's relevance from
`0.4` to `~0.3` (both the original decision *and* the new outcome entry now show up, both
nudged down together) — a concrete, measurable instance of ECC's outcome-feedback loop
([`project-memory-bank/02-architecture.md`](../project-memory-bank/02-architecture.md), Phase 16).
This is a nudge (capped at ±2 accumulated per path), not a hard filter — repeated negative
outcomes on the same path lower it further, up to that cap.

## Common workflows

Only workflows the classifier and evidence pipeline actually support are listed — ECC doesn't
do anything task-type-specific beyond how retrieval/ranking weight the evidence it finds.

- **Debugging / investigating**: phrase your request with `debug`/`investigate` language
  ("investigate the intermittent timeout in X"). Git history and related tests are pulled in
  alongside the suspect code so you can see what changed recently and whether it's covered.
- **Code understanding**: `explain` requests favor breadth over recency — good for "how does
  X work" onboarding-style questions.
- **Refactoring / code review**: `refactor`/`review` requests surface a higher-risk
  verification plan (peer review + conflict resolution steps kick in at high risk) since these
  task types are weighted as higher-risk by `assessRisk`.
- **Planning**: `plan` requests behave like `explain` — broad architectural evidence, not
  recency-biased.
- **Testing**: `test` requests prioritize existing test coverage as primary evidence.

Golden, fully worked examples of two of these (debugging and refactoring) with real captured
output and token comparisons live in [`examples/`](examples/).

## Troubleshooting

**"command not found" / nothing happens after `npm ci`**
Make sure you're running Node 20+ (`node --version`); the `package.json` `engines` field
requires it and older Node may fail obscurely on ESM syntax.

**`ECC failed: ENOENT: no such file or directory, scandir '...'`**
The `--path` you gave doesn't exist. This is the actual verified error message — ECC doesn't
crash with a stack trace, it prints this and exits with code 1.

**`Usage: ecc context "<task description>" ...` printed and nothing else happened**
You ran the CLI with an unrecognized command, or `context` with no task description. This is
the real usage string the CLI prints — exit code 1, no partial/garbage output.

**`Error: --type must be one of decision/incident/outcome.`**
`ecc memory` requires a valid `--type`. This and `Error: --summary is required.` /
`Error: --signal must be one of positive/negative.` are the actual validation messages
`memoryCommand.ts` prints — all real, verified error paths, not hypothetical ones.

**Git-related evidence is missing / `repository.commit` is `"unknown"`**
The target directory isn't a git repository (or `git` isn't on `PATH`). ECC treats this as
"skip git evidence," not a failure — code and test evidence are unaffected.

**Empty or nearly-empty `context.primary`**
Your `--budget` may be too tight (check `excluded`), or your task description's wording
doesn't overlap with any file/symbol name in the repo (retrieval is keyword-overlap based, not
semantic — see [Limitations](../README.md#limitations)). Try rephrasing with terms that actually
appear in the code.

**MCP client can't connect**
Confirm you ran `npm run build` first (`dist/mcp/index.js` must exist) and that your client is
configured to run `node dist/mcp/index.js` (or the installed `ecc-mcp` bin) over **stdio** —
there's no HTTP/SSE transport.

**VS Code extension: right-click menu doesn't show "Compile Engineering Context"**
The extension is a separate package under `vscode-extension/` and isn't installed into your
main VS Code by cloning this repo — see [`vscode-extension/README.md`](../vscode-extension/README.md):
`cd vscode-extension && npm install && npm run build`, then press F5 inside that folder in VS
Code to launch a development host with the extension active.

**A permission error writing `.ecc/memory.json`**
ECC needs write access to the target repository's root to create the `.ecc/` directory on
first `ecc memory` use. Point `--path` at a directory you own, or check filesystem
permissions.

## Project internals

Progressive depth, so you can stop reading once you have enough:

**Beginner**: ECC is a pipeline. You give it a task + a repo path; it gives you back a JSON
document describing what matters and why.

**User workflow**: `ecc context "<task>" --path <repo>` → read `context.primary` →
check `verification` → optionally record an outcome later with `ecc memory`.

**CLI**: [`src/cli/`](../src/cli/) — `argv.ts` parses flags (hand-rolled, no dependency),
`runContext.ts` is the single pipeline entry point every surface calls, `cli.ts` wires
argv → pipeline → schema validation → stdout/file, `index.ts` is the shebang entry.

**Core concepts**:
- `EngineeringTask` — `{type, request}`, produced by `classifyTask()`.
- `EvidenceItem` — one piece of evidence with a `source`, optional `path`/`identifier`,
  `relevance`, and (once trust is attached) a `trustLevel` + `provenance`.
- `EngineeringContextPackage` — the full compiled result; the only thing every surface
  actually returns.

**Architecture**: see [`project-memory-bank/02-architecture.md`](../project-memory-bank/02-architecture.md)
for the full pipeline diagram and component-by-component breakdown (repository analysis, task
classification, evidence retrieval, ranking, compilation, trust, memory, verification,
outcome feedback).

**Implementation**: [`project-memory-bank/implementation-status.md`](../project-memory-bank/implementation-status.md)
is the authoritative "what actually exists" record, phase by phase, including every module's
path and what it does — read this before reading source code for anything non-trivial.

**Extension points**: every surface (CLI/MCP/VS Code/GitHub/skill) calls the same
`runContext()` (or, for the evaluation runner, the same five-call chain directly) — a new
surface should do the same rather than reimplementing any pipeline stage. See
[`project-memory-bank/04-decisions.md`](../project-memory-bank/04-decisions.md) for the reasoning
behind that constraint (Decisions #15–19).

## How to contribute

1. Read [`project-memory-bank/active-context.md`](../project-memory-bank/active-context.md) and
   [`implementation-status.md`](../project-memory-bank/implementation-status.md) first — this
   project is developed under a phase-gated protocol with a persistent memory bank; both files
   tell you what's actually been decided and built without needing to read all of `src/`.
2. Keep every file under ~300 lines and one concern per file (the largest source file in the
   whole project today is 114 lines) — the point is that a future reader (human or agent) only
   needs to open the one small file relevant to their change.
3. Development loop:
   ```bash
   npm run typecheck
   npm run lint
   npm test
   npm run build
   ```
   All four must pass clean before a change is considered done. `vscode-extension/` has its
   own identical four-command loop (it's a separate npm package).
4. Tests mirror `src/` under `test/` — unit tests for pure functions, fixture-repo integration
   tests (`test/fixtures/sample-repo/`) for anything that walks a real repository, and isolated
   `mkdtemp` temp-repo tests for anything involving git or the memory store (never test against
   this project's own `.ecc/` or git history — it changes over time).
5. Adding functionality: find the existing module whose contract it extends (per
   [`01-requirements.md`](../project-memory-bank/01-requirements.md)'s "build on existing code,
   don't rewrite" rule) rather than adding a parallel path. Check
   [`04-decisions.md`](../project-memory-bank/04-decisions.md) first — many "why not do it the
   obvious way" questions are already answered there.
6. Submitting changes: open a PR against `main`. `.github/workflows/ci.yml` runs
   typecheck/lint/test/build for both the root package and `vscode-extension/`; a PR against
   this repo also gets ECC's own compiled context posted as a comment automatically
   (`.github/workflows/pr-context.yml`) — a live example of the GitHub integration in action.
