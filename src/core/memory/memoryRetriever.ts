import type { EngineeringTask } from '../types/task.js'
import type { EvidenceItem } from '../types/evidence.js'
import type { MemoryEntry } from './types.js'
import { extractKeywords } from '../evidence/keywordExtractor.js'

/** Floors a matched entry's relevance so a single loose keyword hit isn't ranked to near-zero. */
export const MEMORY_RELEVANCE_FLOOR = 0.2

/**
 * Scales a matched entry's accumulated outcome adjustment (Phase 16, capped at
 * +-OUTCOME_ADJUSTMENT_CAP in `src/core/intelligence/outcomeFeedback.ts`) into a relevance
 * nudge - an entry tied to paths with a history of negative outcomes surfaces as slightly less
 * relevant next time, and vice versa for positive outcomes.
 */
export const MEMORY_ADJUSTMENT_WEIGHT = 0.1

function entryKeywords(entry: MemoryEntry): Set<string> {
  const text = [
    entry.summary,
    entry.detail ?? '',
    ...(entry.tags ?? []),
    ...(entry.relatedPaths ?? []),
  ].join(' ')
  return new Set(extractKeywords(text))
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

/** Averages accumulated outcome adjustments across an entry's related paths; 0 with none. */
function outcomeAdjustmentFor(paths: string[] | undefined, adjustments: Map<string, number>): number {
  if (!paths || paths.length === 0 || adjustments.size === 0) return 0
  const sum = paths.reduce((total, path) => total + (adjustments.get(path) ?? 0), 0)
  return sum / paths.length
}

/**
 * Retrieves persisted decisions/incidents/outcomes (Phase 14's memory store) relevant to a
 * task's free-text request, using the same keyword-overlap heuristic Phase 4's code retriever
 * uses (see codeEvidenceRetriever.ts). An entry with zero keyword overlap is dropped entirely
 * rather than kept at a token cost with nothing to show for it. Trust classification (Phase 7)
 * already maps `source: 'memory'` to `inference` - ECC's own prior judgment, not re-verified -
 * so no trust logic lives here.
 *
 * `outcomeAdjustments` (Phase 16, default empty so pre-Phase-16 callers are unaffected) nudges
 * relevance for entries whose `relatedPaths` have accumulated positive/negative outcome
 * feedback - this is the "memory quality" half of Phase 16's feedback loop: a decision tied to
 * a path that later had a bad outcome recorded against it surfaces slightly less prominently
 * next time, without ever being dropped outright.
 */
export function retrieveMemoryEvidence(
  task: EngineeringTask,
  entries: MemoryEntry[],
  outcomeAdjustments: Map<string, number> = new Map(),
): EvidenceItem[] {
  const keywords = extractKeywords(task.request)
  if (keywords.length === 0 || entries.length === 0) {
    return []
  }

  const items: EvidenceItem[] = []
  for (const entry of entries) {
    const words = entryKeywords(entry)
    const matched = keywords.filter((keyword) => words.has(keyword))
    if (matched.length === 0) {
      continue
    }

    const baseRelevance = Math.max(MEMORY_RELEVANCE_FLOOR, matched.length / keywords.length)
    const adjustment = outcomeAdjustmentFor(entry.relatedPaths, outcomeAdjustments) * MEMORY_ADJUSTMENT_WEIGHT

    items.push({
      source: 'memory',
      identifier: entry.summary,
      relevance: clamp01(baseRelevance + adjustment),
      provenance: {
        source: 'memory',
        identifier: entry.id,
        timestamp: entry.timestamp,
      },
    })
  }

  return items.sort((a, b) => b.relevance - a.relevance)
}
