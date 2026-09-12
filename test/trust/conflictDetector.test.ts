import { describe, expect, it } from 'vitest'
import { detectConflicts } from '../../src/core/trust/conflictDetector.js'
import type { TrustedEvidenceItem } from '../../src/core/types/trust.js'

function trusted(partial: Partial<TrustedEvidenceItem>): TrustedEvidenceItem {
  return { source: 'code', relevance: 0.5, trustLevel: 'fact', ...partial }
}

describe('detectConflicts', () => {
  it('surfaces items that share a subject but disagree on trust level', () => {
    const items = [
      trusted({ source: 'code', path: 'a.ts', trustLevel: 'fact' }),
      trusted({ source: 'memory', path: 'a.ts', trustLevel: 'inference' }),
    ]

    const conflicts = detectConflicts(items)

    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]?.subject).toBe('a.ts')
    expect(conflicts[0]?.items).toHaveLength(2)
  })

  it('does not flag items sharing a subject with the same trust level', () => {
    const items = [
      trusted({ source: 'git', path: 'a.ts', trustLevel: 'fact' }),
      trusted({ source: 'git', path: 'a.ts', trustLevel: 'fact' }),
    ]

    expect(detectConflicts(items)).toEqual([])
  })

  it('groups by identifier when path is absent', () => {
    const items = [
      trusted({ source: 'git', identifier: 'fix-1', trustLevel: 'fact' }),
      trusted({ source: 'memory', identifier: 'fix-1', trustLevel: 'inference' }),
    ]

    const conflicts = detectConflicts(items)
    expect(conflicts).toHaveLength(1)
    expect(conflicts[0]?.subject).toBe('fix-1')
  })

  it('ignores items with no path or identifier to group by', () => {
    const items = [
      trusted({ trustLevel: 'fact' }),
      trusted({ trustLevel: 'unknown' }),
    ]

    expect(detectConflicts(items)).toEqual([])
  })

  it('returns no conflicts for a single item per subject', () => {
    const items = [trusted({ path: 'only.ts', trustLevel: 'derived' })]
    expect(detectConflicts(items)).toEqual([])
  })
})
