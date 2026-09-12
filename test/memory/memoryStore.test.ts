import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { loadMemoryEntries, memoryFilePath, recordMemoryEntry } from '../../src/core/memory/memoryStore.js'

let repoRoot: string

beforeEach(() => {
  repoRoot = mkdtempSync(join(tmpdir(), 'ecc-memory-store-'))
})

afterEach(() => {
  rmSync(repoRoot, { recursive: true, force: true })
})

describe('loadMemoryEntries', () => {
  it('returns an empty array when no memory file exists yet', () => {
    expect(loadMemoryEntries(repoRoot)).toEqual([])
  })
})

describe('recordMemoryEntry', () => {
  it('creates .ecc/memory.json on first use and returns the recorded entry', () => {
    const entry = recordMemoryEntry(repoRoot, { type: 'decision', summary: 'Chose fetch over an SDK' })

    expect(entry.type).toBe('decision')
    expect(entry.summary).toBe('Chose fetch over an SDK')
    expect(entry.id).toBeTruthy()
    expect(entry.timestamp).toBeTruthy()
    expect(memoryFilePath(repoRoot)).toContain('.ecc')

    expect(loadMemoryEntries(repoRoot)).toEqual([entry])
  })

  it('appends subsequent entries with unique ids rather than overwriting', () => {
    const first = recordMemoryEntry(repoRoot, { type: 'decision', summary: 'first' })
    const second = recordMemoryEntry(repoRoot, {
      type: 'incident',
      summary: 'second',
      detail: 'more detail',
      tags: ['api'],
      relatedPaths: ['src/api.ts'],
    })

    expect(first.id).not.toBe(second.id)

    const entries = loadMemoryEntries(repoRoot)
    expect(entries).toHaveLength(2)
    expect(entries[1]).toMatchObject({
      type: 'incident',
      summary: 'second',
      detail: 'more detail',
      tags: ['api'],
      relatedPaths: ['src/api.ts'],
    })
  })
})

describe('loadMemoryEntries (corrupt/malformed store)', () => {
  it('returns an empty array rather than throwing on invalid JSON', () => {
    const filePath = memoryFilePath(repoRoot)
    mkdirSync(dirname(filePath), { recursive: true })
    writeFileSync(filePath, 'not json{', 'utf8')

    expect(loadMemoryEntries(repoRoot)).toEqual([])
  })

  it('returns an empty array when the file contains a non-array JSON value', () => {
    const filePath = memoryFilePath(repoRoot)
    mkdirSync(dirname(filePath), { recursive: true })
    writeFileSync(filePath, JSON.stringify({ not: 'an array' }), 'utf8')

    expect(loadMemoryEntries(repoRoot)).toEqual([])
  })
})
