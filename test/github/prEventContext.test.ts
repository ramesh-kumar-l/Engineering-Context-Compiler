import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { loadPullRequestEventContext } from '../../src/github/prEventContext.js'

const EVENT_PATH = fileURLToPath(new URL('../fixtures/pull-request-event.json', import.meta.url))

describe('loadPullRequestEventContext', () => {
  it('extracts owner, repo, PR number, and a task request from the event payload', () => {
    const context = loadPullRequestEventContext(EVENT_PATH, 'ecc-project/ecc')

    expect(context).toEqual({
      owner: 'ecc-project',
      repo: 'ecc',
      prNumber: 42,
      taskRequest: 'Refactor the utils module\n\nCleans up the sample-repo utils helpers ahead of the next release.',
    })
  })

  it('rejects a malformed GITHUB_REPOSITORY value', () => {
    expect(() => loadPullRequestEventContext(EVENT_PATH, 'not-a-slug')).toThrow(/GITHUB_REPOSITORY/)
  })

  it('rejects a payload without a pull_request field', () => {
    const tempPath = fileURLToPath(new URL('../fixtures/sample-repo/package.json', import.meta.url))

    expect(() => loadPullRequestEventContext(tempPath, 'ecc-project/ecc')).toThrow(/pull_request/)
  })
})
