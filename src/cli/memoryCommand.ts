import { resolve } from 'node:path'
import { recordMemoryEntry } from '../core/memory/memoryStore.js'
import {
  MEMORY_ENTRY_TYPES,
  MEMORY_OUTCOME_SIGNALS,
  type MemoryEntryType,
  type MemoryOutcomeSignal,
} from '../core/memory/types.js'
import type { MemoryCommandArgs } from './argv.js'

export const MEMORY_USAGE =
  'Usage: ecc memory --type <decision|incident|outcome> --summary "<text>" ' +
  '[--detail "<text>"] [--tags a,b] [--paths src/x.ts,src/y.ts] ' +
  '[--signal positive|negative] [--path <dir>]'

function isMemoryEntryType(value: string | undefined): value is MemoryEntryType {
  return Boolean(value) && (MEMORY_ENTRY_TYPES as readonly string[]).includes(value as string)
}

function isMemoryOutcomeSignal(value: string | undefined): value is MemoryOutcomeSignal {
  return Boolean(value) && (MEMORY_OUTCOME_SIGNALS as readonly string[]).includes(value as string)
}

/**
 * Validates and records one memory entry (`ecc memory ...`), returning a process exit code
 * the same way `runCli` does. This is the write side of Phase 14: a decision/incident/outcome
 * recorded here persists in the target repository's `.ecc/memory.json` and becomes
 * retrievable evidence (`source: 'memory'`) in any later `ecc context` compilation against
 * that same repository. `--signal` (Phase 16) is the write side of the feedback loop: an
 * `outcome` entry recorded with `--signal positive|negative` and `--paths` nudges future
 * ranking/memory relevance for those paths (see `src/core/intelligence/outcomeFeedback.ts`).
 */
export function runMemoryCommand(args: MemoryCommandArgs): number {
  if (!isMemoryEntryType(args.type)) {
    console.error(`Error: --type must be one of ${MEMORY_ENTRY_TYPES.join('/')}.\n\n${MEMORY_USAGE}`)
    return 1
  }
  if (!args.summary) {
    console.error(`Error: --summary is required.\n\n${MEMORY_USAGE}`)
    return 1
  }
  if (args.signal !== undefined && !isMemoryOutcomeSignal(args.signal)) {
    console.error(`Error: --signal must be one of ${MEMORY_OUTCOME_SIGNALS.join('/')}.\n\n${MEMORY_USAGE}`)
    return 1
  }

  const repoRoot = resolve(args.path)
  const entry = recordMemoryEntry(repoRoot, {
    type: args.type,
    summary: args.summary,
    detail: args.detail,
    tags: args.tags,
    relatedPaths: args.relatedPaths,
    signal: args.signal as MemoryOutcomeSignal | undefined,
  })

  console.log(`Recorded ${entry.type} "${entry.summary}" (${entry.id}) to ${repoRoot}/.ecc/memory.json`)
  return 0
}
