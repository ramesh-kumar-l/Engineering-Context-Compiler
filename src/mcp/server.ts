import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import {
  COMPILE_ENGINEERING_CONTEXT_TOOL_DESCRIPTION,
  COMPILE_ENGINEERING_CONTEXT_TOOL_NAME,
  compileEngineeringContextInputShape,
  compileEngineeringContextTool,
} from './tool.js'

export const MCP_SERVER_NAME = 'ecc'
export const MCP_SERVER_VERSION = '0.1.0'

/**
 * Builds the ECC MCP server with `compile_engineering_context` registered over the same
 * `runContext` orchestrator the Phase 8 CLI and Phase 9 skill point to - the MCP surface is a
 * thin wrapper, not a reimplementation (see 02-architecture.md). Does not connect a
 * transport: callers (the stdio entry point, or a test harness) own that decision, mirroring
 * how `runCli`/`src/cli/index.ts` separate CLI logic from process wiring.
 */
export function createEccMcpServer(): McpServer {
  const server = new McpServer({ name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION })

  server.registerTool(
    COMPILE_ENGINEERING_CONTEXT_TOOL_NAME,
    {
      description: COMPILE_ENGINEERING_CONTEXT_TOOL_DESCRIPTION,
      inputSchema: compileEngineeringContextInputShape,
    },
    compileEngineeringContextTool,
  )

  return server
}
