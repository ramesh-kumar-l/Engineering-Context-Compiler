# ECC VS Code Extension

A thin client over the ECC core pipeline (the same `runContext` the CLI and MCP server call):
right-click a folder/file in the Explorer (or the editor, or the Command Palette) and choose
**Compile Engineering Context** to describe a task and preview the resulting
`EngineeringContextPackage` in a webview panel beside your editor.

No pipeline logic lives in this package — `src/compileContextCommand.ts` imports `runContext`
and `validateContextPackage` directly from `../src/cli/runContext.js` /
`../src/core/schema/validate.js`, and `src/preview.ts` is a pure, vscode-independent function
that renders the validated package as HTML.

## Development

```bash
cd vscode-extension
npm install
npm run typecheck
npm run lint
npm test
npm run build   # bundles src/extension.ts + its core/CLI imports into dist/extension.js
```

To try it in a real VS Code window: open this folder in VS Code and press F5 (Run Extension)
to launch an Extension Development Host, then right-click a folder in that window's Explorer.

## Settings

- `ecc.tokenBudget` (number, default `4000`) — token budget for evidence selection, same
  default as the CLI's `--budget` flag.
