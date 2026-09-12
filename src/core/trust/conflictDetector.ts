import type { EvidenceConflict, TrustedEvidenceItem } from '../types/trust.js'

function subjectKey(item: TrustedEvidenceItem): string | undefined {
  return item.path ?? item.identifier
}

/**
 * Surfaces evidence items that share a subject (file path or identifier) but were classified
 * at different trust levels, instead of letting one silently stand in for the other in a
 * compiled package. Detection is structural (same subject, differing trustLevel) - ECC has no
 * semantic diff capability yet to compare claim content directly.
 */
export function detectConflicts(items: TrustedEvidenceItem[]): EvidenceConflict[] {
  const bySubject = new Map<string, TrustedEvidenceItem[]>()

  for (const item of items) {
    const subject = subjectKey(item)
    if (!subject) {
      continue
    }
    const group = bySubject.get(subject)
    if (group) {
      group.push(item)
    } else {
      bySubject.set(subject, [item])
    }
  }

  const conflicts: EvidenceConflict[] = []
  for (const [subject, group] of bySubject) {
    const distinctTrustLevels = new Set(group.map((entry) => entry.trustLevel))
    if (distinctTrustLevels.size > 1) {
      conflicts.push({ subject, items: group })
    }
  }

  return conflicts
}
