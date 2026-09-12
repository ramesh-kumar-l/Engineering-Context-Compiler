import type { EngineeringContextPackage } from '../../src/core/types/contextPackage.js'
import type { TrustedEvidenceItem } from '../../src/core/types/trust.js'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderEvidenceRows(items: TrustedEvidenceItem[]): string {
  if (items.length === 0) {
    return '<tr><td colspan="4" class="empty">none</td></tr>'
  }
  return items
    .map((item) => {
      const subject = escapeHtml(item.path ?? item.identifier ?? '(unknown)')
      return `<tr>
        <td>${escapeHtml(item.source)}</td>
        <td>${subject}</td>
        <td><span class="trust trust-${item.trustLevel}">${item.trustLevel}</span></td>
        <td>${item.relevance.toFixed(2)}</td>
      </tr>`
    })
    .join('\n')
}

function renderConflicts(pkg: EngineeringContextPackage): string {
  if (pkg.conflicts.length === 0) return ''
  const rows = pkg.conflicts
    .map((conflict) => {
      const levels = conflict.items.map((item) => item.trustLevel).join(', ')
      return `<li><strong>${escapeHtml(conflict.subject)}</strong> — conflicting trust levels: ${escapeHtml(levels)}</li>`
    })
    .join('\n')
  return `<h2>Conflicts</h2><ul class="conflicts">${rows}</ul>`
}

function renderList(title: string, items: string[]): string {
  if (items.length === 0) return ''
  const rows = items.map((item) => `<li>${escapeHtml(item)}</li>`).join('\n')
  return `<h2>${title}</h2><ul>${rows}</ul>`
}

function renderExcluded(pkg: EngineeringContextPackage): string {
  if (pkg.excluded.length === 0) return ''
  const rows = pkg.excluded
    .map((entry) => `<li>${escapeHtml(entry.reason)}: ${entry.count}</li>`)
    .join('\n')
  return `<h2>Excluded</h2><ul>${rows}</ul>`
}

/**
 * Renders an EngineeringContextPackage as a self-contained HTML document for a VS Code
 * webview preview. Pure and vscode-independent so it can be unit-tested directly. All
 * free-text fields are escaped since the source request/paths could contain HTML-special
 * characters (the webview itself also runs with enableScripts: false as a second guard).
 */
export function renderPreviewHtml(pkg: EngineeringContextPackage): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<style>
  body { font-family: var(--vscode-font-family, sans-serif); color: var(--vscode-foreground); padding: 0 16px 24px; }
  h1 { font-size: 1.2em; }
  h2 { font-size: 1em; margin-top: 1.5em; border-bottom: 1px solid var(--vscode-panel-border, #444); padding-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-top: 0.5em; }
  th, td { text-align: left; padding: 4px 8px; border-bottom: 1px solid var(--vscode-panel-border, #333); font-size: 0.9em; }
  .empty { color: var(--vscode-descriptionForeground, #888); font-style: italic; }
  .trust { padding: 1px 6px; border-radius: 3px; font-size: 0.8em; }
  .trust-fact { background: var(--vscode-testing-iconPassed, #2ea043); color: #fff; }
  .trust-derived { background: var(--vscode-charts-blue, #2f81f7); color: #fff; }
  .trust-inference { background: var(--vscode-charts-orange, #d29922); color: #000; }
  .trust-unknown { background: var(--vscode-charts-red, #f85149); color: #fff; }
  .meta { color: var(--vscode-descriptionForeground, #888); font-size: 0.9em; }
</style>
</head>
<body>
  <h1>Engineering Context: ${escapeHtml(pkg.task.type)}</h1>
  <p class="meta">Repository: ${escapeHtml(pkg.repository.name)} @ ${escapeHtml(pkg.repository.commit)}</p>
  <p>${escapeHtml(pkg.task.request)}</p>

  <h2>Primary evidence</h2>
  <table>
    <thead><tr><th>Source</th><th>Path / identifier</th><th>Trust</th><th>Relevance</th></tr></thead>
    <tbody>${renderEvidenceRows(pkg.context.primary)}</tbody>
  </table>

  <h2>Supporting evidence</h2>
  <table>
    <thead><tr><th>Source</th><th>Path / identifier</th><th>Trust</th><th>Relevance</th></tr></thead>
    <tbody>${renderEvidenceRows(pkg.context.supporting)}</tbody>
  </table>

  ${renderConflicts(pkg)}
  ${renderList('Unknowns', pkg.unknowns)}
  ${renderExcluded(pkg)}
</body>
</html>`
}
