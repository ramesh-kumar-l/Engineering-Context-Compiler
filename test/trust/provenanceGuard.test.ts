import { describe, expect, it } from 'vitest'
import { ensureProvenance } from '../../src/core/trust/provenanceGuard.js'
import type { EvidenceItem } from '../../src/core/types/evidence.js'

describe('ensureProvenance', () => {
  it('returns the existing provenance untouched when present', () => {
    const item: EvidenceItem = {
      source: 'code',
      path: 'a.ts',
      relevance: 0.5,
      provenance: { source: 'code', path: 'a.ts', commit: 'deadbeef' },
    }

    expect(ensureProvenance(item)).toBe(item.provenance)
  })

  it('reconstructs provenance from the item source/path/identifier when missing', () => {
    const item: EvidenceItem = { source: 'git', identifier: 'fix: bug', relevance: 0.4 }

    expect(ensureProvenance(item)).toEqual({
      source: 'git',
      path: undefined,
      identifier: 'fix: bug',
    })
  })

  it('never invents a value not already present on the item', () => {
    const item: EvidenceItem = { source: 'memory', relevance: 0.2 }

    expect(ensureProvenance(item)).toEqual({
      source: 'memory',
      path: undefined,
      identifier: undefined,
    })
  })
})
