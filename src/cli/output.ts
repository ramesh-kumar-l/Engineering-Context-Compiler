import { writeFile } from 'node:fs/promises'
import type { EngineeringContextPackage } from '../core/types/contextPackage.js'

/**
 * Pretty-printed JSON is the CLI's one output format for Phase 8 - human-readable, and the
 * exact shape a later MCP/skill client (Phase 9-10) will consume programmatically.
 */
export function formatPackage(pkg: EngineeringContextPackage): string {
  return JSON.stringify(pkg, null, 2)
}

export async function writePackage(pkg: EngineeringContextPackage, outPath: string): Promise<void> {
  await writeFile(outPath, `${formatPackage(pkg)}\n`, 'utf8')
}
