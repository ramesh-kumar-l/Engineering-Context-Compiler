import type { EvidenceItem } from '../types/evidence.js'

/**
 * Rough chars-per-token ratio for English/code text (~4 is the commonly cited rule of thumb
 * for GPT-family tokenizers). Deliberately approximate - see 04-decisions.md #12: a real
 * tokenizer would add a heavy, model-specific dependency just to keep a budget guard "in the
 * right ballpark," which this estimate already achieves without one.
 */
const CHARS_PER_TOKEN = 4

/** Flat per-item overhead for serialization structure (JSON keys, quoting, nesting). */
const ITEM_TOKEN_OVERHEAD = 12

/** Default token budget for a compiled context package's evidence section. */
export const DEFAULT_TOKEN_BUDGET = 4000

export function estimateTokens(text: string): number {
  if (text.length === 0) return 0
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}

/** Estimates one evidence item's footprint from its identifying text fields plus overhead. */
export function estimateItemTokens(item: EvidenceItem): number {
  const content = [item.path, item.identifier, ...(item.symbols ?? [])]
    .filter((part): part is string => Boolean(part))
    .join(' ')
  return ITEM_TOKEN_OVERHEAD + estimateTokens(content)
}
