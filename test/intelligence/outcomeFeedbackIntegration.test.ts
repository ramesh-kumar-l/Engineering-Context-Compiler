import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { runContext } from '../../src/cli/runContext.js'
import { recordMemoryEntry } from '../../src/core/memory/memoryStore.js'
import type { EngineeringContextPackage } from '../../src/core/types/contextPackage.js'

let repoRoot: string

beforeEach(() => {
  repoRoot = mkdtempSync(join(tmpdir(), 'ecc-outcome-integration-'))
  writeFileSync(join(repoRoot, 'index.ts'), 'export const unrelated = 1\n')
})

afterEach(() => {
  rmSync(repoRoot, { recursive: true, force: true })
})

function memoryItems(pkg: EngineeringContextPackage) {
  return [...pkg.context.primary, ...pkg.context.supporting].filter((item) => item.source === 'memory')
}

describe('runContext (Phase 16: outcome feedback closes the loop end-to-end)', () => {
  it('lowers a memory entry\'s relevance in a later compilation after a negative outcome is recorded against its paths', async () => {
    recordMemoryEntry(repoRoot, {
      type: 'decision',
      summary: 'Decided to cache API responses',
      tags: ['cache'],
      relatedPaths: ['src/internal/store.ts'],
    })

    const before = await runContext(repoRoot, 'why do we cache api responses')
    const beforeItems = memoryItems(before)
    expect(beforeItems).toHaveLength(1)
    expect(beforeItems[0]?.relevance).toBe(1)

    recordMemoryEntry(repoRoot, {
      type: 'outcome',
      signal: 'negative',
      relatedPaths: ['src/internal/store.ts'],
      summary: 'regression noticed after the change',
    })

    const after = await runContext(repoRoot, 'why do we cache api responses')
    const afterItems = memoryItems(after)

    // The outcome entry itself has zero keyword overlap with the request, so it must not
    // surface as a second memory item - only its effect on the decision's relevance should.
    expect(afterItems).toHaveLength(1)
    expect(afterItems[0]?.relevance).toBeLessThan(beforeItems[0]?.relevance ?? 1)
    expect(afterItems[0]?.relevance).toBeCloseTo(0.9, 5)
  })
})
