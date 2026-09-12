# 07 — Evaluation

Status: **no implementation exists yet, so no evaluation has been run.** This file records
the framework from the master prompt (Sections 43-44) for when Phase 11 (or earlier ad-hoc
evaluation) becomes relevant.

## Critical experiment (once something is built)

Strong AI agent alone **vs.** strong AI agent + ECC. Never compare against a weak baseline.

## Metrics to eventually track

- **Evidence**: critical evidence recall, irrelevant evidence rate, provenance completeness.
- **Judgment**: expert-rated usefulness, decision quality, risk detection, constraint
  recall, historical recall, verification quality.
- **Efficiency**: tokens, agent turns, latency, compute cost, time saved.
- **Trust**: unsupported claims, hallucination rate, correction rate, provenance accuracy.

## Benchmark (future, Phase 11)

Each benchmark task should carry: repository, task, ground-truth relevant evidence, known
constraints, historical facts, expected verification. Use unseen repos, temporal holdouts,
adversarial tasks, large repos, legacy systems, monorepos, real-world tasks — avoid leakage.

## Current baseline

None. Nothing to compare yet — see [[implementation-status]].
