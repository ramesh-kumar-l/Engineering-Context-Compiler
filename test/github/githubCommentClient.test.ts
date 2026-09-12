import { afterEach, describe, expect, it, vi } from 'vitest'
import { upsertPrComment } from '../../src/github/githubCommentClient.js'

const TARGET = { owner: 'ecc-project', repo: 'ecc', prNumber: 42, token: 'test-token' }

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    statusText: ok ? 'OK' : 'Error',
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('upsertPrComment', () => {
  it('creates a new comment when no existing ECC comment is found', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([])) // GET list
      .mockResolvedValueOnce(jsonResponse({ id: 1 })) // POST create
    vi.stubGlobal('fetch', fetchMock)

    await upsertPrComment(TARGET, '## Context')

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const [listCall, createCall] = fetchMock.mock.calls
    expect(listCall![0]).toBe('https://api.github.com/repos/ecc-project/ecc/issues/42/comments')
    expect(createCall![1]).toMatchObject({ method: 'POST' })
    expect(JSON.parse((createCall![1] as RequestInit).body as string).body).toContain('ecc-context-comment')
  })

  it('updates the existing ECC comment instead of creating a duplicate', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse([{ id: 7, body: '<!-- ecc-context-comment -->\nold' }]))
      .mockResolvedValueOnce(jsonResponse({ id: 7 }))
    vi.stubGlobal('fetch', fetchMock)

    await upsertPrComment(TARGET, '## New context')

    expect(fetchMock).toHaveBeenCalledTimes(2)
    const [, updateCall] = fetchMock.mock.calls
    expect(updateCall![0]).toBe('https://api.github.com/repos/ecc-project/ecc/issues/comments/7')
    expect(updateCall![1]).toMatchObject({ method: 'PATCH' })
  })

  it('throws when the GitHub API responds with an error', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce(jsonResponse('nope', false, 403)))

    await expect(upsertPrComment(TARGET, 'body')).rejects.toThrow(/403/)
  })
})
