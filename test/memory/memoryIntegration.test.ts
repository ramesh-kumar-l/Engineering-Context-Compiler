import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { analyzeRepository } from '../../src/core/repository/repositoryAnalyzer.js'
import { retrieveEvidence } from '../../src/core/evidence/evidenceRetriever.js'
import { recordMemoryEntry } from '../../src/core/memory/memoryStore.js'

let repoRoot: string

beforeEach(() => {
  repoRoot = mkdtempSync(join(tmpdir(), 'ecc-memory-integration-'))
  writeFileSync(join(repoRoot, 'widget.ts'), 'export function renderWidget(): string {\n  return "widget"\n}\n')
})

afterEach(() => {
  rmSync(repoRoot, { recursive: true, force: true })
})

describe('retrieveEvidence + memory (end-to-end)', () => {
  it('surfaces a persisted memory entry as evidence relevant to a later task', async () => {
    recordMemoryEntry(repoRoot, {
      type: 'decision',
      summary: 'Decided to render the widget synchronously for simplicity',
      tags: ['widget'],
    })

    const repository = await analyzeRepository(repoRoot)
    const evidence = retrieveEvidence(
      { type: 'explain', request: 'why does the widget render synchronously' },
      repository,
    )

    const memoryItems = evidence.filter((item) => item.source === 'memory')
    expect(memoryItems).toHaveLength(1)
    expect(memoryItems[0]?.identifier).toBe('Decided to render the widget synchronously for simplicity')
  })

  it('never walks .ecc into the repository analysis as a classified file', async () => {
    recordMemoryEntry(repoRoot, { type: 'incident', summary: 'unrelated incident' })
    mkdirSync(join(repoRoot, '.ecc'), { recursive: true })

    const repository = await analyzeRepository(repoRoot)
    expect(repository.files.some((f) => f.path.startsWith('.ecc/'))).toBe(false)
  })

  it('returns no memory evidence when nothing has been recorded yet', async () => {
    const repository = await analyzeRepository(repoRoot)
    const evidence = retrieveEvidence({ type: 'explain', request: 'explain the widget renderer' }, repository)

    expect(evidence.some((item) => item.source === 'memory')).toBe(false)
  })
})
