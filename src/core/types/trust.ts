/**
 * Trust classification. Never blur these levels: an inference must never be
 * presented as a fact. See project-memory-bank/01-requirements.md ("Trust model").
 */

export const TRUST_LEVELS = ['fact', 'derived', 'inference', 'unknown'] as const

export type TrustLevel = (typeof TRUST_LEVELS)[number]
