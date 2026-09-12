/**
 * Engineering memory: architectural decisions/incidents/outcomes recorded during past
 * sessions against a repository, persisted so a later compilation for that same repository
 * can retrieve them as evidence (Phase 14).
 */

export const MEMORY_ENTRY_TYPES = ['decision', 'incident', 'outcome'] as const

export type MemoryEntryType = (typeof MEMORY_ENTRY_TYPES)[number]

/** For an `outcome` entry: whether what happened was good or bad for the paths it names. */
export const MEMORY_OUTCOME_SIGNALS = ['positive', 'negative'] as const

export type MemoryOutcomeSignal = (typeof MEMORY_OUTCOME_SIGNALS)[number]

export interface MemoryEntry {
  id: string
  type: MemoryEntryType
  /** Short free-text statement of what was decided/happened/resulted. */
  summary: string
  detail?: string
  tags?: string[]
  /** Repo-relative paths this entry is about, if any. */
  relatedPaths?: string[]
  /**
   * Only meaningful on `type: 'outcome'` entries - the feedback signal Phase 16's
   * `computeOutcomeAdjustments` reads to nudge future ranking/memory relevance for the paths
   * this entry names. Omitted entries (including all decisions/incidents) contribute nothing.
   */
  signal?: MemoryOutcomeSignal
  /** ISO 8601 timestamp of when the entry was recorded. */
  timestamp: string
}
