/**
 * EngineeringContextPackage: the central product contract (see
 * project-memory-bank/02-architecture.md, "EngineeringContextPackage (draft schema)").
 * Every ECC surface (CLI, skill, MCP, ...) produces/consumes this shape.
 */

import type { EngineeringTask } from './task.js'
import type { EvidenceItem, EvidenceProvenance } from './evidence.js'
import type { TrustLevel } from './trust.js'

export const CONTEXT_PACKAGE_VERSION = '0.1'

export interface RepositoryRef {
  name: string
  commit: string
}

export interface HistoricalClaimSource {
  type: string
  id: string
}

export interface HistoricalClaim {
  claim: string
  trustLevel: TrustLevel
  source: HistoricalClaimSource
}

export interface Constraint {
  statement: string
  provenance: EvidenceProvenance
}

export interface ExclusionSummary {
  reason: string
  count: number
}

export interface ContextEvidence {
  primary: EvidenceItem[]
  supporting: EvidenceItem[]
}

export interface EngineeringContextPackage {
  version: string
  task: EngineeringTask
  repository: RepositoryRef
  context: ContextEvidence
  history: HistoricalClaim[]
  constraints: Constraint[]
  unknowns: string[]
  verification: string[]
  excluded: ExclusionSummary[]
}
