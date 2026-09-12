import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

const skillPath = fileURLToPath(new URL('../../skills/ecc-context/SKILL.md', import.meta.url))
const skill = readFileSync(skillPath, 'utf8')

describe('ecc-context skill doc', () => {
  it('has valid frontmatter with a name and description', () => {
    const frontmatter = skill.match(/^---\n([\s\S]*?)\n---/)
    expect(frontmatter).not.toBeNull()
    expect(frontmatter?.[1]).toMatch(/^name:\s*ecc-context\s*$/m)
    expect(frontmatter?.[1]).toMatch(/^description:\s*.+/m)
  })

  it('documents the actual CLI invocation and flags', () => {
    expect(skill).toContain('context "<task description>"')
    expect(skill).toContain('--path')
    expect(skill).toContain('--out')
    expect(skill).toContain('--budget')
  })

  it('documents the context package fields an agent must read', () => {
    expect(skill).toContain('context.primary')
    expect(skill).toContain('context.supporting')
    expect(skill).toContain('conflicts')
    expect(skill).toContain('trustLevel')
  })

  it('stays under the 300-line modularity limit', () => {
    const lineCount = skill.split('\n').length
    expect(lineCount).toBeLessThan(300)
  })
})
