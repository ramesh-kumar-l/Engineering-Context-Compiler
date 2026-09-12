import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { runContext } from '../../src/cli/runContext.js'
import { validateContextPackage } from '../../src/core/schema/validate.js'

const FIXTURE_ROOT = fileURLToPath(new URL('../fixtures/sample-repo', import.meta.url))

describe('runContext (fixture repo, real filesystem)', () => {
  it('produces a schema-valid EngineeringContextPackage end-to-end', async () => {
    const pkg = await runContext(FIXTURE_ROOT, 'explain the utils module')

    const validation = validateContextPackage(pkg)
    expect(validation.ok).toBe(true)
    expect(pkg.context.primary.length + pkg.context.supporting.length).toBeGreaterThan(0)
    for (const item of [...pkg.context.primary, ...pkg.context.supporting]) {
      expect(item.provenance).toBeDefined()
      expect(item.trustLevel).toBeDefined()
    }
  })

  it('classifies the task and carries the request and repository through unchanged', async () => {
    const pkg = await runContext(FIXTURE_ROOT, 'refactor the file classifier')

    expect(pkg.task.request).toBe('refactor the file classifier')
    expect(pkg.task.type).toBe('refactor')
    expect(pkg.repository.name).toBe('sample-repo')
  })

  it('honors a custom token budget by excluding what no longer fits', async () => {
    const pkg = await runContext(FIXTURE_ROOT, 'explain the utils module', { tokenBudget: 1 })

    expect(pkg.excluded.length).toBeGreaterThan(0)
  })
})
