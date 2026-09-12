import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { main } from '../../src/github/runPrCompile.js'

const FIXTURE_REPO = fileURLToPath(new URL('../fixtures/sample-repo', import.meta.url))
const EVENT_PATH = fileURLToPath(new URL('../fixtures/pull-request-event.json', import.meta.url))

function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, statusText: 'OK', json: async () => body, text: async () => '' } as Response
}

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  process.env.GITHUB_EVENT_PATH = EVENT_PATH
  process.env.GITHUB_REPOSITORY = 'ecc-project/ecc'
  process.env.GITHUB_TOKEN = 'test-token'
  process.env.GITHUB_WORKSPACE = FIXTURE_REPO
  delete process.env.ECC_TOKEN_BUDGET
  delete process.env.GITHUB_API_URL
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
  vi.unstubAllGlobals()
})

describe('main (runPrCompile, real runContext pipeline against the fixture repo)', () => {
  it('compiles real context for the PR and posts it as a comment', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(jsonResponse([])).mockResolvedValueOnce(jsonResponse({ id: 1 }))
    vi.stubGlobal('fetch', fetchMock)

    await main()

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const createCall = fetchMock.mock.calls[1]!
    expect(createCall[0]).toBe('https://api.github.com/repos/ecc-project/ecc/issues/42/comments')
    const postedBody = JSON.parse((createCall[1] as RequestInit).body as string).body as string
    expect(postedBody).toContain('sample-repo')
    expect(postedBody).toContain('Refactor the utils module')
  })

  it('throws when a required environment variable is missing', async () => {
    delete process.env.GITHUB_TOKEN

    await expect(main()).rejects.toThrow(/GITHUB_TOKEN/)
  })
})
