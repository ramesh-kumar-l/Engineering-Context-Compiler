import { describe, expect, it } from 'vitest';
import {
  buildDependencyGraph,
  extractImports,
  resolveImportSpecifier,
} from '../../src/core/repository/dependencyAnalyzer.js';

describe('extractImports', () => {
  it('finds static import and re-export specifiers', () => {
    const source = `
      import { a } from './a.js';
      import type { B } from './b.js';
      export { c } from './c.js';
      export * from 'external-pkg';
    `;
    expect(extractImports('src/index.ts', source)).toEqual([
      './a.js',
      './b.js',
      './c.js',
      'external-pkg',
    ]);
  });

  it('finds require() and dynamic import() calls', () => {
    const source = `
      const a = require('./a.js');
      const b = await import('./b.js');
    `;
    expect(extractImports('src/index.ts', source)).toEqual(['./a.js', './b.js']);
  });
});

describe('resolveImportSpecifier', () => {
  const knownFiles = new Set(['src/index.ts', 'src/utils.ts', 'src/nested/index.ts']);

  it('marks bare package specifiers as external', () => {
    expect(resolveImportSpecifier('src/index.ts', 'zod', knownFiles)).toEqual({
      to: 'zod',
      external: true,
    });
  });

  it('maps a .js specifier onto its .ts source', () => {
    expect(resolveImportSpecifier('src/index.ts', './utils.js', knownFiles)).toEqual({
      to: 'src/utils.ts',
      external: false,
    });
  });

  it('resolves extensionless directory imports to an index file', () => {
    expect(resolveImportSpecifier('src/index.ts', './nested', knownFiles)).toEqual({
      to: 'src/nested/index.ts',
      external: false,
    });
  });

  it('reports unresolved relative specifiers as external', () => {
    expect(resolveImportSpecifier('src/index.ts', './missing.js', knownFiles)).toEqual({
      to: 'src/missing.js',
      external: true,
    });
  });
});

describe('buildDependencyGraph', () => {
  it('builds edges across a small file set, distinguishing internal from external', () => {
    const graph = buildDependencyGraph([
      { path: 'src/index.ts', content: "import { a } from './utils.js';\nimport 'zod';" },
      { path: 'src/utils.ts', content: 'export const a = 1;' },
    ]);

    expect(graph.edges).toEqual([
      { from: 'src/index.ts', to: 'src/utils.ts', external: false },
      { from: 'src/index.ts', to: 'zod', external: true },
    ]);
  });
});
