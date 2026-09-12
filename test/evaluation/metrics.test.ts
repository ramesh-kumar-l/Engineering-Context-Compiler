import { describe, expect, it } from 'vitest'
import { computeConditionMetrics } from '../../src/core/evaluation/metrics.js'

describe('computeConditionMetrics', () => {
  it('scores full recall and zero irrelevance when evidence exactly matches ground truth', () => {
    const metrics = computeConditionMetrics({
      evidencePaths: ['a.ts', 'b.ts'],
      totalTokens: 100,
      provenanceCompleteness: 1,
      groundTruthRelevantPaths: ['a.ts', 'b.ts'],
    })

    expect(metrics.evidenceRecall).toBe(1)
    expect(metrics.irrelevantEvidenceRate).toBe(0)
    expect(metrics.itemCount).toBe(2)
    expect(metrics.totalTokens).toBe(100)
  })

  it('scores partial recall and a nonzero irrelevance rate for a mixed set', () => {
    const metrics = computeConditionMetrics({
      evidencePaths: ['a.ts', 'c.ts'],
      totalTokens: 50,
      provenanceCompleteness: 0,
      groundTruthRelevantPaths: ['a.ts', 'b.ts'],
    })

    expect(metrics.evidenceRecall).toBe(0.5)
    expect(metrics.irrelevantEvidenceRate).toBe(0.5)
  })

  it('treats no ground truth as trivially fully recalled and empty evidence as not irrelevant', () => {
    const metrics = computeConditionMetrics({
      evidencePaths: [],
      totalTokens: 0,
      provenanceCompleteness: 0,
      groundTruthRelevantPaths: [],
    })

    expect(metrics.evidenceRecall).toBe(1)
    expect(metrics.irrelevantEvidenceRate).toBe(0)
    expect(metrics.itemCount).toBe(0)
  })

  it('de-duplicates evidence paths before scoring', () => {
    const metrics = computeConditionMetrics({
      evidencePaths: ['a.ts', 'a.ts'],
      totalTokens: 10,
      provenanceCompleteness: 1,
      groundTruthRelevantPaths: ['a.ts'],
    })

    expect(metrics.itemCount).toBe(1)
    expect(metrics.evidenceRecall).toBe(1)
  })
})
