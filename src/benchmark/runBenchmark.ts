#!/usr/bin/env node
import { resolve } from 'node:path'
import { runEvaluation } from '../core/evaluation/evaluationRunner.js'
import { BENCHMARK_TASKS } from './benchmarkTasks.js'
import { formatReport } from './report.js'
import type { EvaluationResult } from '../core/evaluation/types.js'

async function main(): Promise<void> {
  const rootDir = resolve(process.argv[2] ?? '.')
  const results: EvaluationResult[] = []

  for (const task of BENCHMARK_TASKS) {
    results.push(await runEvaluation(rootDir, task))
  }

  console.log(formatReport(results))
}

main().catch((error: unknown) => {
  console.error('Benchmark run failed:', error instanceof Error ? error.message : error)
  process.exitCode = 1
})
