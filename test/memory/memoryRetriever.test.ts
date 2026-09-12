import { describe, expect, it } from 'vitest'
import { retrieveMemoryEvidence, MEMORY_RELEVANCE_FLOOR } from '../../src/core/memory/memoryRetriever.js'
import type { MemoryEntry } from '../../src/core/memory/types.js'

function entry(overrides: Partial<MemoryEntry> = {}): MemoryEntry {
  return {
    id: 'entry-1',
    type: 'decision',
    summary: 'Chose fetch over an SDK for the GitHub integration',
    timestamp: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('retrieveMemoryEvidence', () => {
  it('returns an empty array when there are no keywords in the request', () => {
    expect(retrieveMemoryEvidence({ type: 'explain', request: 'is a to' }, [entry()])).toEqual([])
  })

  it('returns an empty array when there are no stored entries', () => {
    expect(retrieveMemoryEvidence({ type: 'explain', request: 'explain the github integration' }, [])).toEqual([])
  })

  it('drops entries with zero keyword overlap', () => {
    const result = retrieveMemoryEvidence(
      { type: 'explain', request: 'explain the widget rendering logic' },
      [entry()],
    )
    expect(result).toEqual([])
  })

  it('matches an entry by keyword overlap against its summary/detail/tags/paths', () => {
    const result = retrieveMemoryEvidence(
      { type: 'explain', request: 'why did we choose fetch for the github integration' },
      [entry()],
    )

    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({
      source: 'memory',
      identifier: entry().summary,
      provenance: { source: 'memory', identifier: 'entry-1', timestamp: '2026-01-01T00:00:00.000Z' },
    })
    expect(result[0]?.relevance).toBeGreaterThanOrEqual(MEMORY_RELEVANCE_FLOOR)
    expect(result[0]?.relevance).toBeLessThanOrEqual(1)
  })

  it('floors relevance for a single loose match rather than ranking it near zero', () => {
    const result = retrieveMemoryEvidence(
      { type: 'explain', request: 'explain the github rate limiter caching retry queue behavior' },
      [entry()],
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.relevance).toBe(MEMORY_RELEVANCE_FLOOR)
  })

  it('sorts multiple matched entries by descending relevance', () => {
    const weak = entry({ id: 'weak', summary: 'github something unrelated' })
    const strong = entry({ id: 'strong', summary: 'fetch github integration decision rationale' })

    const result = retrieveMemoryEvidence(
      { type: 'explain', request: 'explain the fetch github integration decision rationale' },
      [weak, strong],
    )

    expect(result.map((item) => item.provenance?.identifier)).toEqual(['strong', 'weak'])
  })

  it('matches via tags and relatedPaths, not just summary/detail', () => {
    const tagged = entry({
      id: 'tagged',
      summary: 'Unrelated summary text',
      tags: ['ratelimit'],
      relatedPaths: ['src/github/githubCommentClient.ts'],
    })

    const result = retrieveMemoryEvidence(
      { type: 'explain', request: 'investigate ratelimit issues in githubCommentClient' },
      [tagged],
    )

    expect(result).toHaveLength(1)
  })
})
