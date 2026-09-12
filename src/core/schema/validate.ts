import type { z } from 'zod'
import { engineeringContextPackageSchema } from './contextPackage.schema.js'
import type { EngineeringContextPackage } from '../types/contextPackage.js'

export type ValidationResult =
  | { ok: true; value: EngineeringContextPackage }
  | { ok: false; errors: z.ZodIssue[] }

/**
 * Validates an unknown value against the EngineeringContextPackage contract.
 * Never throws: callers decide how to surface a failed contract.
 */
export function validateContextPackage(data: unknown): ValidationResult {
  const result = engineeringContextPackageSchema.safeParse(data)
  if (result.success) {
    return { ok: true, value: result.data }
  }
  return { ok: false, errors: result.error.issues }
}
