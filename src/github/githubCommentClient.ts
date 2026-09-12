const COMMENT_MARKER = '<!-- ecc-context-comment -->'
const DEFAULT_API_BASE_URL = 'https://api.github.com'

export interface PrCommentTarget {
  owner: string
  repo: string
  prNumber: number
  token: string
  apiBaseUrl?: string
}

interface GithubComment {
  id: number
  body: string
}

async function githubRequest(url: string, token: string, init: RequestInit = {}): Promise<Response> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...init.headers,
    },
  })
  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(`GitHub API request to ${url} failed: ${response.status} ${response.statusText} ${detail}`)
  }
  return response
}

async function findExistingComment(target: PrCommentTarget, commentsUrl: string): Promise<GithubComment | undefined> {
  const response = await githubRequest(commentsUrl, target.token)
  const comments = (await response.json()) as GithubComment[]
  return comments.find((comment) => comment.body.includes(COMMENT_MARKER))
}

/**
 * Posts an ECC-compiled context report to a pull request, or replaces the report it previously
 * posted (identified by a hidden marker) instead of piling up a new comment on every push -
 * this is what makes the Phase 13 exit criteria's "posted automatically" safe to run on every
 * `synchronize` event without spamming the PR thread.
 */
export async function upsertPrComment(target: PrCommentTarget, body: string): Promise<void> {
  const base = target.apiBaseUrl ?? DEFAULT_API_BASE_URL
  const commentsUrl = `${base}/repos/${target.owner}/${target.repo}/issues/${target.prNumber}/comments`
  const markedBody = `${COMMENT_MARKER}\n${body}`

  const existing = await findExistingComment(target, commentsUrl)

  if (existing) {
    await githubRequest(`${base}/repos/${target.owner}/${target.repo}/issues/comments/${existing.id}`, target.token, {
      method: 'PATCH',
      body: JSON.stringify({ body: markedBody }),
    })
    return
  }

  await githubRequest(commentsUrl, target.token, {
    method: 'POST',
    body: JSON.stringify({ body: markedBody }),
  })
}
