import type { EvidenceItem, EvidenceSourceType } from '../types/evidence.js'

/**
 * Static priority per evidence source type - reflects how directly each source type bears on
 * an engineering task, independent of any single item's own relevance score. Code is ground
 * truth; tests corroborate code; everything else is currently retrieved as supplementary
 * historical evidence. Ranking on relevance alone would let a highly-relevant but merely
 * supplementary git commit outrank a modestly-relevant but authoritative source file - this
 * table is the second, independent signal that guards against that (see 04-decisions.md #9's
 * open question about relevance scores not being comparable across source types).
 */
export const SOURCE_AUTHORITY_WEIGHT: Record<EvidenceSourceType, number> = {
  code: 1.0,
  test: 0.85,
  constraint: 0.8,
  documentation: 0.7,
  git: 0.6,
  pr: 0.6,
  issue: 0.55,
  ci: 0.5,
  runtime: 0.5,
  incident: 0.5,
  memory: 0.45,
}

/** Small tie-breaking nudge: an item with resolved symbol matches is more specific evidence. */
const SPECIFICITY_BONUS = 0.05

/**
 * Small nudge per unit of accumulated outcome feedback (see
 * `src/core/intelligence/outcomeFeedback.ts`) - scaled well below the gap between adjacent
 * source-type authority weights so it can reorder items within the same source type without
 * ever letting outcome history override the authority signal itself.
 */
const OUTCOME_ADJUSTMENT_WEIGHT = 0.05

/** Deterministic fallback order when two items land on the exact same rank score. */
const SOURCE_TIEBREAK_ORDER: EvidenceSourceType[] = [
  'code',
  'test',
  'constraint',
  'documentation',
  'git',
  'pr',
  'issue',
  'ci',
  'runtime',
  'incident',
  'memory',
]

/**
 * Combines an item's own relevance with its source's authority weight, a small specificity
 * bonus for symbol-level matches, and an optional outcome-feedback nudge (Phase 16: positive/
 * negative `outcome` memory entries recorded against this item's path). `outcomeAdjustments`
 * defaults to empty so every existing caller that doesn't pass one gets identical behavior to
 * before Phase 16.
 */
export function computeRankScore(
  item: EvidenceItem,
  outcomeAdjustments: Map<string, number> = new Map(),
): number {
  const authority = SOURCE_AUTHORITY_WEIGHT[item.source] ?? 0.5
  const specificity = item.symbols && item.symbols.length > 0 ? SPECIFICITY_BONUS : 0
  const outcome = item.path ? (outcomeAdjustments.get(item.path) ?? 0) * OUTCOME_ADJUSTMENT_WEIGHT : 0
  return item.relevance * authority + specificity + outcome
}

function tiebreakKey(item: EvidenceItem): string {
  return item.path ?? item.identifier ?? ''
}

/**
 * Ranks candidate evidence (Phase 4's `retrieveEvidence` output) using more than one signal:
 * relevance, source-type authority, symbol-match specificity, and (Phase 16) accumulated
 * outcome feedback for the item's path. Ties break deterministically by source-type priority,
 * then by path/identifier, so ordering is stable and unit-testable. Does not mutate or drop
 * items - purely an ordering step, kept separate from retrieval and from the token-budget
 * selection Phase 6 (Context Compilation) builds on top. `outcomeAdjustments` is produced by
 * `src/core/intelligence/outcomeFeedback.ts`; this module has no dependency on memory itself,
 * it only consumes the resulting `Map<string, number>`.
 */
export function rankEvidence(
  items: EvidenceItem[],
  outcomeAdjustments: Map<string, number> = new Map(),
): EvidenceItem[] {
  return [...items].sort((a, b) => {
    const scoreDiff = computeRankScore(b, outcomeAdjustments) - computeRankScore(a, outcomeAdjustments)
    if (scoreDiff !== 0) return scoreDiff

    const orderDiff = SOURCE_TIEBREAK_ORDER.indexOf(a.source) - SOURCE_TIEBREAK_ORDER.indexOf(b.source)
    if (orderDiff !== 0) return orderDiff

    return tiebreakKey(a).localeCompare(tiebreakKey(b))
  })
}
