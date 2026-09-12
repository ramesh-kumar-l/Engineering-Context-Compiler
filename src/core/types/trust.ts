/**
 * Trust classification. Never blur these levels: an inference must never be
 * presented as a fact. See project-memory-bank/01-requirements.md ("Trust model").
 */

import type { EvidenceItem } from './evidence.js'

export const TRUST_LEVELS = ['fact', 'derived', 'inference', 'unknown'] as const

export type TrustLevel = (typeof TRUST_LEVELS)[number]

/** An evidence item guaranteed to carry provenance and an explicit trust classification. */
export interface TrustedEvidenceItem extends EvidenceItem {
  trustLevel: TrustLevel
}

/**
 * Evidence items that share a subject (path or identifier) but were classified at different
 * trust levels - surfaced so a consumer can weigh them, rather than one silently standing in
 * for the other.
 */
export interface EvidenceConflict {
  subject: string
  items: TrustedEvidenceItem[]
}
