#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { createEccMcpServer } from './server.js'

createEccMcpServer()
  .connect(new StdioServerTransport())
  .catch((error: unknown) => {
    console.error('ECC MCP server failed:', error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
