import type { FileCategory, Language } from './types.js';

/** Directories never worth walking or classifying — build output, VCS, dependency caches. */
export const EXCLUDED_DIRS = new Set([
  'node_modules',
  '.git',
  'dist',
  'build',
  'coverage',
  '.next',
  '.turbo',
  '.cache',
]);

const TEST_PATTERN = /(^|\/)(test|tests|__tests__)\//i;
const TEST_FILE_PATTERN = /\.(test|spec)\.[cm]?[jt]sx?$/i;

const CONFIG_FILENAMES = new Set([
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  '.gitignore',
  '.npmrc',
  '.editorconfig',
]);
const CONFIG_PATTERN = /(^|\/)(tsconfig.*\.json|\.eslintrc.*|.*\.config\.[cm]?[jt]s)$/i;
const DOTFILE_PATTERN = /(^|\/)\.[^/]+$/;

const DOC_EXTENSIONS = new Set(['.md', '.mdx', '.txt']);

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const BUILD_DIR_PATTERN = /(^|\/)(dist|build|coverage)\//i;

function extensionOf(path: string): string {
  const base = path.slice(path.lastIndexOf('/') + 1);
  const dot = base.lastIndexOf('.');
  return dot <= 0 ? '' : base.slice(dot).toLowerCase();
}

/**
 * Classifies a repo-relative, posix-separated file path into a coarse category.
 * Order matters: test/config/doc checks run before the generic source fallback.
 */
export function classifyFile(path: string): FileCategory {
  const base = path.slice(path.lastIndexOf('/') + 1);
  const ext = extensionOf(path);

  if (TEST_PATTERN.test(path) || TEST_FILE_PATTERN.test(base)) {
    return 'test';
  }
  if (BUILD_DIR_PATTERN.test(path)) {
    return 'build';
  }
  if (
    CONFIG_FILENAMES.has(base) ||
    CONFIG_PATTERN.test(base) ||
    (DOTFILE_PATTERN.test(path) && ext === '')
  ) {
    return 'config';
  }
  if (DOC_EXTENSIONS.has(ext)) {
    return 'documentation';
  }
  if (SOURCE_EXTENSIONS.has(ext)) {
    return 'source';
  }
  return 'other';
}

export function detectLanguage(path: string): Language {
  const ext = extensionOf(path);
  if (ext === '.ts' || ext === '.tsx') {
    return 'typescript';
  }
  if (ext === '.js' || ext === '.jsx' || ext === '.mjs' || ext === '.cjs') {
    return 'javascript';
  }
  return 'unknown';
}
