import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { analyzeRepository } from '../../src/core/repository/repositoryAnalyzer.js';
import { retrieveCodeEvidence } from '../../src/core/evidence/codeEvidenceRetriever.js';

const FIXTURE_ROOT = fileURLToPath(new URL('../fixtures/sample-repo', import.meta.url));

describe('retrieveCodeEvidence (fixture repo)', () => {
  it('ranks files by keyword overlap with the request, matching symbol names too', async () => {
    const repository = await analyzeRepository(FIXTURE_ROOT);
    const evidence = retrieveCodeEvidence(
      { type: 'explain', request: 'How do I make the widget name?' },
      repository,
    );

    const byPath = new Map(evidence.map((e) => [e.path, e]));
    expect(byPath.get('src/utils.ts')?.symbols).toContain('makeName');
    expect(byPath.get('src/index.ts')).toBeDefined();
    expect(byPath.get('src/types.ts')).toBeDefined();

    // utils.ts matches both "make" and "name" - should outrank files matching only "widget".
    expect(evidence[0]?.path).toBe('src/utils.ts');
    expect(evidence.every((e) => e.source === 'code')).toBe(true);
    expect(evidence.every((e) => e.relevance > 0 && e.relevance <= 1)).toBe(true);
  });

  it('returns no evidence when the request has no meaningful keywords', async () => {
    const repository = await analyzeRepository(FIXTURE_ROOT);
    expect(retrieveCodeEvidence({ type: 'explain', request: 'is a to' }, repository)).toEqual([]);
  });
});
