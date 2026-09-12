import type { EngineeringTask } from '../types/task.js'
import type { EvidenceItem } from '../types/evidence.js'
import type { MemoryEntry } from './types.js'
import { extractKeywords } from '../evidence/keywordExtractor.js'

/** Floors a matched entry's relevance so a single loose keyword hit isn't ranked to near-zero. */
export const MEMORY_RELEVANCE_FLOOR = 0.2

function entryKeywords(entry: MemoryEntry): Set<string> {
  const text = [
    entry.summary,
    entry.detail ?? '',
    ...(entry.tags ?? []),
    ...(entry.relatedPaths ?? []),
  ].join(' ')
  return new Set(extractKeywords(text))
}

/**
 * Retrieves persisted decisions/incidents/outcomes (Phase 14's memory store) relevant to a
 * task's free-text request, using the same keyword-overlap heuristic Phase 4's code retriever
 * uses (see codeEvidenceRetriever.ts). An entry with zero keyword overlap is dropped entirely
 * rather than kept at a token cost with nothing to show for it. Trust classification (Phase 7)
 * already maps `source: 'memory'` to `inference` - ECC's own prior judgment, not re-verified -
 * so no trust logic lives here.
 */
export function retrieveMemoryEvidence(
  task: EngineeringTask,
  entries: MemoryEntry[],
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

    items.push({
      source: 'memory',
      identifier: entry.summary,
      relevance: Math.max(MEMORY_RELEVANCE_FLOOR, matched.length / keywords.length),
      provenance: {
        source: 'memory',
        identifier: entry.id,
        timestamp: entry.timestamp,
      },
    })
  }

  return items.sort((a, b) => b.relevance - a.relevance)
}
