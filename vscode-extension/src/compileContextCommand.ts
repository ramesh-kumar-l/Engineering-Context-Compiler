import * as vscode from 'vscode'
import { existsSync, statSync } from 'node:fs'
import { dirname } from 'node:path'
import { runContext } from '../../src/cli/runContext.js'
import { validateContextPackage } from '../../src/core/schema/validate.js'
import { renderPreviewHtml } from './preview.js'

function resolveTargetPath(uri: vscode.Uri | undefined): string | undefined {
  if (uri?.fsPath && existsSync(uri.fsPath)) {
    return statSync(uri.fsPath).isDirectory() ? uri.fsPath : dirname(uri.fsPath)
  }
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath
}

/**
 * Handles the "Compile Engineering Context" command: resolves a target directory from the
 * right-clicked resource (or the first workspace folder), prompts for the task, runs the
 * same `runContext` pipeline the CLI/MCP surfaces use, and shows the result in a webview
 * preview. A thin client over core - no pipeline logic lives here, so a fix or change to
 * retrieval/ranking/compilation applies here automatically.
 */
export async function compileEngineeringContext(uri?: vscode.Uri): Promise<void> {
  const targetPath = resolveTargetPath(uri)
  if (!targetPath) {
    void vscode.window.showErrorMessage('ECC: open a folder or workspace first.')
    return
  }

  const task = await vscode.window.showInputBox({
    title: 'Compile Engineering Context',
    prompt: 'Describe the engineering task',
    placeHolder: 'e.g. add a trust level for CI evidence',
  })
  if (!task) return

  const tokenBudget = vscode.workspace.getConfiguration('ecc').get<number>('tokenBudget')

  try {
    const pkg = await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'ECC: compiling engineering context...' },
      () => runContext(targetPath, task, { tokenBudget }),
    )

    const validation = validateContextPackage(pkg)
    if (!validation.ok) {
      void vscode.window.showErrorMessage('ECC: compiled package failed schema validation.')
      return
    }

    const panel = vscode.window.createWebviewPanel(
      'eccContextPreview',
      `ECC: ${pkg.task.type}`,
      vscode.ViewColumn.Beside,
      { enableScripts: false },
    )
    panel.webview.html = renderPreviewHtml(validation.value)
  } catch (error) {
    void vscode.window.showErrorMessage(`ECC: failed to compile context — ${(error as Error).message}`)
  }
}
