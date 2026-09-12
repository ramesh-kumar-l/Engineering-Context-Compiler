import type { EngineeringTask } from '../types/task.js'
import type { EvidenceItem } from '../types/evidence.js'
import type { RepositoryAnalysis } from '../repository/types.js'
import { retrieveCodeEvidence } from './codeEvidenceRetriever.js'
import { retrieveTestEvidence } from './testEvidenceRetriever.js'
import { retrieveGitEvidence } from './gitEvidenceRetriever.js'

/** Bounds how many files get a `git log` shell-out per call, since each is a process spawn. */
export const MAX_GIT_CANDIDATE_FILES = 10

/**
 * Retrieves a candidate evidence set (code, test, git) relevant to a classified task from
 * an analyzed repository. This is retrieval only - no cross-signal ranking beyond the basic
 * keyword-overlap relevance each retriever assigns (Phase 5 builds proper ranking on top).
 */
export function retrieveEvidence(
  task: EngineeringTask,
  repository: RepositoryAnalysis,
): EvidenceItem[] {
  const codeEvidence = retrieveCodeEvidence(task, repository)
  const testEvidence = retrieveTestEvidence(codeEvidence, repository)

  const gitCandidatePaths = codeEvidence
    .slice(0, MAX_GIT_CANDIDATE_FILES)
    .map((item) => item.path)
    .filter((path): path is string => Boolean(path))
  const gitEvidence = retrieveGitEvidence(repository.root, gitCandidatePaths)

  return [...codeEvidence, ...testEvidence, ...gitEvidence]
}
