import { vi } from 'vitest'
import type * as VscodeTypes from 'vscode'

// Minimal fake of the 'vscode' module (provided by the real extension host at runtime, and
// aliased to this file in vitest.config.ts) so extension.ts/compileContextCommand.ts can be
// unit-tested without spinning up an actual VS Code instance. `@types/vscode` is only used
// here as a type-only import so call sites don't need casts of their own.

export const ProgressLocation = { Notification: 15 } as const
export const ViewColumn = { Active: -1, Beside: -2 } as const

export interface Uri {
  fsPath: string
}

export function toUri(fsPath: string): VscodeTypes.Uri {
  return { fsPath } as VscodeTypes.Uri
}

export const window = {
  showInputBox: vi.fn(),
  showErrorMessage: vi.fn(),
  withProgress: vi.fn(async (_options: unknown, task: (progress: unknown) => unknown) => task({})),
  createWebviewPanel: vi.fn(() => ({
    webview: { html: '' },
    dispose: vi.fn(),
  })),
}

export const workspace = {
  workspaceFolders: undefined as { uri: Uri }[] | undefined,
  getConfiguration: vi.fn(() => ({
    get: vi.fn((_key: string, defaultValue?: unknown) => defaultValue),
  })),
}

export const commands = {
  registerCommand: vi.fn((_id: string, _callback: (...args: unknown[]) => unknown) => ({
    dispose: vi.fn(),
  })),
}

export type ExtensionContext = { subscriptions: { dispose(): void }[] }
