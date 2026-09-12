import { readFileSync } from 'node:fs'

export interface PullRequestEventContext {
  owner: string
  repo: string
  prNumber: number
  taskRequest: string
}

const FALLBACK_TASK_REQUEST = 'Review the changes in this pull request'

/**
 * Reads a GitHub Actions `pull_request` event payload off disk (the path GitHub sets in
 * `GITHUB_EVENT_PATH`) and reduces it to exactly what runContext() needs: which PR to comment
 * on, and a free-text task request derived from its title/body. Never touches the network.
 */
export function loadPullRequestEventContext(eventPath: string, repoSlug: string): PullRequestEventContext {
  const [owner, repo] = repoSlug.split('/')
  if (!owner || !repo) {
    throw new Error(`GITHUB_REPOSITORY must be "<owner>/<repo>", got "${repoSlug}"`)
  }

  const raw: unknown = JSON.parse(readFileSync(eventPath, 'utf8'))
  const pullRequest = (raw as { pull_request?: unknown }).pull_request as
    | { number?: unknown; title?: unknown; body?: unknown }
    | undefined
  if (!pullRequest || typeof pullRequest.number !== 'number') {
    throw new Error('Event payload has no pull_request - is this workflow triggered by a pull_request event?')
  }

  const title = typeof pullRequest.title === 'string' ? pullRequest.title : ''
  const body = typeof pullRequest.body === 'string' ? pullRequest.body : ''
  const taskRequest = [title, body].filter((part) => part.trim() !== '').join('\n\n') || FALLBACK_TASK_REQUEST

  return { owner, repo, prNumber: pullRequest.number, taskRequest }
}
