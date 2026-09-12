import type { EvaluationResult } from '../core/evaluation/types.js'

function pct(value: number): string {
  return `${Math.round(value * 100)}%`
}

function average(values: number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length
}

function formatTask(result: EvaluationResult): string {
  const { agentAlone, agentWithEcc } = result
  return [
    `## ${result.task.name}`,
    `Task: "${result.task.request}"`,
    '',
    '| Metric | Agent alone | Agent + ECC |',
    '|---|---|---|',
    `| Evidence recall | ${pct(agentAlone.evidenceRecall)} | ${pct(agentWithEcc.evidenceRecall)} |`,
    `| Irrelevant evidence rate | ${pct(agentAlone.irrelevantEvidenceRate)} | ${pct(agentWithEcc.irrelevantEvidenceRate)} |`,
    `| Provenance completeness | ${pct(agentAlone.provenanceCompleteness)} | ${pct(agentWithEcc.provenanceCompleteness)} |`,
    `| Estimated tokens | ${agentAlone.totalTokens} | ${agentWithEcc.totalTokens} |`,
    `| Evidence items | ${agentAlone.itemCount} | ${agentWithEcc.itemCount} |`,
  ].join('\n')
}

/**
 * Renders an evaluation run as a markdown report: one comparison table per task plus an
 * aggregate summary, so a run's output can be pasted straight into the memory bank as the
 * recorded evidence Phase 11's exit criteria requires ("metrics measured, not just defined").
 */
export function formatReport(results: EvaluationResult[]): string {
  const tables = results.map(formatTask).join('\n\n')

  const summary = [
    '## Summary (average across all tasks)',
    '',
    '| Metric | Agent alone | Agent + ECC |',
    '|---|---|---|',
    `| Evidence recall | ${pct(average(results.map((r) => r.agentAlone.evidenceRecall)))} | ${pct(average(results.map((r) => r.agentWithEcc.evidenceRecall)))} |`,
    `| Irrelevant evidence rate | ${pct(average(results.map((r) => r.agentAlone.irrelevantEvidenceRate)))} | ${pct(average(results.map((r) => r.agentWithEcc.irrelevantEvidenceRate)))} |`,
    `| Provenance completeness | ${pct(average(results.map((r) => r.agentAlone.provenanceCompleteness)))} | ${pct(average(results.map((r) => r.agentWithEcc.provenanceCompleteness)))} |`,
    `| Estimated tokens | ${Math.round(average(results.map((r) => r.agentAlone.totalTokens)))} | ${Math.round(average(results.map((r) => r.agentWithEcc.totalTokens)))} |`,
  ].join('\n')

  return `${tables}\n\n${summary}`
}
