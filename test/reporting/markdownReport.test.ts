import { describe, expect, it } from 'vitest'
import { renderMarkdownReport } from '../../src/reporting/markdownReport.js'
import type { EngineeringContextPackage } from '../../src/core/types/contextPackage.js'

function buildPackage(overrides: Partial<EngineeringContextPackage> = {}): EngineeringContextPackage {
  return {
    version: '0.1',
    task: { type: 'refactor', request: 'refactor the utils module' },
    repository: { name: 'sample-repo', commit: 'abc1234def5678' },
    context: {
      primary: [
        {
          source: 'code',
          path: 'src/utils.ts',
          relevance: 0.9,
          trustLevel: 'fact',
          provenance: { source: 'code', path: 'src/utils.ts' },
        },
      ],
      supporting: [],
    },
    conflicts: [],
    history: [],
    constraints: [],
    unknowns: [],
    verification: [],
    excluded: [],
    ...overrides,
  }
}

describe('renderMarkdownReport', () => {
  it('renders the task, repository, and primary evidence table', () => {
    const markdown = renderMarkdownReport(buildPackage())

    expect(markdown).toContain('refactor the utils module')
    expect(markdown).toContain('sample-repo')
    expect(markdown).toContain('abc1234')
    expect(markdown).toContain('src/utils.ts')
    expect(markdown).toContain('✅ fact')
  })

  it('shows "None" for empty primary evidence and collapses supporting evidence', () => {
    const markdown = renderMarkdownReport(buildPackage({ context: { primary: [], supporting: [] } }))

    expect(markdown).toContain('_None._')
    expect(markdown).toContain('<details><summary>Supporting evidence (0)</summary>')
  })

  it('renders conflicts, constraints, unknowns, verification, and excluded sections when present', () => {
    const markdown = renderMarkdownReport(
      buildPackage({
        conflicts: [
          {
            subject: 'src/utils.ts',
            items: [
              { source: 'code', relevance: 0.5, trustLevel: 'fact' },
              { source: 'git', relevance: 0.3, trustLevel: 'inference' },
            ],
          },
        ],
        constraints: [{ statement: 'Must not break the public API', provenance: { source: 'documentation' } }],
        unknowns: ['Whether callers depend on the old signature'],
        verification: ['Run the utils test suite'],
        excluded: [{ reason: 'over token budget', count: 3 }],
      }),
    )

    expect(markdown).toContain('⚠️ Conflicts')
    expect(markdown).toContain('Must not break the public API')
    expect(markdown).toContain('Whether callers depend on the old signature')
    expect(markdown).toContain('Run the utils test suite')
    expect(markdown).toContain('over token budget')
  })

  it('omits optional sections entirely when there is nothing to report', () => {
    const markdown = renderMarkdownReport(buildPackage())

    expect(markdown).not.toContain('⚠️ Conflicts')
    expect(markdown).not.toContain('### Constraints')
    expect(markdown).not.toContain('### Unknowns')
    expect(markdown).not.toContain('### Excluded')
  })
})
