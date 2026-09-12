import { parseArgs } from './argv.js'
import { runContext } from './runContext.js'
import { runMemoryCommand, MEMORY_USAGE } from './memoryCommand.js'
import { formatPackage, writePackage } from './output.js'
import { validateContextPackage } from '../core/schema/validate.js'

export const USAGE =
  `Usage: ecc context "<task description>" [--path <dir>] [--out <file>] [--budget <n>]\n` +
  `       ${MEMORY_USAGE}`

/**
 * Runs the `ecc` CLI for a given argv (excluding the node/script entries) and returns a process
 * exit code, rather than calling process.exit directly - keeps it testable without spawning a
 * subprocess, while `src/cli/index.ts` stays a thin shebang entry point over this function.
 */
export async function runCli(argv: string[]): Promise<number> {
  const parsed = parseArgs(argv)

  if (parsed.command === 'unknown') {
    console.error(USAGE)
    return 1
  }

  if (parsed.command === 'memory') {
    return runMemoryCommand(parsed.args)
  }

  const { request, path, out, budget } = parsed.args
  if (!request) {
    console.error(`Error: a task description is required.\n\n${USAGE}`)
    return 1
  }

  const pkg = await runContext(path, request, { tokenBudget: budget })
  const validation = validateContextPackage(pkg)
  if (!validation.ok) {
    console.error('ECC produced an invalid context package (this is a bug):')
    console.error(JSON.stringify(validation.errors, null, 2))
    return 1
  }

  if (out) {
    await writePackage(validation.value, out)
    console.log(`Context package written to ${out}`)
  } else {
    console.log(formatPackage(validation.value))
  }

  return 0
}
