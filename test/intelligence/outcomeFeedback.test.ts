import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  computeOutcomeAdjustments,
  loadOutcomeAdjustments,
  OUTCOME_ADJUSTMENT_CAP,
} from '../../src/core/intelligence/outcomeFeedback.js'
import { recordMemoryEntry } from '../../src/core/memory/memoryStore.js'
import type { MemoryEntry } from '../../src/core/memory/types.js'

function entry(overrides: Partial<MemoryEntry> = {}): MemoryEntry {
  return {
    id: 'e1',
    type: 'outcome',
    summary: 'the refactor caused a regression',
    timestamp: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('computeOutcomeAdjustments', () => {
  it('returns an empty map when there are no entries', () => {
    expect(computeOutcomeAdjustments([]).size).toBe(0)
  })

  it('ignores decision/incident entries even if they carry a signal', () => {
    const adjustments = computeOutcomeAdjustments([
      entry({ type: 'decision', signal: 'positive', relatedPaths: ['src/a.ts'] }),
      entry({ type: 'incident', signal: 'negative', relatedPaths: ['src/a.ts'] }),
    ])
    expect(adjustments.size).toBe(0)
  })

  it('ignores outcome entries with no signal', () => {
    const adjustments = computeOutcomeAdjustments([entry({ relatedPaths: ['src/a.ts'] })])
    expect(adjustments.size).toBe(0)
  })

  it('ignores outcome entries with no related paths', () => {
    const adjustments = computeOutcomeAdjustments([entry({ signal: 'positive' })])
    expect(adjustments.size).toBe(0)
  })

  it('accumulates a positive signal for every related path', () => {
    const adjustments = computeOutcomeAdjustments([
      entry({ signal: 'positive', relatedPaths: ['src/a.ts', 'src/b.ts'] }),
    ])
    expect(adjustments.get('src/a.ts')).toBe(1)
    expect(adjustments.get('src/b.ts')).toBe(1)
  })

  it('accumulates a negative signal separately from a positive one', () => {
    const adjustments = computeOutcomeAdjustments([
      entry({ id: 'good', signal: 'positive', relatedPaths: ['src/a.ts'] }),
      entry({ id: 'bad', signal: 'negative', relatedPaths: ['src/b.ts'] }),
    ])
    expect(adjustments.get('src/a.ts')).toBe(1)
    expect(adjustments.get('src/b.ts')).toBe(-1)
  })

  it('nets repeated signals for the same path', () => {
    const adjustments = computeOutcomeAdjustments([
      entry({ id: '1', signal: 'positive', relatedPaths: ['src/a.ts'] }),
      entry({ id: '2', signal: 'positive', relatedPaths: ['src/a.ts'] }),
      entry({ id: '3', signal: 'negative', relatedPaths: ['src/a.ts'] }),
    ])
    expect(adjustments.get('src/a.ts')).toBe(1)
  })

  it('caps accumulation at +-OUTCOME_ADJUSTMENT_CAP regardless of how many entries pile up', () => {
    const entries = Array.from({ length: 10 }, (_, i) =>
      entry({ id: `pos-${i}`, signal: 'positive', relatedPaths: ['src/a.ts'] }),
    )
    const adjustments = computeOutcomeAdjustments(entries)
    expect(adjustments.get('src/a.ts')).toBe(OUTCOME_ADJUSTMENT_CAP)
  })
})

describe('loadOutcomeAdjustments', () => {
  let repoRoot: string

  beforeEach(() => {
    repoRoot = mkdtempSync(join(tmpdir(), 'ecc-outcome-feedback-'))
  })

  afterEach(() => {
    rmSync(repoRoot, { recursive: true, force: true })
  })

  it('returns an empty map for a repository with no recorded memory', () => {
    expect(loadOutcomeAdjustments(repoRoot).size).toBe(0)
  })

  it('reflects a recorded outcome entry immediately', () => {
    recordMemoryEntry(repoRoot, {
      type: 'outcome',
      summary: 'the caching change reduced latency',
      signal: 'positive',
      relatedPaths: ['src/cache.ts'],
    })

    expect(loadOutcomeAdjustments(repoRoot).get('src/cache.ts')).toBe(1)
  })
})
