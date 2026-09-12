import type { BenchmarkTask } from '../core/evaluation/types.js'

/**
 * Benchmark tasks run against ECC's own repository (dogfooding), not just the tiny test
 * fixture - addressing the "no target repository chosen yet" open item carried since Phase
 * 10 (see [[active-context]]). Each task's ground truth is hand-picked from the real module
 * table in [[implementation-status]], so this is a genuine "real-world task" benchmark per
 * [[07-evaluation]]'s guidance, not a synthetic one.
 */
export const BENCHMARK_TASKS: BenchmarkTask[] = [
  {
    name: 'trust-level-extension',
    request: 'add a new trust level for evidence produced by an external linter',
    groundTruthRelevantPaths: ['src/core/types/trust.ts', 'src/core/trust/trustClassifier.ts'],
  },
  {
    name: 'token-budget-fix',
    request: 'fix token budget estimation so large files are not undercounted',
    groundTruthRelevantPaths: [
      'src/core/compilation/tokenBudget.ts',
      'src/core/compilation/contextSelector.ts',
    ],
  },
  {
    name: 'ranking-recency-signal',
    request: 'rank evidence considering how recent its related git commit is',
    groundTruthRelevantPaths: [
      'src/core/evidence/evidenceRanker.ts',
      'src/core/evidence/gitEvidenceRetriever.ts',
    ],
  },
]
