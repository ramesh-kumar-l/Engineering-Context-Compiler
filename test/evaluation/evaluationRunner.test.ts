import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { runEvaluation } from '../../src/core/evaluation/evaluationRunner.js'

const FIXTURE_ROOT = fileURLToPath(new URL('../fixtures/sample-repo', import.meta.url))

describe('runEvaluation (agent-alone vs agent+ECC)', () => {
  it('compares both conditions against the same ground truth and repo', async () => {
    const result = await runEvaluation(FIXTURE_ROOT, {
      name: 'explain-utils',
      request: 'explain the utils module',
      groundTruthRelevantPaths: ['src/utils.ts'],
    })

    // Structural guarantees from Phase 7 (provenanceGuard.ts/trustClassifier.ts): ECC always
    // attaches trust/provenance, a naive keyword-grep baseline never does. This holds
    // regardless of how this repo's git history grows, unlike a raw token-count comparison.
    expect(result.agentAlone.provenanceCompleteness).toBe(0)
    expect(result.agentWithEcc.provenanceCompleteness).toBe(1)

    expect(result.agentAlone.evidenceRecall).toBe(1)
    expect(result.agentWithEcc.evidenceRecall).toBe(1)
    expect(result.agentAlone.totalTokens).toBeGreaterThan(0)
    expect(result.agentWithEcc.totalTokens).toBeGreaterThan(0)
  })

  it('echoes the benchmark task back on the result', async () => {
    const task = {
      name: 'demo',
      request: 'explain the utils module',
      groundTruthRelevantPaths: ['src/utils.ts'],
    }

    const result = await runEvaluation(FIXTURE_ROOT, task)

    expect(result.task).toBe(task)
  })
})
