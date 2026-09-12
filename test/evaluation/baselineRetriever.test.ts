import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { retrieveBaselineEvidence } from '../../src/core/evaluation/baselineRetriever.js'

const FIXTURE_ROOT = fileURLToPath(new URL('../fixtures/sample-repo', import.meta.url))

describe('retrieveBaselineEvidence (agent-alone simulation, no ECC)', () => {
  it('finds a file by naive path-keyword match, reading it whole', async () => {
    const result = await retrieveBaselineEvidence(FIXTURE_ROOT, 'explain the utils module', 4000)

    expect(result.paths).toContain('src/utils.ts')
    expect(result.totalTokens).toBeGreaterThan(0)
  })

  it('returns nothing for a request with no keyword overlap in the repo', async () => {
    const result = await retrieveBaselineEvidence(FIXTURE_ROOT, 'zzznomatch qqqkeyword', 4000)

    expect(result.paths).toEqual([])
    expect(result.totalTokens).toBe(0)
  })

  it('stops reading further files once the token budget is exhausted', async () => {
    const result = await retrieveBaselineEvidence(FIXTURE_ROOT, 'explain the utils module', 1)

    expect(result.paths.length).toBeLessThanOrEqual(1)
  })
})
