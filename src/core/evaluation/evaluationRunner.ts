import { basename } from 'node:path'
import { analyzeRepository } from '../repository/repositoryAnalyzer.js'
import { classifyTask } from '../task/taskClassifier.js'
import { retrieveEvidence } from '../evidence/evidenceRetriever.js'
import { rankEvidence } from '../evidence/evidenceRanker.js'
import { compileContext } from '../compilation/contextCompiler.js'
import { estimateItemTokens, DEFAULT_TOKEN_BUDGET } from '../compilation/tokenBudget.js'
import { retrieveBaselineEvidence } from './baselineRetriever.js'
import { computeConditionMetrics } from './metrics.js'
import type { BenchmarkTask, EvaluationResult } from './types.js'
import type { EngineeringTask } from '../types/task.js'
import type { TrustedEvidenceItem } from '../types/trust.js'

function pathsOf(items: TrustedEvidenceItem[]): string[] {
  return items.map((item) => item.path).filter((path): path is string => Boolean(path))
}

/**
 * Runs one benchmark task through both conditions Phase 11's exit criteria requires: "agent
 * alone" (retrieveBaselineEvidence - no ECC) vs "agent+ECC". The agent+ECC side calls the same
 * core pipeline `runContext` (Phase 8) composes - analyzeRepository -> classifyTask ->
 * retrieveEvidence -> rankEvidence -> compileContext - directly, rather than importing
 * `runContext` from `src/cli/`, so this stays a pure core module per [[02-architecture]]'s
 * "core must stay independent of any specific UI" rule (the `RepositoryRef` it needs is a
 * core type; only its real-commit resolution lives in the CLI, which isn't needed here).
 * Both conditions are scored by the same `computeConditionMetrics` so the comparison is
 * apples-to-apples.
 */
export async function runEvaluation(
  rootDir: string,
  task: BenchmarkTask,
  tokenBudget: number = DEFAULT_TOKEN_BUDGET,
): Promise<EvaluationResult> {
  const baseline = await retrieveBaselineEvidence(rootDir, task.request, tokenBudget)
  const agentAlone = computeConditionMetrics({
    evidencePaths: baseline.paths,
    totalTokens: baseline.totalTokens,
    provenanceCompleteness: 0,
    groundTruthRelevantPaths: task.groundTruthRelevantPaths,
  })

  const repository = await analyzeRepository(rootDir)
  const classification = classifyTask(task.request)
  const eccTask: EngineeringTask = { type: classification.type, request: task.request }
  const rankedEvidence = rankEvidence(retrieveEvidence(eccTask, repository))
  const pkg = compileContext(eccTask, { name: basename(rootDir), commit: 'unknown' }, rankedEvidence, {
    tokenBudget,
  })

  const eccItems = [...pkg.context.primary, ...pkg.context.supporting]
  const agentWithEcc = computeConditionMetrics({
    evidencePaths: pathsOf(eccItems),
    totalTokens: eccItems.reduce((sum, item) => sum + estimateItemTokens(item), 0),
    // Guaranteed by Phase 7 (provenanceGuard.ts + trustClassifier.ts): every item that makes
    // it into context.primary/supporting carries a trustLevel - never a partial fraction.
    provenanceCompleteness: 1,
    groundTruthRelevantPaths: task.groundTruthRelevantPaths,
  })

  return { task, agentAlone, agentWithEcc }
}
