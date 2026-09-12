/**
 * Evidence model: a single piece of context pulled from the repository or its
 * surrounding systems, with enough provenance to judge whether to trust it.
 */

export const EVIDENCE_SOURCE_TYPES = [
  'code',
  'git',
  'pr',
  'issue',
  'documentation',
  'test',
  'ci',
  'runtime',
  'incident',
  'memory',
  'constraint',
] as const

export type EvidenceSourceType = (typeof EVIDENCE_SOURCE_TYPES)[number]

export type EvidenceAuthority = 'low' | 'medium' | 'high'
export type EvidenceFreshness = 'current' | 'stale' | 'unknown'

export interface EvidenceProvenance {
  source: EvidenceSourceType
  identifier?: string
  path?: string
  lineRange?: string
  commit?: string
  timestamp?: string
  authority?: EvidenceAuthority
  freshness?: EvidenceFreshness
}

export interface EvidenceItem {
  source: EvidenceSourceType
  path?: string
  identifier?: string
  symbols?: string[]
  /** 0-1: how relevant this item is to the task. */
  relevance: number
  /** 0-1: how confident ECC is that the item is correct/current. */
  confidence?: number
  provenance?: EvidenceProvenance
}
