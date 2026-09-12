import { describe, expect, it } from 'vitest'
import { assessRisk } from '../../src/core/verification/riskAssessor.js'
import type { EngineeringTask } from '../../src/core/types/task.js'
import type { EvidenceConflict, TrustedEvidenceItem } from '../../src/core/types/trust.js'

function task(type: EngineeringTask['type']): EngineeringTask {
  return { type, request: 'irrelevant for scoring' }
}

function trusted(partial: Partial<TrustedEvidenceItem>): TrustedEvidenceItem {
  return { source: 'code', relevance: 0.5, trustLevel: 'fact', ...partial }
}

describe('assessRisk', () => {
  it('scores a low-effort task with tested code as low risk', () => {
    const primary = [trusted({ source: 'code', path: 'a.ts' })]
    const supporting = [trusted({ source: 'test', path: 'a.test.ts' })]

    const result = assessRisk(task('explain'), primary, supporting, [])

    expect(result.level).toBe('low')
    expect(result.factors).toEqual([])
  })

  it('raises risk for a behavior-changing task type', () => {
    const primary = [trusted({ source: 'code', path: 'a.ts' })]
    const supporting = [trusted({ source: 'test', path: 'a.test.ts' })]

    const result = assessRisk(task('refactor'), primary, supporting, [])

    expect(result.score).toBeGreaterThan(assessRisk(task('explain'), primary, supporting, []).score)
  })

  it('flags missing test evidence for touched code', () => {
    const primary = [trusted({ source: 'code', path: 'a.ts' })]

    const result = assessRisk(task('modify'), primary, [], [])

    expect(result.factors).toContain('no test evidence found for the affected code')
  })

  it('flags low-trust primary evidence', () => {
    const primary = [trusted({ source: 'memory', identifier: 'note', trustLevel: 'inference' })]

    const result = assessRisk(task('explain'), primary, [], [])

    expect(result.factors.some((f) => f.includes('low-trust evidence'))).toBe(true)
  })

  it('flags surfaced conflicts', () => {
    const conflicts: EvidenceConflict[] = [
      { subject: 'a.ts', items: [trusted({ path: 'a.ts', trustLevel: 'fact' })] },
    ]

    const result = assessRisk(task('explain'), [], [], conflicts)

    expect(result.factors.some((f) => f.includes('conflict(s)'))).toBe(true)
  })

  it('reaches high risk when several risk factors stack up', () => {
    const primary = Array.from({ length: 7 }, (_, i) =>
      trusted({ source: 'code', path: `f${i}.ts`, trustLevel: 'unknown' }),
    )
    const conflicts: EvidenceConflict[] = [
      { subject: 'f0.ts', items: [trusted({ path: 'f0.ts' })] },
    ]

    const result = assessRisk(task('refactor'), primary, [], conflicts)

    expect(result.level).toBe('high')
  })
})
