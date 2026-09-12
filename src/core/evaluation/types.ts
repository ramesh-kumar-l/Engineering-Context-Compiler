/**
 * Evaluation model (Phase 11): a benchmark task with hand-picked ground truth, and the
 * metrics computed for one retrieval condition (agent-alone or agent+ECC) against it.
 */

export interface BenchmarkTask {
  name: string
  request: string
  /** Repo-relative paths a human would consider essential evidence for this task. */
  groundTruthRelevantPaths: string[]
}

export interface ConditionMetrics {
  /** Fraction of groundTruthRelevantPaths present in the returned evidence (0-1). */
  evidenceRecall: number
  /** Fraction of returned evidence not in groundTruthRelevantPaths (0-1). */
  irrelevantEvidenceRate: number
  /** Fraction of returned evidence carrying explicit provenance/trust (0-1). */
  provenanceCompleteness: number
  totalTokens: number
  itemCount: number
}

export interface EvaluationResult {
  task: BenchmarkTask
  agentAlone: ConditionMetrics
  agentWithEcc: ConditionMetrics
}
