import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { analyzeRepository } from '../../src/core/repository/repositoryAnalyzer.js';

const FIXTURE_ROOT = fileURLToPath(new URL('../fixtures/sample-repo', import.meta.url));

describe('analyzeRepository (fixture repo, real filesystem)', () => {
  it('classifies files, resolves symbols, and links dependencies', async () => {
    const analysis = await analyzeRepository(FIXTURE_ROOT);
    const byPath = new Map(analysis.files.map((f) => [f.path, f]));

    expect(byPath.get('src/index.ts')).toEqual({
      path: 'src/index.ts',
      category: 'source',
      language: 'typescript',
    });
    expect(byPath.get('test/index.test.ts')?.category).toBe('test');
    expect(byPath.get('package.json')?.category).toBe('config');
    expect(byPath.get('README.md')?.category).toBe('documentation');

    const utilsSymbols = analysis.symbols.find((s) => s.path === 'src/utils.ts');
    expect(utilsSymbols?.symbols.map((s) => s.name).sort()).toEqual(
      ['DEFAULT_NAME', 'NameFactory', 'internalHelper', 'makeName'].sort(),
    );
    expect(utilsSymbols?.symbols.find((s) => s.name === 'internalHelper')?.exported).toBe(false);
    expect(utilsSymbols?.symbols.find((s) => s.name === 'makeName')?.exported).toBe(true);

    const edge = analysis.dependencyGraph.edges.find(
      (e) => e.from === 'src/index.ts' && e.to === 'src/utils.ts',
    );
    expect(edge).toEqual({ from: 'src/index.ts', to: 'src/utils.ts', external: false });
  });
});
