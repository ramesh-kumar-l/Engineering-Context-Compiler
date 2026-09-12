import { resolve } from 'node:path'
import { analyzeRepository } from '../core/repository/repositoryAnalyzer.js'
import { classifyTask } from '../core/task/taskClassifier.js'
import { retrieveEvidence } from '../core/evidence/evidenceRetriever.js'
import { rankEvidence } from '../core/evidence/evidenceRanker.js'
import { compileContext } from '../core/compilation/contextCompiler.js'
import { DEFAULT_TOKEN_BUDGET } from '../core/compilation/tokenBudget.js'
import { loadOutcomeAdjustments } from '../core/intelligence/outcomeFeedback.js'
import { resolveRepositoryRef } from './repositoryRef.js'
import type { EngineeringTask } from '../core/types/task.js'
import type { EngineeringContextPackage } from '../core/types/contextPackage.js'

export interface RunContextOptions {
  tokenBudget?: number
}

/**
 * Runs the full ECC pipeline end-to-end against a real directory: repository analysis ->
 * task classification -> evidence retrieval -> ranking -> compilation -> trust/provenance.
 * This is the single orchestration point every surface (CLI now, skill/MCP later) calls into,
 * so they stay thin wrappers over the same pipeline rather than re-implementing it.
 */
export async function runContext(
  repoPath: string,
  request: string,
  options: RunContextOptions = {},
): Promise<EngineeringContextPackage> {
  const rootDir = resolve(repoPath)

  const repository = await analyzeRepository(rootDir)
  const repositoryRef = resolveRepositoryRef(rootDir)
  const classification = classifyTask(request)
  const task: EngineeringTask = { type: classification.type, request }

  const outcomeAdjustments = loadOutcomeAdjustments(rootDir)
  const candidateEvidence = retrieveEvidence(task, repository, outcomeAdjustments)
  const rankedEvidence = rankEvidence(candidateEvidence, outcomeAdjustments)

  return compileContext(task, repositoryRef, rankedEvidence, {
    tokenBudget: options.tokenBudget ?? DEFAULT_TOKEN_BUDGET,
  })
}
