import type { EvidenceItem, EvidenceSourceType } from '../types/evidence.js'
import type { ExclusionSummary } from '../types/contextPackage.js'
import { compressEvidenceItem } from './contextCompressor.js'
import { estimateItemTokens, DEFAULT_TOKEN_BUDGET } from './tokenBudget.js'

/**
 * Evidence directly about the code (code/test) is primary context; everything else (git,
 * docs, issues, ...) is supplementary and goes in `supporting`. Mirrors the authority
 * grouping evidenceRanker.ts already draws between code/test and other source types.
 */
const PRIMARY_SOURCES: ReadonlySet<EvidenceSourceType> = new Set(['code', 'test'])

export function isPrimarySource(source: EvidenceSourceType): boolean {
  return PRIMARY_SOURCES.has(source)
}

export interface EvidenceSelection {
  primary: EvidenceItem[]
  supporting: EvidenceItem[]
  excluded: ExclusionSummary[]
}

const BUDGET_EXCLUSION_REASON = 'token_budget_exceeded'

/**
 * Selects and compresses ranked evidence (evidenceRanker.ts output, already priority-ordered)
 * into primary/supporting buckets within a token budget. Walks the ranked list in order,
 * greedily including each item that still fits, so a higher-ranked item is never pushed out
 * to make room for a lower-ranked one, while a later, smaller item can still fill space an
 * earlier, skipped item left behind. Anything that doesn't fit is counted, not silently
 * dropped, so the caller can report why (Section 18's `excluded` field).
 */
export function selectEvidence(
  rankedEvidence: EvidenceItem[],
  tokenBudget: number = DEFAULT_TOKEN_BUDGET,
): EvidenceSelection {
  const primary: EvidenceItem[] = []
  const supporting: EvidenceItem[] = []
  let tokensUsed = 0
  let excludedCount = 0

  for (const rawItem of rankedEvidence) {
    const item = compressEvidenceItem(rawItem)
    const itemTokens = estimateItemTokens(item)

    if (tokensUsed + itemTokens > tokenBudget) {
      excludedCount += 1
      continue
    }

    tokensUsed += itemTokens
    if (isPrimarySource(item.source)) {
      primary.push(item)
    } else {
      supporting.push(item)
    }
  }

  const excluded: ExclusionSummary[] =
    excludedCount > 0 ? [{ reason: BUDGET_EXCLUSION_REASON, count: excludedCount }] : []

  return { primary, supporting, excluded }
}
