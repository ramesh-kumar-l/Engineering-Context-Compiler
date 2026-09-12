/**
 * Task risk classification for Phase 15 (Verification Intelligence).
 * See project-memory-bank/05-roadmap.md, Phase 15 exit criteria.
 */

export const RISK_LEVELS = ['low', 'medium', 'high'] as const

export type RiskLevel = (typeof RISK_LEVELS)[number]

export interface RiskAssessment {
  level: RiskLevel
  score: number
  factors: string[]
}
