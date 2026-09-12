import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { compileEngineeringContextTool } from '../../src/mcp/tool.js'
import { validateContextPackage } from '../../src/core/schema/validate.js'

const FIXTURE_ROOT = fileURLToPath(new URL('../fixtures/sample-repo', import.meta.url))

describe('compileEngineeringContextTool', () => {
  it('returns a schema-valid EngineeringContextPackage as text content', async () => {
    const result = await compileEngineeringContextTool({
      task: 'explain the utils module',
      path: FIXTURE_ROOT,
    })

    expect(result.isError).toBeFalsy()
    expect(result.content).toHaveLength(1)
    const first = result.content[0]
    expect(first?.type).toBe('text')
    const pkg = JSON.parse((first as { text: string }).text)
    expect(validateContextPackage(pkg).ok).toBe(true)
    expect(pkg.repository.name).toBe('sample-repo')
  })

  it('honors a custom token budget by excluding what no longer fits', async () => {
    const result = await compileEngineeringContextTool({
      task: 'explain the utils module',
      path: FIXTURE_ROOT,
      tokenBudget: 1,
    })

    const pkg = JSON.parse((result.content[0] as { text: string }).text)
    expect(pkg.excluded.length).toBeGreaterThan(0)
  })

  it('returns an MCP error result instead of throwing for an unreadable path', async () => {
    const result = await compileEngineeringContextTool({
      task: 'explain the utils module',
      path: fileURLToPath(new URL('../fixtures/does-not-exist', import.meta.url)),
    })

    expect(result.isError).toBe(true)
    expect((result.content[0] as { text: string }).text).toContain('ECC failed')
  })
})
