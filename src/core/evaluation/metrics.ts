import type { ConditionMetrics } from './types.js'

export interface ConditionMetricsInput {
  evidencePaths: string[]
  totalTokens: number
  /** 0-1, supplied by the caller since it reflects a structural guarantee, not evidence content. */
  provenanceCompleteness: number
  groundTruthRelevantPaths: string[]
}

/**
 * Pure metric arithmetic shared by both conditions (agent-alone and agent+ECC), so a
 * benchmark comparison is always like-for-like: the only thing that differs between the two
 * calls is which evidence-gathering strategy produced `evidencePaths`/`totalTokens`.
 */
export function computeConditionMetrics(input: ConditionMetricsInput): ConditionMetrics {
  const { totalTokens, provenanceCompleteness, groundTruthRelevantPaths } = input
  const evidencePaths = new Set(input.evidencePaths)
  const groundTruth = new Set(groundTruthRelevantPaths)

  const matched = [...groundTruth].filter((path) => evidencePaths.has(path))
  const evidenceRecall = groundTruth.size === 0 ? 1 : matched.length / groundTruth.size

  const irrelevant = [...evidencePaths].filter((path) => !groundTruth.has(path))
  const irrelevantEvidenceRate = evidencePaths.size === 0 ? 0 : irrelevant.length / evidencePaths.size

  return {
    evidenceRecall,
    irrelevantEvidenceRate,
    provenanceCompleteness,
    totalTokens,
    itemCount: evidencePaths.size,
  }
}
