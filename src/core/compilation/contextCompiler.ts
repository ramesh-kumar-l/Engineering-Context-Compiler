import type { EngineeringTask } from '../types/task.js'
import type { EvidenceItem } from '../types/evidence.js'
import type { EngineeringContextPackage, RepositoryRef } from '../types/contextPackage.js'
import { createEmptyContextPackage } from '../contextPackage.js'
import { selectEvidence } from './contextSelector.js'
import { DEFAULT_TOKEN_BUDGET } from './tokenBudget.js'

export interface CompileContextOptions {
  tokenBudget?: number
}

/**
 * Compiles a valid EngineeringContextPackage from already-ranked evidence (Phase 5's
 * rankEvidence output): selects and compresses it into primary/supporting within a token
 * budget (contextSelector.ts) and records why anything was left out (contextSelector.ts's
 * `excluded` output). Does not re-rank - callers must pass evidence through rankEvidence
 * first so selection order reflects the multi-signal ranking, not raw retrieval order.
 */
export function compileContext(
  task: EngineeringTask,
  repository: RepositoryRef,
  rankedEvidence: EvidenceItem[],
  options: CompileContextOptions = {},
): EngineeringContextPackage {
  const pkg = createEmptyContextPackage(task, repository)
  const { primary, supporting, excluded } = selectEvidence(
    rankedEvidence,
    options.tokenBudget ?? DEFAULT_TOKEN_BUDGET,
  )

  pkg.context.primary = primary
  pkg.context.supporting = supporting
  pkg.excluded = excluded

  return pkg
}
