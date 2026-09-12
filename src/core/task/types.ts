import type { TaskType } from '../types/task.js'

/**
 * Result of classifying a free-text request into a TaskType.
 * confidence is 0..1: how much more the winning type's signals dominated
 * over the runner-up (1 = no competing signals matched at all).
 */
export interface TaskClassification {
  type: TaskType
  confidence: number
}

export interface TaskSignal {
  pattern: RegExp
  /** Higher weight = more specific/unambiguous phrase for this TaskType. */
  weight: number
}
