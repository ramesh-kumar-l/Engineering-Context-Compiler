import { describe, expect, it } from 'vitest'
import { classifyTrust, attachTrust } from '../../src/core/trust/trustClassifier.js'
import type { EvidenceItem } from '../../src/core/types/evidence.js'

describe('classifyTrust (known-good classifications)', () => {
  it('classifies a code item with a path as fact', () => {
    const item: EvidenceItem = {
      source: 'code',
      relevance: 0.9,
      provenance: { source: 'code', path: 'src/a.ts' },
    }
    expect(classifyTrust(item)).toBe('fact')
  })

  it('classifies a test item with a path as fact', () => {
    const item: EvidenceItem = {
      source: 'test',
      relevance: 0.8,
      provenance: { source: 'test', path: 'src/a.test.ts' },
    }
    expect(classifyTrust(item)).toBe('fact')
  })

  it('classifies a git item with a commit hash as fact', () => {
    const item: EvidenceItem = {
      source: 'git',
      relevance: 0.6,
      provenance: { source: 'git', path: 'src/a.ts', commit: 'abc123' },
    }
    expect(classifyTrust(item)).toBe('fact')
  })

  it('classifies a git item with no commit/identifier as derived', () => {
    const item: EvidenceItem = {
      source: 'git',
      relevance: 0.6,
      provenance: { source: 'git', path: 'src/a.ts' },
    }
    expect(classifyTrust(item)).toBe('derived')
  })

  it('classifies documentation/PR/issue/constraint items as derived', () => {
    for (const source of ['documentation', 'pr', 'issue', 'constraint'] as const) {
      const item: EvidenceItem = {
        source,
        relevance: 0.5,
        provenance: { source, identifier: 'doc-1' },
      }
      expect(classifyTrust(item)).toBe('derived')
    }
  })

  it('classifies memory items as inference', () => {
    const item: EvidenceItem = {
      source: 'memory',
      relevance: 0.4,
      provenance: { source: 'memory', identifier: 'past-decision-12' },
    }
    expect(classifyTrust(item)).toBe('inference')
  })

  it('classifies an item with no verifiable pointer as unknown', () => {
    const item: EvidenceItem = { source: 'runtime', relevance: 0.3 }
    expect(classifyTrust(item)).toBe('unknown')
  })

  it('classifies a code item whose provenance has no path as unknown', () => {
    const item: EvidenceItem = {
      source: 'code',
      relevance: 0.3,
      provenance: { source: 'code', identifier: 'no-path' },
    }
    expect(classifyTrust(item)).toBe('unknown')
  })
})

describe('attachTrust', () => {
  it('guarantees provenance and a trust level without mutating the input', () => {
    const item: EvidenceItem = { source: 'code', path: 'src/a.ts', relevance: 0.9 }

    const trusted = attachTrust(item)

    expect(item.provenance).toBeUndefined()
    expect(trusted.provenance).toEqual({ source: 'code', path: 'src/a.ts', identifier: undefined })
    expect(trusted.trustLevel).toBe('fact')
  })
})
