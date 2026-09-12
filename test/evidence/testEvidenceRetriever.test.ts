import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { analyzeRepository } from '../../src/core/repository/repositoryAnalyzer.js';
import { retrieveCodeEvidence } from '../../src/core/evidence/codeEvidenceRetriever.js';
import { retrieveTestEvidence } from '../../src/core/evidence/testEvidenceRetriever.js';

const FIXTURE_ROOT = fileURLToPath(new URL('../fixtures/sample-repo', import.meta.url));

describe('retrieveTestEvidence (fixture repo)', () => {
  it('finds the test file that imports the matched source file via the dependency graph', async () => {
    const repository = await analyzeRepository(FIXTURE_ROOT);
    const codeEvidence = retrieveCodeEvidence(
      { type: 'test', request: 'How do I make the widget name?' },
      repository,
    );
    const testEvidence = retrieveTestEvidence(codeEvidence, repository);

    expect(testEvidence).toHaveLength(1);
    expect(testEvidence[0]).toMatchObject({ source: 'test', path: 'test/index.test.ts' });
    expect(testEvidence[0]?.relevance).toBeLessThan(
      codeEvidence.find((e) => e.path === 'src/index.ts')?.relevance ?? 0,
    );
  });

  it('returns no evidence when no code evidence paths have related tests', () => {
    const repository = { root: '.', files: [], symbols: [], dependencyGraph: { edges: [] } };
    const codeEvidence = [{ source: 'code' as const, path: 'src/orphan.ts', relevance: 1 }];
    expect(retrieveTestEvidence(codeEvidence, repository)).toEqual([]);
  });
});
