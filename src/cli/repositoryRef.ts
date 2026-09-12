import { execFileSync } from 'node:child_process'
import { basename } from 'node:path'
import type { RepositoryRef } from '../core/types/contextPackage.js'

const UNKNOWN_COMMIT = 'unknown'

function currentCommit(rootDir: string): string {
  try {
    return execFileSync('git', ['rev-parse', 'HEAD'], {
      cwd: rootDir,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return UNKNOWN_COMMIT
  }
}

/**
 * Resolves a RepositoryRef for a directory: its folder name and current commit hash. Never
 * throws - a non-git directory still gets a valid ref with commit "unknown", matching
 * gitEvidenceRetriever.ts's tolerance for repositories without git history.
 */
export function resolveRepositoryRef(rootDir: string): RepositoryRef {
  return { name: basename(rootDir), commit: currentCommit(rootDir) }
}
