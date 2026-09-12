import { CONTEXT_PACKAGE_VERSION } from './types/contextPackage.js'
import type { EngineeringContextPackage, RepositoryRef } from './types/contextPackage.js'
import type { EngineeringTask } from './types/task.js'

/**
 * Builds an empty, schema-valid EngineeringContextPackage for the given task
 * and repository. Retrieval/ranking/compression phases fill in `context`,
 * `history`, `constraints`, etc. later - this only guarantees a valid shell.
 */
export function createEmptyContextPackage(
  task: EngineeringTask,
  repository: RepositoryRef,
): EngineeringContextPackage {
  return {
    version: CONTEXT_PACKAGE_VERSION,
    task,
    repository,
    context: { primary: [], supporting: [] },
    history: [],
    constraints: [],
    unknowns: [],
    verification: [],
    excluded: [],
  }
}
