import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { runMemoryCommand } from '../../src/cli/memoryCommand.js'
import { loadMemoryEntries } from '../../src/core/memory/memoryStore.js'

let repoRoot: string

beforeEach(() => {
  repoRoot = mkdtempSync(join(tmpdir(), 'ecc-memory-command-'))
})

afterEach(() => {
  rmSync(repoRoot, { recursive: true, force: true })
  vi.restoreAllMocks()
})

describe('runMemoryCommand', () => {
  it('records a valid entry and returns exit code 0', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const exitCode = runMemoryCommand({ type: 'decision', summary: 'use fetch', path: repoRoot })

    expect(exitCode).toBe(0)
    expect(logSpy).toHaveBeenCalledTimes(1)
    expect(loadMemoryEntries(repoRoot)).toHaveLength(1)
  })

  it('fails with a usage message when --type is missing or invalid', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(runMemoryCommand({ summary: 'x', path: repoRoot })).toBe(1)
    expect(runMemoryCommand({ type: 'bogus', summary: 'x', path: repoRoot })).toBe(1)
    expect(errorSpy).toHaveBeenCalledTimes(2)
    expect(loadMemoryEntries(repoRoot)).toEqual([])
  })

  it('fails with a usage message when --summary is missing', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const exitCode = runMemoryCommand({ type: 'incident', path: repoRoot })

    expect(exitCode).toBe(1)
    expect(errorSpy).toHaveBeenCalled()
    expect(loadMemoryEntries(repoRoot)).toEqual([])
  })

  it('records an outcome entry with a valid --signal', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const exitCode = runMemoryCommand({
      type: 'outcome',
      summary: 'the caching change reduced latency',
      relatedPaths: ['src/cache.ts'],
      signal: 'positive',
      path: repoRoot,
    })

    expect(exitCode).toBe(0)
    expect(logSpy).toHaveBeenCalledTimes(1)
    expect(loadMemoryEntries(repoRoot)).toMatchObject([{ signal: 'positive' }])
  })

  it('fails with a usage message when --signal is invalid', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const exitCode = runMemoryCommand({
      type: 'outcome',
      summary: 'x',
      signal: 'great',
      path: repoRoot,
    })

    expect(exitCode).toBe(1)
    expect(errorSpy).toHaveBeenCalled()
    expect(loadMemoryEntries(repoRoot)).toEqual([])
  })
})
