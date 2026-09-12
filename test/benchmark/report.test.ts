import { describe, expect, it } from 'vitest'
import { formatReport } from '../../src/benchmark/report.js'
import type { EvaluationResult } from '../../src/core/evaluation/types.js'

describe('formatReport', () => {
  it('renders a per-task comparison table plus an aggregate summary', () => {
    const results: EvaluationResult[] = [
      {
        task: { name: 'demo', request: 'do the thing', groundTruthRelevantPaths: ['a.ts'] },
        agentAlone: {
          evidenceRecall: 0.5,
          irrelevantEvidenceRate: 0.5,
          provenanceCompleteness: 0,
          totalTokens: 40,
          itemCount: 2,
        },
        agentWithEcc: {
          evidenceRecall: 1,
          irrelevantEvidenceRate: 0,
          provenanceCompleteness: 1,
          totalTokens: 30,
          itemCount: 1,
        },
      },
    ]

    const output = formatReport(results)

    expect(output).toContain('demo')
    expect(output).toContain('Agent alone')
    expect(output).toContain('Agent + ECC')
    expect(output).toContain('Summary (average across all tasks)')
  })
})
