import type { EvidenceItem, EvidenceProvenance } from '../types/evidence.js'

/**
 * Guarantees every evidence item carries a provenance pointer before it enters a compiled
 * package. Retrievers already attach provenance (Phase 4); this only reconstructs one from
 * fields already present on the item (source/path/identifier) when a caller-supplied item
 * omitted it - it never invents a fact that wasn't already on the item.
 */
export function ensureProvenance(item: EvidenceItem): EvidenceProvenance {
  if (item.provenance) {
    return item.provenance
  }
  return { source: item.source, path: item.path, identifier: item.identifier }
}
