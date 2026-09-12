import { describe, expect, it } from 'vitest'
import {
  createEmptyContextPackage,
  validateContextPackage,
  type EngineeringContextPackage,
} from '../../src/index.js'

describe('createEmptyContextPackage', () => {
  it('produces a package that satisfies the schema', () => {
    const pkg = createEmptyContextPackage(
      { type: 'debug', request: 'Investigate intermittent timeout' },
      { name: 'example', commit: 'abc123' },
    )

    const result = validateContextPackage(pkg)
    expect(result.ok).toBe(true)
  })
})

describe('validateContextPackage', () => {
  it('accepts a fully populated valid package', () => {
    const pkg: EngineeringContextPackage = {
      version: '0.1',
      task: { type: 'debug', request: 'Investigate intermittent PaymentService timeout' },
      repository: { name: 'example', commit: 'abc123' },
      context: {
        primary: [
          {
            source: 'code',
            path: 'src/payment/PaymentService.java',
            symbols: ['processPayment'],
            relevance: 0.98,
            trustLevel: 'fact',
          },
        ],
        supporting: [
          { source: 'git', identifier: 'abc123', relevance: 0.87, trustLevel: 'fact' },
        ],
      },
      conflicts: [],
      history: [
        {
          claim: 'Retry logic changed',
          trustLevel: 'fact',
          source: { type: 'commit', id: 'abc123' },
        },
      ],
      constraints: [
        {
          statement: 'Payment operations must remain idempotent',
          provenance: { source: 'documentation' },
        },
      ],
      unknowns: ['Production pool saturation not confirmed'],
      verification: ['Run PaymentServiceRetryIntegrationTest'],
      excluded: [{ reason: 'Low relevance', count: 43 }],
    }

    const result = validateContextPackage(pkg)
    expect(result.ok).toBe(true)
  })

  it('rejects a package with an out-of-range relevance score', () => {
    const pkg = createEmptyContextPackage(
      { type: 'explain', request: 'Explain auth flow' },
      { name: 'example', commit: 'abc123' },
    )
    pkg.context.primary.push({ source: 'code', relevance: 1.5, trustLevel: 'fact' })

    const result = validateContextPackage(pkg)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.errors.length).toBeGreaterThan(0)
    }
  })

  it('rejects an unknown task type', () => {
    const invalid = {
      ...createEmptyContextPackage(
        { type: 'explain', request: 'x' },
        { name: 'example', commit: 'abc123' },
      ),
      task: { type: 'not-a-real-type', request: 'x' },
    }

    const result = validateContextPackage(invalid)
    expect(result.ok).toBe(false)
  })

  it('rejects a non-object value without throwing', () => {
    const result = validateContextPackage(null)
    expect(result.ok).toBe(false)
  })
})
