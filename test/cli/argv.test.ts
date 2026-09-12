import { describe, expect, it } from 'vitest'
import { parseArgs } from '../../src/cli/argv.js'

describe('parseArgs', () => {
  it('parses a bare context command with the default path', () => {
    const parsed = parseArgs(['context', 'explain', 'the', 'utils', 'module'])
    expect(parsed).toEqual({
      command: 'context',
      args: { request: 'explain the utils module', path: '.', out: undefined, budget: undefined },
    })
  })

  it('parses --path, --out, and --budget flags interleaved with the request', () => {
    const parsed = parseArgs([
      'context',
      'explain',
      '--path',
      '/repo',
      'the utils module',
      '--out',
      'package.json',
      '--budget',
      '2000',
    ])
    expect(parsed).toEqual({
      command: 'context',
      args: { request: 'explain the utils module', path: '/repo', out: 'package.json', budget: 2000 },
    })
  })

  it('returns unknown for anything other than the context command', () => {
    expect(parseArgs([])).toEqual({ command: 'unknown' })
    expect(parseArgs(['help'])).toEqual({ command: 'unknown' })
  })

  it('ignores a non-numeric --budget value rather than throwing', () => {
    const parsed = parseArgs(['context', 'explain it', '--budget', 'notanumber'])
    expect(parsed).toEqual({
      command: 'context',
      args: { request: 'explain it', path: '.', out: undefined, budget: undefined },
    })
  })

  it('parses a memory command with all flags, splitting --tags and --paths on commas', () => {
    const parsed = parseArgs([
      'memory',
      '--type',
      'decision',
      '--summary',
      'use fetch',
      '--detail',
      'no SDK needed',
      '--tags',
      'api, github',
      '--paths',
      'src/a.ts,src/b.ts',
      '--path',
      '/repo',
    ])
    expect(parsed).toEqual({
      command: 'memory',
      args: {
        type: 'decision',
        summary: 'use fetch',
        detail: 'no SDK needed',
        tags: ['api', 'github'],
        relatedPaths: ['src/a.ts', 'src/b.ts'],
        path: '/repo',
      },
    })
  })

  it('parses a bare memory command with the default path and undefined optional fields', () => {
    const parsed = parseArgs(['memory', '--type', 'incident', '--summary', 'it broke'])
    expect(parsed).toEqual({
      command: 'memory',
      args: {
        type: 'incident',
        summary: 'it broke',
        detail: undefined,
        tags: undefined,
        relatedPaths: undefined,
        path: '.',
      },
    })
  })
})
