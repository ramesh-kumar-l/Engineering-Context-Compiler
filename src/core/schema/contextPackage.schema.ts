/**
 * Runtime validation for EngineeringContextPackage. Every ECC surface must
 * validate at its boundary (CLI output, MCP tool result, ...) rather than
 * trust that an in-memory object matches the TypeScript type.
 */

import { z } from 'zod'
import { EVIDENCE_SOURCE_TYPES } from '../types/evidence.js'
import { TASK_TYPES } from '../types/task.js'
import { TRUST_LEVELS } from '../types/trust.js'

const evidenceProvenanceSchema = z.object({
  source: z.enum(EVIDENCE_SOURCE_TYPES),
  identifier: z.string().optional(),
  path: z.string().optional(),
  lineRange: z.string().optional(),
  commit: z.string().optional(),
  timestamp: z.string().optional(),
  authority: z.enum(['low', 'medium', 'high']).optional(),
  freshness: z.enum(['current', 'stale', 'unknown']).optional(),
})

const evidenceItemSchema = z.object({
  source: z.enum(EVIDENCE_SOURCE_TYPES),
  path: z.string().optional(),
  identifier: z.string().optional(),
  symbols: z.array(z.string()).optional(),
  relevance: z.number().min(0).max(1),
  confidence: z.number().min(0).max(1).optional(),
  provenance: evidenceProvenanceSchema.optional(),
})

const historicalClaimSchema = z.object({
  claim: z.string(),
  trustLevel: z.enum(TRUST_LEVELS),
  source: z.object({
    type: z.string(),
    id: z.string(),
  }),
})

const constraintSchema = z.object({
  statement: z.string(),
  provenance: evidenceProvenanceSchema,
})

const exclusionSummarySchema = z.object({
  reason: z.string(),
  count: z.number().int().nonnegative(),
})

export const engineeringContextPackageSchema = z.object({
  version: z.string(),
  task: z.object({
    type: z.enum(TASK_TYPES),
    request: z.string().min(1),
  }),
  repository: z.object({
    name: z.string().min(1),
    commit: z.string().min(1),
  }),
  context: z.object({
    primary: z.array(evidenceItemSchema),
    supporting: z.array(evidenceItemSchema),
  }),
  history: z.array(historicalClaimSchema),
  constraints: z.array(constraintSchema),
  unknowns: z.array(z.string()),
  verification: z.array(z.string()),
  excluded: z.array(exclusionSummarySchema),
})
