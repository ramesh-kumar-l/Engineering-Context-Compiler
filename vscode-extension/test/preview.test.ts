import { describe, it, expect } from 'vitest'
import { renderPreviewHtml } from '../src/preview.js'
import type { EngineeringContextPackage } from '../../src/core/types/contextPackage.js'

function buildPackage(overrides: Partial<EngineeringContextPackage> = {}): EngineeringContextPackage {
  return {
    version: '0.1',
    task: { type: 'explain', request: 'explain the utils module' },
    repository: { name: 'sample-repo', commit: 'abc123' },
    context: {
      primary: [{ source: 'code', path: 'src/utils.ts', relevance: 0.9, trustLevel: 'fact' }],
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

describe('renderPreviewHtml', () => {
  it('renders task, repository, and primary evidence', () => {
    const html = renderPreviewHtml(buildPackage())

    expect(html).toContain('explain')
    expect(html).toContain('sample-repo')
    expect(html).toContain('src/utils.ts')
    expect(html).toContain('trust-fact')
  })

  it('shows "none" for empty evidence lists', () => {
    const html = renderPreviewHtml(buildPackage({ context: { primary: [], supporting: [] } }))

    expect(html).toContain('none')
  })

  it('renders conflicts/unknowns/excluded sections only when present', () => {
    const withExtras = renderPreviewHtml(
      buildPackage({
        conflicts: [
          {
            subject: 'src/x.ts',
            items: [
              { source: 'code', path: 'src/x.ts', relevance: 0.5, trustLevel: 'fact' },
              { source: 'git', path: 'src/x.ts', relevance: 0.5, trustLevel: 'derived' },
            ],
          },
        ],
        unknowns: ['no tests found'],
        excluded: [{ reason: 'token_budget_exceeded', count: 2 }],
      }),
    )
    expect(withExtras).toContain('Conflicts')
    expect(withExtras).toContain('no tests found')
    expect(withExtras).toContain('token_budget_exceeded')

    const withoutExtras = renderPreviewHtml(buildPackage())
    expect(withoutExtras).not.toContain('Conflicts')
  })

  it('escapes HTML in free-text fields to prevent injection into the webview', () => {
    const html = renderPreviewHtml(
      buildPackage({ task: { type: 'explain', request: '<script>alert(1)</script>' } }),
    )

    expect(html).not.toContain('<script>alert(1)</script>')
    expect(html).toContain('&lt;script&gt;')
  })
})
