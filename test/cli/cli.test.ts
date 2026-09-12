import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { runCli } from '../../src/cli/cli.js'
import { loadMemoryEntries } from '../../src/core/memory/memoryStore.js'

const FIXTURE_ROOT = fileURLToPath(new URL('../fixtures/sample-repo', import.meta.url))

afterEach(() => {
  vi.restoreAllMocks()
})

describe('runCli', () => {
  it('runs end-to-end and prints a valid context package as JSON', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})

    const exitCode = await runCli(['context', 'explain the utils module', '--path', FIXTURE_ROOT])

    expect(exitCode).toBe(0)
    expect(logSpy).toHaveBeenCalledTimes(1)
    const printed = logSpy.mock.calls[0]?.[0] as string
    const parsed = JSON.parse(printed)
    expect(parsed.task.request).toBe('explain the utils module')
    expect(parsed.repository.name).toBe('sample-repo')
    expect(Array.isArray(parsed.conflicts)).toBe(true)
  })

  it('prints usage and fails for an unknown command', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const exitCode = await runCli(['bogus'])

    expect(exitCode).toBe(1)
    expect(errorSpy).toHaveBeenCalled()
  })

  it('fails when no task description is given', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const exitCode = await runCli(['context', '--path', FIXTURE_ROOT])

    expect(exitCode).toBe(1)
    expect(errorSpy).toHaveBeenCalled()
  })

  it('records a memory entry via the memory command', async () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    const repoRoot = mkdtempSync(join(tmpdir(), 'ecc-cli-memory-'))

    try {
      const exitCode = await runCli([
        'memory',
        '--type',
        'decision',
        '--summary',
        'recorded via cli.test.ts',
        '--path',
        repoRoot,
      ])

      expect(exitCode).toBe(0)
      expect(logSpy).toHaveBeenCalledTimes(1)
      expect(loadMemoryEntries(repoRoot)).toHaveLength(1)
    } finally {
      rmSync(repoRoot, { recursive: true, force: true })
    }
  })
})
