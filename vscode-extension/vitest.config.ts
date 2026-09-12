import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    exclude: ['node_modules/**'],
    testTimeout: 15000,
  },
  resolve: {
    alias: {
      vscode: fileURLToPath(new URL('./test/vscodeMock.ts', import.meta.url)),
    },
  },
})
