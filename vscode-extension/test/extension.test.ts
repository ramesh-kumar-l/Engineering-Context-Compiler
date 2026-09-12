import { describe, it, expect, vi, beforeEach } from 'vitest'
import { commands } from './vscodeMock.js'

vi.mock('../src/compileContextCommand.js', () => ({
  compileEngineeringContext: vi.fn(),
}))

import { activate, deactivate } from '../src/extension.js'
import { compileEngineeringContext } from '../src/compileContextCommand.js'
import type { ExtensionContext } from './vscodeMock.js'

describe('extension activation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('registers the compile-context command on activation', () => {
    const context: ExtensionContext = { subscriptions: [] }

    activate(context as never)

    expect(commands.registerCommand).toHaveBeenCalledWith('ecc.compileContext', expect.any(Function))
    expect(context.subscriptions).toHaveLength(1)
  })

  it('delegates the registered command to compileEngineeringContext', () => {
    const context: ExtensionContext = { subscriptions: [] }

    activate(context as never)

    const [, callback] = vi.mocked(commands.registerCommand).mock.calls[0]!
    callback('fake-uri' as never)

    expect(compileEngineeringContext).toHaveBeenCalledWith('fake-uri')
  })

  it('deactivate is a no-op', () => {
    expect(() => deactivate()).not.toThrow()
  })
})
