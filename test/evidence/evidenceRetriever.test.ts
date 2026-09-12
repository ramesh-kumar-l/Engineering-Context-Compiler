import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { analyzeRepository } from '../../src/core/repository/repositoryAnalyzer.js';
import { retrieveEvidence } from '../../src/core/evidence/evidenceRetriever.js';

const FIXTURE_ROOT = fileURLToPath(new URL('../fixtures/sample-repo', import.meta.url));

describe('retrieveEvidence (fixture repo, real filesystem + git)', () => {
  it('returns code and test evidence relevant to the task, with valid relevance scores', async () => {
    const repository = await analyzeRepository(FIXTURE_ROOT);
    const evidence = retrieveEvidence(
      { type: 'explain', request: 'How do I make the widget name?' },
      repository,
    );

    const sources = new Set(evidence.map((e) => e.source));
    expect(sources.has('code')).toBe(true);
    expect(sources.has('test')).toBe(true);

    // Git evidence depends on this fixture's own commit history in the outer repo, so only
    // its shape (not its count) is asserted here.
    for (const item of evidence) {
      expect(['code', 'test', 'git']).toContain(item.source);
      expect(item.relevance).toBeGreaterThanOrEqual(0);
      expect(item.relevance).toBeLessThanOrEqual(1);
    }
  });

  it('returns an empty array when the request has no meaningful keywords', async () => {
    const repository = await analyzeRepository(FIXTURE_ROOT);
    expect(retrieveEvidence({ type: 'explain', request: 'is a to' }, repository)).toEqual([]);
  });
});
