import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { createEccMcpServer } from '../../src/mcp/server.js'
import { validateContextPackage } from '../../src/core/schema/validate.js'

const FIXTURE_ROOT = fileURLToPath(new URL('../fixtures/sample-repo', import.meta.url))

async function connectedClient() {
  const server = createEccMcpServer()
  const client = new Client({ name: 'test-client', version: '0.0.0' })
  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()

  await Promise.all([client.connect(clientTransport), server.server.connect(serverTransport)])

  return client
}

describe('ECC MCP server (real MCP client over the wire)', () => {
  it('lists compile_engineering_context among its tools', async () => {
    const client = await connectedClient()

    const { tools } = await client.listTools()

    expect(tools.map((tool) => tool.name)).toContain('compile_engineering_context')
  })

  it('a real MCP client can call compile_engineering_context and get a valid package back', async () => {
    const client = await connectedClient()

    const result = await client.callTool({
      name: 'compile_engineering_context',
      arguments: { task: 'explain the utils module', path: FIXTURE_ROOT },
    })

    expect(result.isError).toBeFalsy()
    const content = result.content as Array<{ type: string; text: string }>
    const pkg = JSON.parse(content[0]!.text)

    expect(validateContextPackage(pkg).ok).toBe(true)
    expect(pkg.repository.name).toBe('sample-repo')
    expect(pkg.task.request).toBe('explain the utils module')
  })

  it('surfaces a bad repository path as an MCP tool error, not a protocol failure', async () => {
    const client = await connectedClient()

    const result = await client.callTool({
      name: 'compile_engineering_context',
      arguments: { task: 'explain', path: fileURLToPath(new URL('../fixtures/does-not-exist', import.meta.url)) },
    })

    expect(result.isError).toBe(true)
  })
})
