import type { EngineeringContextPackage } from '../core/types/contextPackage.js'
import type { TrustedEvidenceItem, TrustLevel } from '../core/types/trust.js'

const TRUST_LABEL: Record<TrustLevel, string> = {
  fact: '✅ fact',
  derived: '🔎 derived',
  inference: '🤔 inference',
  unknown: '❓ unknown',
}

function escapeCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\r?\n/g, ' ')
}

function evidenceLabel(item: TrustedEvidenceItem): string {
  return escapeCell(item.path ?? item.identifier ?? `(${item.source})`)
}

function renderEvidenceTable(items: TrustedEvidenceItem[]): string {
  if (items.length === 0) {
    return '_None._'
  }
  const rows = items.map(
    (item) =>
      `| ${item.source} | ${evidenceLabel(item)} | ${TRUST_LABEL[item.trustLevel]} | ${Math.round(item.relevance * 100)}% |`,
  )
  return ['| Source | Path / identifier | Trust | Relevance |', '|---|---|---|---|', ...rows].join('\n')
}

function renderConflicts(pkg: EngineeringContextPackage): string {
  if (pkg.conflicts.length === 0) {
    return ''
  }
  const rows = pkg.conflicts.map(
    (conflict) =>
      `- **${escapeCell(conflict.subject)}**: ${conflict.items.map((item) => TRUST_LABEL[item.trustLevel]).join(' vs. ')}`,
  )
  return ['### ⚠️ Conflicts', '', ...rows].join('\n')
}

function renderList(title: string, items: string[]): string {
  if (items.length === 0) {
    return ''
  }
  return [`### ${title}`, '', ...items.map((item) => `- ${item}`)].join('\n')
}

function renderExcluded(pkg: EngineeringContextPackage): string {
  if (pkg.excluded.length === 0) {
    return ''
  }
  const rows = pkg.excluded.map((exclusion) => `| ${exclusion.reason} | ${exclusion.count} |`)
  return ['### Excluded', '', '| Reason | Count |', '|---|---|', ...rows].join('\n')
}

/**
 * Renders an EngineeringContextPackage as GitHub-flavored Markdown suitable for a PR comment:
 * affected components (primary evidence), supporting evidence/tests, conflicts, constraints,
 * unknowns, and a risk-scaled verification list - the Phase 13 exit criteria's "affected
 * components, relevant tests, risk" in one automatically-postable block. Pure and
 * GitHub-independent so it's unit-testable without any network access.
 */
export function renderMarkdownReport(pkg: EngineeringContextPackage): string {
  const shortCommit = pkg.repository.commit === 'unknown' ? 'unknown' : pkg.repository.commit.slice(0, 7)

  const sections = [
    `## 🧭 Engineering Context — ${pkg.task.type}`,
    '',
    `**Request:** ${pkg.task.request}`,
    `**Repository:** \`${pkg.repository.name}\` @ \`${shortCommit}\``,
    '',
    `### Primary evidence (${pkg.context.primary.length})`,
    '',
    renderEvidenceTable(pkg.context.primary),
    '',
    `<details><summary>Supporting evidence (${pkg.context.supporting.length})</summary>\n\n${renderEvidenceTable(pkg.context.supporting)}\n\n</details>`,
    renderConflicts(pkg),
    renderList('Constraints', pkg.constraints.map((constraint) => constraint.statement)),
    renderList('Unknowns', pkg.unknowns),
    renderList('Suggested verification', pkg.verification),
    renderExcluded(pkg),
  ].filter((section) => section !== '')

  return sections.join('\n\n')
}
