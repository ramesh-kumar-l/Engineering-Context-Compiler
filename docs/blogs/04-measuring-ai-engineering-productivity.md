# Measuring AI Engineering Productivity: Tokens Are Only the Beginning

"Uses fewer tokens" is an easy claim to make about any context-compression tool and a
genuinely weak one to lead with, because a shorter context that's missing the one file that
explains the bug is worse than a longer one that includes it. Token count is only meaningful
alongside a measure of whether the *right* evidence made it in. This post is about how the
[Engineering Context Compiler](../../README.md) (ECC) is actually evaluated, what the real
measured numbers are, and — as important — what hasn't been measured yet.

## The metrics, and why each one exists

[`07-evaluation.md`](../../project-memory-bank/07-evaluation.md) defines four metrics for
comparing a naive "agent alone" condition (keyword grep over file paths, no ranking, read
whole matched files until a token budget runs out) against "agent + ECC" on the same task and
budget:

- **Evidence recall** — of the evidence a human would agree is relevant to the task, how much
  did this condition actually surface? This is the metric that answers "did it miss the file
  that mattered," which token count alone can't tell you.
- **Irrelevant evidence rate** — of what was surfaced, how much wasn't actually relevant? A
  condition can have perfect recall by returning everything, so recall alone isn't sufficient
  either.
- **Provenance completeness** — what fraction of returned evidence carries a traceable source
  and trust level? This is close to a give-away metric for the naive baseline (it's
  structurally 0%, because nothing in a plain grep result carries provenance), but it's
  reported anyway because it's exactly the thing an agent needs to know how much to trust what
  it's reading.
- **Estimated tokens** — cost, but only meaningful read alongside the three metrics above.

## The real numbers

Measured by running [`npm run benchmark`](../../src/benchmark/benchmarkTasks.ts) — three tasks
against this repository's own actual codebase, not a synthetic fixture, using the identical
`computeConditionMetrics` function for both conditions so the comparison is apples-to-apples:

| Metric | Agent alone | Agent + ECC |
|---|---|---|
| Evidence recall | 67% | 100% |
| Irrelevant evidence rate | 72% | 87% |
| Provenance completeness | 0% | 100% |
| Estimated tokens | 2833 | 1053 |

Read the irrelevant-evidence-rate row carefully: it's *worse* for ECC in this run, not better.
That's not a typo, and it's not hidden — [Decision
#17](../../project-memory-bank/04-decisions.md) records why it's reported as-is: ECC
intentionally returns supplementary git-history and test evidence beyond each task's narrow
ground-truth path set, which counts against it on a metric that only credits an exact
ground-truth path match. The alternative — narrowing ground truth or dropping the metric to
make the comparison look uniformly favorable — would defeat the purpose of measuring at all.
An evaluation harness that only ever reports good news isn't measuring anything.

## What the benchmark doesn't cover yet

Stated plainly, because a benchmarking claim is only as good as its scope:

- **Three tasks, one repository.** No unseen-repo, temporal-holdout, or adversarial test set
  exists yet. These numbers describe how ECC performs against its own codebase's structure and
  history, not a general claim across arbitrary repositories.
- **The "agent alone" baseline is simulated, not a live second LLM.** It's a deterministic
  keyword-grep-over-filenames heuristic (Decision #17), chosen specifically to keep the
  benchmark offline, free, and reproducible in CI — not a claim that it represents the best
  possible unaided-agent performance. A real agent using a real search tool might do
  meaningfully better or worse than this baseline; that comparison hasn't been run.
- **The benchmark doesn't measure verification-plan quality or outcome-feedback effects.**
  Phase 15's risk-scaled verification and Phase 16's outcome feedback loop are both
  demonstrated working correctly in unit/integration tests and in the [golden
  examples](../examples/), but neither has its own quantitative benchmark metric yet — this is
  an explicit gap, not an oversight being glossed over.
- **Recall isn't always a win, and that's worth saying out loud.** [Golden Example
  2](../examples/golden-example-02-refactoring/) is a case where the naive baseline ties ECC on
  file recall at comparable token cost — reported that way in this project's own documentation,
  not smoothed over, because the actual differentiator in that example is provenance and a
  risk-scaled verification plan, not recall.

## What "productivity" would actually need to measure

None of the metrics above measure the thing "AI engineering productivity" usually implies —
time saved, defects prevented, PRs merged faster, fewer round-trips between an agent and a
reviewer. Those require real usage over real time, not a benchmark that runs in CI. This
project's north-star metric, stated in [`00-vision.md`](../../project-memory-bank/00-vision.md),
is a coding agent measurably performing better *with* ECC-compiled context than *without* it —
and the evaluation above is a first, narrow, honestly-scoped step toward that, not a claim that
it's already been demonstrated at the level "productivity" implies. **Marked explicitly: not
yet measured** — any claim about developer time saved, defect rates, or review cycle time is
future work, not a result of the current benchmark.

Next: [Phase 16 closes a feedback loop between outcomes and future
compilations](05-from-context-engineering-to-engineering-intelligence.md) — the first, smallest
step toward measuring and improving from real usage rather than a static benchmark.
