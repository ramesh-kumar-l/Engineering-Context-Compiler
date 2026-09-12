# From Context Engineering to Engineering Intelligence

The first four posts in this series describe a pipeline that is, deliberately, entirely
static: every ranking weight, trust classification, and risk threshold in the [Engineering
Context Compiler](../../README.md) (ECC) is a hand-picked table, chosen because no training
data existed to justify anything more adaptive (see Decisions #8, #11, #13, #21 in
[`04-decisions.md`](../../project-memory-bank/04-decisions.md)). Phase 16 — Engineering
Intelligence — is the first, narrow crack in that: a mechanism for real outcomes to change
future compilations, without yet being a learned model.

## What actually got built

The idea is simple enough to state in one sentence: if recording that a design decision led to
an incident should count against that code's relevance in future compilations, there needs to
be a way to record that and a way for it to feed back in. Concretely:

- `ecc memory --type outcome --summary "..." --paths <path> --signal positive|negative` records
  an outcome entry with a signal, using the same file-based per-repository memory store Phase
  14 already built for decisions and incidents.
- `computeOutcomeAdjustments` reduces all recorded outcome entries to a `Map<path, number>`:
  each signaled entry contributes ±1 to every path in its `relatedPaths`, summed and **capped
  at ±2 per path** — a nudge, not a veto.
- That map is threaded through as one new, optional, default-empty parameter to
  `evidenceRanker.ts` (nudges rank score) and `memoryRetriever.ts` (nudges memory relevance).
  Every existing caller that doesn't pass the map behaves exactly as before.

That's the entire mechanism. It was verified end-to-end against the actual built CLI: record a
decision, confirm its relevance in a compiled package, record a negative outcome against the
same path, re-run the identical request, and confirm relevance measurably dropped — 1.0 to 0.9
in the automated test, and a separately reproduced 0.4 to ~0.3 shift documented in the [Newbie
Quick Starter Guide](../NewbieQuickStarterGuide.md#recording-and-using-memory-a-full-example)
with a real, checked transcript.

## Why this is not a learned model, on purpose

It would be reasonable to expect "Engineering Intelligence" to mean a model that learns
ranking weights from outcome history. That's explicitly not what was built, and the reasoning
in Decision #22 is worth stating plainly rather than glossing over: **no meaningful volume of
outcome data exists yet to train anything on.** A model trained on a handful of manually
recorded outcomes wouldn't generalize — it would just memorize noise while looking more
sophisticated than a deterministic accumulator that does the same job transparently. The
accumulator is also trivially inspectable (every adjustment is a small integer sum, cap
included) and trivially reversible (delete the outcome entry, the adjustment goes away),
properties a trained model doesn't share.

## What this deliberately does not touch

Stated as clearly as the mechanism itself, because "engineering intelligence" invites
overclaiming if left vague:

- It adjusts **ranking and memory relevance only**. It does not touch Phase 5's source
  authority weights, Phase 7's trust classification rules, or Phase 15's risk-assessment
  thresholds — a path with three recorded incidents still gets risk-scored by the same static
  rule table as one with none, unless that rule table is separately extended to consider
  memory history (an open item, not yet done — see the honest gap [Golden Example
  1](../examples/golden-example-01-debugging/) surfaced directly: a file with a recorded
  incident tied to it was still scored `"Risk: low"` because risk assessment doesn't currently
  weight incident memory at all).
- It keys on **exact path string equality**. Renaming a file silently drops its accumulated
  outcome history — there's no fuzzy or content-based matching to the old path.
- It's **CLI-only**. Recording an outcome (or any memory entry) isn't yet exposed through the
  MCP tool, VS Code command, or GitHub integration — only the write path Phase 14 built.
- The cap (±2 per path) and weights (±1 per signal) are hand-picked constants, not tuned
  against any measured downstream effect on evaluation metrics — because Phase 16's exit
  criterion was "the loop closes at least once, measurably," not "the loop is tuned optimally."

## Where this could actually go — clearly marked as hypothesis

Everything in this section is future direction, not implemented, not measured, and not
scheduled — recorded here because a series about the ideas behind this project should be
honest about which ideas are still just ideas:

- **A learned re-weighting model**, once real outcome volume exists across enough
  repositories/tasks to train on without just memorizing noise — the condition Decision #22
  explicitly says doesn't hold yet.
- **Feeding outcome history into risk assessment itself**, so a file with a recorded negative
  outcome contributes to `assessRisk`'s score directly, not just to ranking — the gap surfaced
  in Golden Example 1.
- **Exposing outcome recording through MCP/VS Code/GitHub**, so an agent working through any
  surface (not just someone manually running the CLI) can close the loop as part of its normal
  workflow.
- **Fuzzy path matching for renames**, so accumulated history survives a file move instead of
  silently resetting.

None of these are commitments — they're the natural next questions Phase 16 leaves open, listed
so a reader (or a future contributor) doesn't mistake "Engineering Intelligence" for more than
what's actually been built: a small, deterministic, well-tested feedback loop, closed once and
verified, with real room to grow into the name.

This closes the series. The [README](../../README.md) and [Newbie Quick Starter
Guide](../NewbieQuickStarterGuide.md) are the places to actually run any of this; the [golden
examples](../examples/) are where every specific number and behavior cited across these five
posts was captured and can be reproduced.
