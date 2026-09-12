import type { MemoryEntry } from '../memory/types.js'
import { loadMemoryEntries } from '../memory/memoryStore.js'

/**
 * Caps how far a single path's accumulated outcome feedback can push its adjustment, so a
 * handful of repeated outcome entries about the same path can't dominate ranking/relevance
 * outright - it can only nudge, the same way Phase 15's risk floors only nudge a level rather
 * than gating on one signal alone.
 */
export const OUTCOME_ADJUSTMENT_CAP = 2

const SIGNAL_DELTA: Record<'positive' | 'negative', number> = { positive: 1, negative: -1 }

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

/**
 * Reduces persisted memory entries (Phase 14) to a per-path adjustment: how much positive vs.
 * negative outcome feedback has accumulated for each `relatedPaths` entry across every
 * `type: 'outcome'` entry that carries a `signal`. Decisions/incidents and signal-less outcomes
 * contribute nothing - this is deliberately the only place Phase 16 reads outcome feedback from,
 * so `evidenceRanker.ts`/`memoryRetriever.ts` stay plain consumers of a `Map<string, number>`
 * with no knowledge of memory entries at all.
 */
export function computeOutcomeAdjustments(entries: MemoryEntry[]): Map<string, number> {
  const adjustments = new Map<string, number>()

  for (const entry of entries) {
    if (entry.type !== 'outcome' || !entry.signal) continue

    const delta = SIGNAL_DELTA[entry.signal]
    for (const path of entry.relatedPaths ?? []) {
      const next = clamp((adjustments.get(path) ?? 0) + delta, -OUTCOME_ADJUSTMENT_CAP, OUTCOME_ADJUSTMENT_CAP)
      adjustments.set(path, next)
    }
  }

  return adjustments
}

/**
 * Convenience for pipeline orchestrators (`runContext.ts`, `evaluationRunner.ts`): loads a
 * repository's persisted memory and reduces it to outcome adjustments in one call, so neither
 * caller needs to know `computeOutcomeAdjustments` exists as a separate step.
 */
export function loadOutcomeAdjustments(repoRoot: string): Map<string, number> {
  return computeOutcomeAdjustments(loadMemoryEntries(repoRoot))
}
