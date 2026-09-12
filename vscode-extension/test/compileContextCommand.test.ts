import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { window, workspace, toUri } from './vscodeMock.js'
import { compileEngineeringContext } from '../src/compileContextCommand.js'

const FIXTURE_REPO = fileURLToPath(new URL('../../test/fixtures/sample-repo', import.meta.url))

describe('compileEngineeringContext (real runContext pipeline against the fixture repo)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    workspace.workspaceFolders = undefined
    window.showInputBox.mockResolvedValue('explain the utils module')
  })

  it('shows an error and does nothing when no folder is open', async () => {
    await compileEngineeringContext(undefined)

    expect(window.showErrorMessage).toHaveBeenCalledWith(expect.stringContaining('open a folder'))
    expect(window.createWebviewPanel).not.toHaveBeenCalled()
  })

  it('does nothing when the user cancels the task prompt', async () => {
    workspace.workspaceFolders = [{ uri: toUri(FIXTURE_REPO) }]
    window.showInputBox.mockResolvedValue(undefined)

    await compileEngineeringContext(undefined)

    expect(window.createWebviewPanel).not.toHaveBeenCalled()
  })

  it('compiles a real context package and shows it in a webview preview', async () => {
    await compileEngineeringContext(toUri(FIXTURE_REPO))

    expect(window.createWebviewPanel).toHaveBeenCalledTimes(1)
    const panel = window.createWebviewPanel.mock.results[0]!.value as { webview: { html: string } }
    expect(panel.webview.html).toContain('sample-repo')
    expect(panel.webview.html).toContain('explain')
    expect(window.showErrorMessage).not.toHaveBeenCalled()
  })

  it('falls back to the containing directory when a file (not a folder) is right-clicked', async () => {
    await compileEngineeringContext(toUri(join(FIXTURE_REPO, 'package.json')))

    expect(window.createWebviewPanel).toHaveBeenCalledTimes(1)
  })
})
