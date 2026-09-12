#!/usr/bin/env node
import { main } from './runPrCompile.js'

main().catch((error: unknown) => {
  console.error('ECC PR context posting failed:', error instanceof Error ? error.message : error)
  process.exitCode = 1
})
