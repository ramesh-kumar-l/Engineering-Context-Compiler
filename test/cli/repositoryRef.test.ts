import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { resolveRepositoryRef } from '../../src/cli/repositoryRef.js'

function git(repoRoot: string, args: string[]): void {
  execFileSync('git', args, { cwd: repoRoot, stdio: 'ignore' })
}

let tempDirs: string[] = []

afterEach(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true })
  }
  tempDirs = []
})

describe('resolveRepositoryRef', () => {
  it('resolves the folder name and current commit hash for a git repository', () => {
    const repoRoot = mkdtempSync(join(tmpdir(), 'ecc-repo-ref-'))
    tempDirs.push(repoRoot)
    git(repoRoot, ['init', '--quiet'])
    git(repoRoot, ['config', 'user.email', 'test@example.com'])
    git(repoRoot, ['config', 'user.name', 'Test'])
    writeFileSync(join(repoRoot, 'a.txt'), 'hello\n')
    git(repoRoot, ['add', 'a.txt'])
    git(repoRoot, ['commit', '--quiet', '-m', 'initial'])

    const ref = resolveRepositoryRef(repoRoot)

    expect(ref.name).toBe(basename(repoRoot))
    expect(ref.commit).toMatch(/^[0-9a-f]{40}$/)
  })

  it('falls back to "unknown" commit for a non-git directory without throwing', () => {
    const nonRepo = mkdtempSync(join(tmpdir(), 'ecc-repo-ref-none-'))
    tempDirs.push(nonRepo)

    const ref = resolveRepositoryRef(nonRepo)

    expect(ref.name).toBe(basename(nonRepo))
    expect(ref.commit).toBe('unknown')
  })
})
