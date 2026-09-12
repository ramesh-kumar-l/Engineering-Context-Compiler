import { z } from 'zod'
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js'
import { runContext } from '../cli/runContext.js'
import { validateContextPackage } from '../core/schema/validate.js'

export const COMPILE_ENGINEERING_CONTEXT_TOOL_NAME = 'compile_engineering_context'

export const COMPILE_ENGINEERING_CONTEXT_TOOL_DESCRIPTION =
  'Compiles an evidence-backed EngineeringContextPackage (relevant code, tests, and git ' +
  'history - ranked, trust-classified, and fit to a token budget) for a free-text ' +
  'engineering task against a real repository. Call this before planning, writing, or ' +
  'reviewing a non-trivial change instead of guessing at relevant files or history.'

export const compileEngineeringContextInputShape = {
  task: z
    .string()
    .min(1)
    .describe('Free-text description of the engineering task, e.g. "fix the auth timeout bug".'),
  path: z
    .string()
    .optional()
    .describe("Repository directory to analyze. Defaults to the MCP server process's current working directory."),
  tokenBudget: z
    .number()
    .int()
    .positive()
    .optional()
    .describe('Token budget for evidence selection. Defaults to the core default budget when omitted.'),
}

export type CompileEngineeringContextInput = z.infer<z.ZodObject<typeof compileEngineeringContextInputShape>>

/**
 * Handles a `compile_engineering_context` tool call by running the same pipeline the CLI's
 * `runContext` uses, so the CLI and MCP surfaces can never drift into different behavior.
 * Never throws: an unreadable path or an internal validation failure both come back as an
 * MCP tool error result (isError: true) instead of crashing the server/connection.
 */
export async function compileEngineeringContextTool(
  input: CompileEngineeringContextInput,
): Promise<CallToolResult> {
  try {
    const pkg = await runContext(input.path ?? '.', input.task, {
      tokenBudget: input.tokenBudget,
    })

    const validation = validateContextPackage(pkg)
    if (!validation.ok) {
      return {
        isError: true,
        content: [
          {
            type: 'text',
            text: `ECC produced an invalid context package (this is a bug): ${JSON.stringify(validation.errors)}`,
          },
        ],
      }
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(validation.value) }],
    }
  } catch (error) {
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `ECC failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    }
  }
}
