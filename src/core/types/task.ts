/**
 * The engineering task an EngineeringContextPackage is compiled for.
 * See project-memory-bank/00-vision.md and 02-architecture.md.
 */

export const TASK_TYPES = [
  'explain',
  'debug',
  'modify',
  'review',
  'refactor',
  'investigate',
  'plan',
  'test',
  'optimize',
] as const

export type TaskType = (typeof TASK_TYPES)[number]

export interface EngineeringTask {
  type: TaskType
  request: string
}
