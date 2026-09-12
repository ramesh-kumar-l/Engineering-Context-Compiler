import type { EvidenceItem } from '../types/evidence.js'
import type { TrustedEvidenceItem, TrustLevel } from '../types/trust.js'
import { ensureProvenance } from './provenanceGuard.js'

/**
 * Static per-source-type trust rules - a deterministic, inspectable table rather than a
 * learned model, matching the style of the authority-weight tables from earlier phases
 * (04-decisions.md #11/#12). No feedback loop exists yet (Phase 16) to train a model against.
 *
 * - fact: directly observed, independently verifiable state (a real file path, a real
 *   commit hash/identifier).
 * - derived: authored by people about the system (docs/PRs/issues) or an ECC-recorded
 *   constraint - true-ish, but an interpretation layer removed from raw system state.
 * - inference: ECC's own prior judgment carried forward (memory), not re-verified now.
 * - unknown: no verifiable pointer at all.
 *
 * Levels are never blurred with `relevance`/`confidence` (those measure fit and certainty,
 * not evidentiary kind) - this function's output is the only source of TrustLevel.
 */
function hasVerifiedPointer(item: EvidenceItem): boolean {
  const provenance = item.provenance
  return Boolean(provenance?.path ?? provenance?.identifier ?? provenance?.commit)
}

export function classifyTrust(item: EvidenceItem): TrustLevel {
  if (!hasVerifiedPointer(item)) {
    return 'unknown'
  }

  switch (item.source) {
    case 'code':
    case 'test':
      return item.provenance?.path ? 'fact' : 'unknown'
    case 'git':
    case 'ci':
    case 'incident':
    case 'runtime':
      return item.provenance?.commit ?? item.provenance?.identifier ? 'fact' : 'derived'
    case 'pr':
    case 'issue':
    case 'documentation':
    case 'constraint':
      return 'derived'
    case 'memory':
      return 'inference'
    default:
      return 'unknown'
  }
}

/** Attaches a guaranteed provenance pointer and an explicit trust level. Never mutates. */
export function attachTrust(item: EvidenceItem): TrustedEvidenceItem {
  const withProvenance = { ...item, provenance: ensureProvenance(item) }
  return { ...withProvenance, trustLevel: classifyTrust(withProvenance) }
}
