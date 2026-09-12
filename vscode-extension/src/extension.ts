import * as vscode from 'vscode'
import { compileEngineeringContext } from './compileContextCommand.js'

/**
 * Thin activation glue: registers the one command this extension contributes. All real work
 * happens in compileContextCommand.ts (vscode-dependent) and preview.ts (pure), which are
 * unit-tested directly; this file only wires them into the VS Code extension host.
 */
export function activate(context: vscode.ExtensionContext): void {
  const command = vscode.commands.registerCommand('ecc.compileContext', (uri?: vscode.Uri) =>
    compileEngineeringContext(uri),
  )
  context.subscriptions.push(command)
}

export function deactivate(): void {}
