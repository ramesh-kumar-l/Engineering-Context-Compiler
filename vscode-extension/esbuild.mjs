import { build } from 'esbuild'

// Bundles the extension host entry point (and the core/CLI modules it imports directly from
// ../src) into a single self-contained CommonJS file. `vscode` is provided by the extension
// host at runtime, so it's marked external rather than bundled.
await build({
  entryPoints: ['src/extension.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: 'dist/extension.js',
  external: ['vscode'],
  sourcemap: true,
})
