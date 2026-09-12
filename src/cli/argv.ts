export interface ContextCommandArgs {
  request: string
  path: string
  out?: string
  budget?: number
}

export type ParsedArgs =
  | { command: 'context'; args: ContextCommandArgs }
  | { command: 'unknown' }

const DEFAULT_PATH = '.'

/**
 * Parses `process.argv.slice(2)` for the `ecc` CLI. Hand-rolled rather than a dependency
 * (yargs/commander) - Phase 8 needs exactly one command with three optional flags, and pulling
 * in an arg-parsing library for that would be gold-plating (same reasoning as prior phases'
 * static-table decisions, see 04-decisions.md).
 */
export function parseArgs(argv: string[]): ParsedArgs {
  const [command, ...rest] = argv

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
