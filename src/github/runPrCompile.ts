import { runContext } from '../cli/runContext.js'
import { validateContextPackage } from '../core/schema/validate.js'
import { renderMarkdownReport } from '../reporting/markdownReport.js'
import { loadPullRequestEventContext } from './prEventContext.js'
import { upsertPrComment } from './githubCommentClient.js'

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

/**
 * Entry point for the "PR gets ECC-compiled context posted automatically" exit criteria
 * (Phase 13): reads the GitHub Actions `pull_request` event, runs the same `runContext`
 * pipeline every other surface (CLI/MCP/VS Code) calls, and upserts the rendered markdown as a
 * PR comment. No pipeline or GitHub-formatting logic lives here - both are delegated so a wrong
 * result means a wrong `runContext` or `renderMarkdownReport`, not a wrong CI wrapper.
 */
export async function main(): Promise<void> {
  const eventPath = requireEnv('GITHUB_EVENT_PATH')
  const repoSlug = requireEnv('GITHUB_REPOSITORY')
  const token = requireEnv('GITHUB_TOKEN')
  const workspace = process.env.GITHUB_WORKSPACE ?? process.cwd()
  const apiBaseUrl = process.env.GITHUB_API_URL
  const tokenBudget = process.env.ECC_TOKEN_BUDGET ? Number(process.env.ECC_TOKEN_BUDGET) : undefined

  const { owner, repo, prNumber, taskRequest } = loadPullRequestEventContext(eventPath, repoSlug)

  const pkg = await runContext(workspace, taskRequest, { tokenBudget })
  const validation = validateContextPackage(pkg)
  if (!validation.ok) {
    throw new Error(`ECC produced an invalid context package: ${JSON.stringify(validation.errors)}`)
  }

  const commentBody = renderMarkdownReport(validation.value)
  await upsertPrComment({ owner, repo, prNumber, token, apiBaseUrl }, commentBody)

  console.log(`Posted ECC context to ${owner}/${repo}#${prNumber} (${commentBody.length} chars).`)
}
