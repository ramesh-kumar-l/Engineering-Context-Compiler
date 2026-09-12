import { execFileSync } from 'node:child_process'
import type { EvidenceItem } from '../types/evidence.js'

export const DEFAULT_MAX_COMMITS_PER_FILE = 5

/** Unlikely to appear in a commit subject; safe to split on. */
const FIELD_SEPARATOR = ''

interface CommitRecord {
  hash: string
  date: string
  subject: string
}

function parseGitLog(output: string): CommitRecord[] {
  return output
    .split('\n')
    .filter((line) => line.length > 0)
    .map((line) => {
      const [hash = '', date = '', subject = ''] = line.split(FIELD_SEPARATOR)
      return { hash, date, subject }
    })
}

function logForFile(repoRoot: string, path: string, maxCommits: number): CommitRecord[] {
  try {
    const output = execFileSync(
      'git',
      [
        'log',
        `--max-count=${maxCommits}`,
        `--pretty=format:%H${FIELD_SEPARATOR}%ad${FIELD_SEPARATOR}%s`,
        '--date=short',
        '--',
        path,
      ],
      { cwd: repoRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    )
    return parseGitLog(output)
  } catch {
    return []
  }
}

/**
 * Retrieves recent commit history for the given repo-relative paths. Silently returns no
 * evidence (rather than throwing) when the directory isn't a git repository, has no history
 * for a path, or git isn't installed - history is supplementary evidence, not a hard
 * requirement for retrieval to succeed.
 */
export function retrieveGitEvidence(
  repoRoot: string,
  paths: string[],
  maxCommitsPerFile: number = DEFAULT_MAX_COMMITS_PER_FILE,
): EvidenceItem[] {
  const items: EvidenceItem[] = []

  for (const path of paths) {
    const commits = logForFile(repoRoot, path, maxCommitsPerFile)
    commits.forEach((commit, index) => {
      items.push({
        source: 'git',
        path,
        identifier: commit.subject,
        relevance: Math.max(0.1, 1 - index / maxCommitsPerFile),
        provenance: {
          source: 'git',
          path,
          commit: commit.hash,
          timestamp: commit.date,
        },
      })
    })
  }

  return items
}
