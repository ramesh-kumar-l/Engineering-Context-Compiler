import type { EvidenceItem } from '../types/evidence.js'

/**
 * Caps how many resolved symbols travel with a single evidence item, bounding its token
 * footprint - a file matched on many symbols only needs the most relevant few to be useful
 * context, not an exhaustive list. Symbols arrive pre-ordered by their retriever/ranker, so
 * truncation keeps the front of the list.
 */
export const MAX_SYMBOLS_PER_ITEM = 8

/**
 * Compresses a single evidence item for inclusion in a token-budgeted context package.
 * Returns a new object (never mutates the input) with `symbols` truncated if needed; every
 * other field passes through unchanged.
 */
export function compressEvidenceItem(item: EvidenceItem): EvidenceItem {
  if (!item.symbols || item.symbols.length <= MAX_SYMBOLS_PER_ITEM) {
    return item
  }
  return { ...item, symbols: item.symbols.slice(0, MAX_SYMBOLS_PER_ITEM) }
}
