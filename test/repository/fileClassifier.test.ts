import { describe, expect, it } from 'vitest';
import { classifyFile, detectLanguage } from '../../src/core/repository/fileClassifier.js';

describe('classifyFile', () => {
  it('classifies test files by suffix', () => {
    expect(classifyFile('src/utils.test.ts')).toBe('test');
    expect(classifyFile('src/utils.spec.js')).toBe('test');
  });

  it('classifies test files by directory', () => {
    expect(classifyFile('test/repository/foo.ts')).toBe('test');
    expect(classifyFile('__tests__/foo.ts')).toBe('test');
  });

  it('classifies known config files and patterns', () => {
    expect(classifyFile('package.json')).toBe('config');
    expect(classifyFile('tsconfig.json')).toBe('config');
    expect(classifyFile('vitest.config.ts')).toBe('config');
    expect(classifyFile('.eslintrc.json')).toBe('config');
  });

  it('classifies documentation files', () => {
    expect(classifyFile('README.md')).toBe('documentation');
    expect(classifyFile('docs/guide.mdx')).toBe('documentation');
  });

  it('classifies build output', () => {
    expect(classifyFile('dist/index.js')).toBe('build');
  });

  it('classifies plain source files', () => {
    expect(classifyFile('src/core/index.ts')).toBe('source');
    expect(classifyFile('src/legacy.js')).toBe('source');
  });

  it('falls back to other for unrecognized files', () => {
    expect(classifyFile('assets/logo.png')).toBe('other');
  });
});

describe('detectLanguage', () => {
  it('detects typescript', () => {
    expect(detectLanguage('src/index.ts')).toBe('typescript');
    expect(detectLanguage('src/App.tsx')).toBe('typescript');
  });

  it('detects javascript', () => {
    expect(detectLanguage('src/index.js')).toBe('javascript');
    expect(detectLanguage('src/index.mjs')).toBe('javascript');
  });

  it('reports unknown for everything else', () => {
    expect(detectLanguage('README.md')).toBe('unknown');
  });
});
