import { describe, expect, it } from 'vitest'
import { planVerification } from '../../src/core/verification/verificationPlanner.js'
import type { EngineeringTask } from '../../src/core/types/task.js'
import type { EvidenceConflict, TrustedEvidenceItem } from '../../src/core/types/trust.js'

function task(type: EngineeringTask['type']): EngineeringTask {
  return { type, request: 'irrelevant for planning' }
}

function trusted(partial: Partial<TrustedEvidenceItem>): TrustedEvidenceItem {
  return { source: 'code', relevance: 0.5, trustLevel: 'fact', ...partial }
}

describe('planVerification', () => {
  it('always leads with the assessed risk level', () => {
    const steps = planVerification(task('explain'), [], [], [])
    expect(steps[0]).toMatch(/^Risk: low/)
  })

  it('recommends running existing tests when test evidence is present', () => {
    const primary = [trusted({ source: 'code', path: 'a.ts' })]
    const supporting = [trusted({ source: 'test', path: 'a.test.ts' })]

    const steps = planVerification(task('modify'), primary, supporting, [])

    expect(steps.some((s) => s.includes('Run the existing tests') && s.includes('a.test.ts'))).toBe(true)
  })

  it('recommends adding test coverage when none exists for touched code', () => {
    const primary = [trusted({ source: 'code', path: 'a.ts' })]

    const steps = planVerification(task('modify'), primary, [], [])

    expect(steps.some((s) => s.includes('add test coverage before merging'))).toBe(true)
  })

  it('does not suggest test coverage steps when there is no code evidence at all', () => {
    const steps = planVerification(task('explain'), [], [], [])
    expect(steps.some((s) => s.includes('test'))).toBe(false)
  })

  it('adds a peer-review and conflict-resolution step at high risk', () => {
    const primary = Array.from({ length: 7 }, (_, i) =>
      trusted({ source: 'code', path: `f${i}.ts`, trustLevel: 'unknown' }),
    )
    const conflicts: EvidenceConflict[] = [
      { subject: 'f0.ts', items: [trusted({ path: 'f0.ts' })] },
    ]

    const steps = planVerification(task('refactor'), primary, [], conflicts)

    expect(steps[0]).toMatch(/^Risk: high/)
    expect(steps).toContain('Request a peer review before merging')
    expect(steps).toContain('Resolve the surfaced conflicts before proceeding')
  })

  it('does not add peer-review steps at low risk', () => {
    const steps = planVerification(task('explain'), [], [], [])
    expect(steps.some((s) => s.includes('peer review'))).toBe(false)
  })
})
