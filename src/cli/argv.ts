export interface ContextCommandArgs {
  request: string
  path: string
  out?: string
  budget?: number
}

export interface MemoryCommandArgs {
  /** Not yet validated against MemoryEntryType here - argv.ts stays a dumb tokenizer. */
  type?: string
  summary?: string
  detail?: string
  tags?: string[]
  relatedPaths?: string[]
  path: string
}

export type ParsedArgs =
  | { command: 'context'; args: ContextCommandArgs }
  | { command: 'memory'; args: MemoryCommandArgs }
  | { command: 'unknown' }

const DEFAULT_PATH = '.'

function splitList(value: string | undefined): string[] | undefined {
  if (!value) return undefined
  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
  return items.length > 0 ? items : undefined
}

function parseMemoryArgs(rest: string[]): ParsedArgs {
  let type: string | undefined
  let summary: string | undefined
  let detail: string | undefined
  let tags: string[] | undefined
  let relatedPaths: string[] | undefined
  let path = DEFAULT_PATH

  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i]
    if (token === '--type') {
      i += 1
      type = rest[i]
    } else if (token === '--summary') {
      i += 1
      summary = rest[i]
    } else if (token === '--detail') {
      i += 1
      detail = rest[i]
    } else if (token === '--tags') {
      i += 1
      tags = splitList(rest[i])
    } else if (token === '--paths') {
      i += 1
      relatedPaths = splitList(rest[i])
    } else if (token === '--path') {
      i += 1
      path = rest[i] ?? path
    }
  }

  return { command: 'memory', args: { type, summary, detail, tags, relatedPaths, path } }
}

/**
 * Parses `process.argv.slice(2)` for the `ecc` CLI. Hand-rolled rather than a dependency
 * (yargs/commander) - Phase 8 needs exactly one command with three optional flags, and pulling
 * in an arg-parsing library for that would be gold-plating (same reasoning as prior phases'
 * static-table decisions, see 04-decisions.md).
 */
export function parseArgs(argv: string[]): ParsedArgs {
  const [command, ...rest] = argv

  if (command === 'memory') {
    return parseMemoryArgs(rest)
  }

  if (command !== 'context') {
    return { command: 'unknown' }
  }

  const positional: string[] = []
  let path = DEFAULT_PATH
  let out: string | undefined
  let budget: number | undefined

  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i]
    if (token === '--path') {
      i += 1
      path = rest[i] ?? path
    } else if (token === '--out') {
      i += 1
      out = rest[i]
    } else if (token === '--budget') {
      i += 1
      const value = Number(rest[i])
      budget = Number.isFinite(value) ? value : undefined
    } else if (token) {
      positional.push(token)
    }
  }

  return { command: 'context', args: { request: positional.join(' '), path, out, budget } }
}
