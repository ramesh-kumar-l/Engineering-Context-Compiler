import { TASK_TYPES } from '../types/task.js'
import type { TaskType } from '../types/task.js'
import { DEFAULT_TASK_TYPE, TASK_SIGNALS } from './signals.js'
import type { TaskClassification } from './types.js'

function normalize(request: string): string {
  return request.trim().toLowerCase()
}

function weightedScore(normalized: string, type: TaskType): number {
  let score = 0
  for (const signal of TASK_SIGNALS[type]) {
    if (signal.pattern.test(normalized)) {
      score += signal.weight
    }
  }
  return score
}

/**
 * Classifies a free-text engineering request into a TaskType using weighted
 * keyword/phrase signals (see signals.ts). Deterministic and dependency-free
 * - no model call needed for "reasonable accuracy" on typical requests.
 *
 * Ties and no-signal requests fall back to DEFAULT_TASK_TYPE with confidence
 * reflecting how contested the decision was (0 = pure guess, 1 = only one
 * type had any matching signal).
 */
export function classifyTask(request: string): TaskClassification {
  const normalized = normalize(request)

  let bestType: TaskType = DEFAULT_TASK_TYPE
  let bestScore = 0
  let secondScore = 0

  for (const type of TASK_TYPES) {
    const score = weightedScore(normalized, type)
    if (score > bestScore) {
      secondScore = bestScore
      bestScore = score
      bestType = type
    } else if (score > secondScore) {
      secondScore = score
    }
  }

  if (bestScore === 0) {
    return { type: DEFAULT_TASK_TYPE, confidence: 0 }
  }

  const confidence = (bestScore - secondScore) / bestScore
  return { type: bestType, confidence }
}
