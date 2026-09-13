// Reusable measurement script for this golden example. Run from anywhere:
//   node measure.mjs <repo-path> [tokenBudget]
// Imports the exact same functions `npm run benchmark` uses
// (src/core/evaluation/baselineRetriever.ts and evaluationRunner.ts) so the naive-vs-ECC
// comparison in this example's README uses the project's own benchmark methodology, not a
// bespoke one. Requires `npm run build` to have produced dist/ first.
import { retrieveBaselineEvidence } from '../../../../dist/core/evaluation/baselineRetriever.js'
import { runEvaluation } from '../../../../dist/core/evaluation/evaluationRunner.js'

const rootDir = process.argv[2]
const budget = Number(process.argv[3] ?? 4000)
const request = 'investigate the intermittent timeout in the payment service'

if (!rootDir) {
  console.error('Usage: node measure.mjs <repo-path> [tokenBudget]')
  process.exit(1)
}

const naiveUnbounded = await retrieveBaselineEvidence(rootDir, request, Number.MAX_SAFE_INTEGER)
console.log('--- naive keyword-match baseline (unbounded budget) ---')
console.log(JSON.stringify(naiveUnbounded, null, 2))

const evalResult = await runEvaluation(rootDir, {
  request,
  groundTruthRelevantPaths: [
    'src/paymentService.ts',
    'src/paymentGateway.ts',
    'test/paymentService.test.ts',
  ],
}, budget)
console.log(`--- agent-alone vs agent+ECC at budget=${budget} ---`)
console.log(JSON.stringify(evalResult, null, 2))
