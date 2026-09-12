/**
 * Engineering memory: architectural decisions/incidents/outcomes recorded during past
 * sessions against a repository, persisted so a later compilation for that same repository
 * can retrieve them as evidence (Phase 14).
 */

export const MEMORY_ENTRY_TYPES = ['decision', 'incident', 'outcome'] as const

export type MemoryEntryType = (typeof MEMORY_ENTRY_TYPES)[number]

export interface MemoryEntry {
  id: string
  type: MemoryEntryType
  /** Short free-text statement of what was decided/happened/resulted. */
  summary: string
  detail?: string
  tags?: string[]
  /** Repo-relative paths this entry is about, if any. */
  relatedPaths?: string[]
  /** ISO 8601 timestamp of when the entry was recorded. */
  timestamp: string
}
