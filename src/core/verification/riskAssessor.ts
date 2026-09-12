import type { EngineeringTask, TaskType } from '../types/task.js'
import type { EvidenceConflict, TrustedEvidenceItem } from '../types/trust.js'
import type { RiskAssessment, RiskLevel } from './types.js'

/** Higher weight = a task type that tends to change behavior / have a bigger blast radius. */
const TASK_TYPE_RISK_WEIGHT: Record<TaskType, number> = {
  explain: 0,
  investigate: 0,
  review: 1,
  plan: 1,
  test: 1,
  debug: 2,
  optimize: 2,
  modify: 3,
  refactor: 3,
}

const MEDIUM_SCORE_FLOOR = 2
const HIGH_SCORE_FLOOR = 5
const LARGE_PRIMARY_SET_SIZE = 6

function scoreToLevel(score: number): RiskLevel {
  if (score >= HIGH_SCORE_FLOOR) return 'high'
  if (score >= MEDIUM_SCORE_FLOOR) return 'medium'
  return 'low'
}

/**
 * Scores task risk from signals earlier phases already compute - no new evidence gathering.
 * Deterministic and rule-based (same style as Phase 3's classifyTask), not learned: task type,
 * missing test coverage for touched code, low-trust primary evidence, surfaced conflicts, and
 * blast radius (how much primary evidence a compilation produced).
 */
export function assessRisk(
  task: EngineeringTask,
  primary: TrustedEvidenceItem[],
  supporting: TrustedEvidenceItem[],
  conflicts: EvidenceConflict[],
): RiskAssessment {
  const factors: string[] = []
  const taskTypeWeight = TASK_TYPE_RISK_WEIGHT[task.type]
  let score = taskTypeWeight

  if (taskTypeWeight > 0) {
    factors.push(`task type '${task.type}' inherently carries elevated risk`)
  }

  const hasCode = primary.some((item) => item.source === 'code')
  const hasTest = [...primary, ...supporting].some((item) => item.source === 'test')
  if (hasCode && !hasTest) {
    score += 2
    factors.push('no test evidence found for the affected code')
  }

  const lowTrustPrimary = primary.filter(
    (item) => item.trustLevel === 'inference' || item.trustLevel === 'unknown',
  )
  if (lowTrustPrimary.length > 0) {
    score += 1
    factors.push(`${lowTrustPrimary.length} primary item(s) have low-trust evidence`)
  }

  if (conflicts.length > 0) {
    score += 2
    factors.push(`${conflicts.length} conflict(s) found in the compiled evidence`)
  }

  if (primary.length > LARGE_PRIMARY_SET_SIZE) {
    score += 1
    factors.push(`large blast radius: ${primary.length} primary evidence items`)
  }

  return { level: scoreToLevel(score), score, factors }
}
