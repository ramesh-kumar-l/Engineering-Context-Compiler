#!/usr/bin/env node
import { runCli } from './cli.js'

runCli(process.argv.slice(2))
  .then((code) => {
    process.exitCode = code
  })
  .catch((error: unknown) => {
    console.error('ECC failed:', error instanceof Error ? error.message : error)
    process.exitCode = 1
  })
