import type { EngineeringTask } from '../types/task.js'
import type { EvidenceConflict, TrustedEvidenceItem } from '../types/trust.js'
import { assessRisk } from './riskAssessor.js'

/**
 * Recommends a verification plan (tests/checks) scaled to the risk assessRisk computes: every
 * plan states the assessed risk level and why, then layers on stricter steps as risk rises -
 * low risk gets only the baseline test-suite recommendation, high risk adds a peer-review step
 * and, if any evidence conflicted, a step to resolve that conflict before proceeding.
 */
export function planVerification(
  task: EngineeringTask,
  primary: TrustedEvidenceItem[],
  supporting: TrustedEvidenceItem[],
  conflicts: EvidenceConflict[],
): string[] {
  const { level, factors } = assessRisk(task, primary, supporting, conflicts)

  const steps: string[] = [
    factors.length > 0
      ? `Risk: ${level} (${factors.join('; ')})`
      : `Risk: ${level} (no elevated risk factors detected)`,
  ]

  const testPaths = [...primary, ...supporting]
    .filter((item) => item.source === 'test' && item.path)
    .map((item) => item.path as string)

  if (testPaths.length > 0) {
    steps.push(`Run the existing tests: ${testPaths.join(', ')}`)
  } else if (primary.some((item) => item.source === 'code')) {
    steps.push('No existing tests found for the affected code - add test coverage before merging')
  }

  if (level === 'medium' || level === 'high') {
    steps.push('Manually verify the primary evidence above reflects the intended change')
  }

  if (level === 'high') {
    steps.push('Request a peer review before merging')
    if (conflicts.length > 0) {
      steps.push('Resolve the surfaced conflicts before proceeding')
    }
  }

  return steps
}
