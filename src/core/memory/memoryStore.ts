import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { dirname, join } from 'node:path'
import type { MemoryEntry, MemoryEntryType, MemoryOutcomeSignal } from './types.js'

export const MEMORY_DIR_NAME = '.ecc'
export const MEMORY_FILE_NAME = 'memory.json'

export function memoryFilePath(repoRoot: string): string {
  return join(repoRoot, MEMORY_DIR_NAME, MEMORY_FILE_NAME)
}

/**
 * Loads persisted memory entries for a repository. Never throws: a missing or corrupt memory
 * file just means "no memory recorded yet" - the same tolerance gitEvidenceRetriever.ts
 * applies to a non-git directory, since memory is supplementary evidence, not a hard
 * dependency of retrieval.
 */
export function loadMemoryEntries(repoRoot: string): MemoryEntry[] {
  const filePath = memoryFilePath(repoRoot)
  if (!existsSync(filePath)) {
    return []
  }

  try {
    const parsed: unknown = JSON.parse(readFileSync(filePath, 'utf8'))
    return Array.isArray(parsed) ? (parsed as MemoryEntry[]) : []
  } catch {
    return []
  }
}

export interface RecordMemoryEntryInput {
  type: MemoryEntryType
  summary: string
  detail?: string
  tags?: string[]
  relatedPaths?: string[]
  signal?: MemoryOutcomeSignal
}

/**
 * Appends one new memory entry to the repository's persisted store (`<repoRoot>/.ecc/
 * memory.json`), creating the file/directory on first use. This is the write side of Phase
 * 14's exit criteria: whatever is recorded here is what a later `retrieveEvidence` call (via
 * `retrieveMemoryEvidence`) can surface as evidence in a future session.
 */
export function recordMemoryEntry(repoRoot: string, input: RecordMemoryEntryInput): MemoryEntry {
  const entry: MemoryEntry = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    ...input,
  }

  const entries = loadMemoryEntries(repoRoot)
  entries.push(entry)

  const filePath = memoryFilePath(repoRoot)
  mkdirSync(dirname(filePath), { recursive: true })
  writeFileSync(filePath, `${JSON.stringify(entries, null, 2)}\n`, 'utf8')

  return entry
}
