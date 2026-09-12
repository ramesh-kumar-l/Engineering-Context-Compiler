---
name: ecc-context
description: Use before starting a non-trivial engineering task in a real repository (fix, feature, refactor, migration, investigation) to compile an evidence-backed context package via the ecc CLI, instead of guessing at relevant code/history. Not for trivial one-line edits, for repos with no VCS/code to analyze, or as a substitute for planning, coding, review, or verification skills.
---

# ECC Context

Engineering Context Compiler (ECC) turns a free-text engineering task into a small,
evidence-backed `EngineeringContextPackage`: the specific code, tests, and git history
relevant to the task, ranked, trust-classified, and fit to a token budget. This skill
teaches an agent when and how to call it. It does not teach how to plan, write, review, or
verify a change — hand off to whatever skill covers that, using ECC's output as its input.

## When to use this skill

- The task touches an existing repository and its scope is non-trivial (more than a
  one-line, obviously-local change) — e.g. "fix the auth timeout bug", "add rate limiting
  to the API", "refactor the payment retry logic".
- You are about to guess which files/tests/history are relevant instead of retrieving them.
- You want a token-budgeted, ranked summary instead of manually grepping and reading files
  one at a time.

## When NOT to use this skill

- The task has no target repository, or is not about existing code (greenfield design
  questions, pure Q&A, non-engineering requests).
- The change is trivially local and you already know the exact file/line (e.g. "fix this
  typo on line 12").
- You need help *planning*, *writing*, *reviewing*, or *verifying* a change — that is the
  job of other skills/tools. This skill's only responsibility is producing context; do not
  fold planning or code-review instructions into it.

## Prerequisites

ECC must be built once per checkout:

```bash
npm install
npm run build
```

This produces `dist/cli/index.js`. If the `ecc` package is installed as a dependency with
its `bin` on `PATH`, use `ecc` directly instead of `node dist/cli/index.js`.

## How to invoke it

```bash
node dist/cli/index.js context "<task description>" [--path <repo-dir>] [--out <file>] [--budget <n>]
```

- `"<task description>"` — the same free-text task you were given; ECC classifies its type
  itself, do not pre-categorize it.
- `--path <repo-dir>` — repository to analyze (default: current directory). Point this at
  the repo the task is actually about.
- `--out <file>` — write the package to a file instead of printing to stdout; use this when
  the package is large enough that you'd rather read it as a file than parse it from a
  captured shell result.
- `--budget <n>` — token budget for evidence selection (default: 4000). Raise it if
  `excluded` shows relevant-looking evidence was cut for space; lower it if you only need a
  quick orientation.

The command exits non-zero with a stderr message on misuse (unknown subcommand, missing
task description) or an unreadable repository path — treat that as "no context available",
not as a crash to retry blindly.

## How to read the output

The output is a single JSON `EngineeringContextPackage`:

- `task {type, request}` — ECC's own classification of what you asked for.
- `repository {name, commit}` — what was analyzed, at what commit (`commit` is `"unknown"`
  for a non-git directory — treat evidence as less durable in that case).
- `context.primary` — the code/test evidence most central to the task; read this first.
- `context.supporting` — secondary evidence (git history, docs, etc.).
- `conflicts` — items about the same file/symbol with differing trust levels. Do not
  silently pick one side; surface the conflict to the user or investigate further.
- `unknowns` / `excluded` — gaps ECC couldn't fill or had to cut for budget. Treat these as
  known blind spots, not as "nothing else exists."
- `verification` — ECC's suggested checks, if any; this is a hint, not a replacement for
  your own verification step.

Every item under `context.primary`/`context.supporting` carries a `trustLevel`:
`fact` (directly observed, e.g. a real file/commit), `derived` (computed from facts),
`inference` (a plausible but unconfirmed guess), or `unknown` (no verifiable source). Weight
your confidence accordingly — do not treat an `inference` item as if it were a `fact`.

## Recording memory (decisions/incidents/outcomes)

ECC also persists engineering memory per repository, so a decision/incident/outcome from this
session becomes retrievable evidence (`source: 'memory'`, `trustLevel: 'inference'`) in a
later `context` call against the same repo:

```bash
node dist/cli/index.js memory --type decision --summary "<short statement>" \
  [--detail "<longer explanation>"] [--tags a,b] [--paths src/x.ts,src/y.ts] [--path <repo-dir>]
```

`--type` is one of `decision` / `incident` / `outcome`. Record something here when you make a
non-obvious call the next session on this repo would benefit from knowing about (e.g. "chose
X over Y because Z", "incident: this endpoint failed under load because W", "outcome:
refactor of A reduced B") — not every routine change.

## Failure modes to expect

- A repository with no git history still returns code/test evidence; only
  `repository.commit` and git-sourced items are affected.
- A very tight `--budget` can exclude most or all evidence (`excluded` will show why) —
  re-run with a larger budget rather than assuming the repo has nothing relevant.
- ECC's task classification can be low-confidence for unusual phrasings; the returned
  `task.type` is a best-effort label, not a guarantee — judge relevance from the evidence
  itself, not just the label.
