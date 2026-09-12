import { readFile } from 'node:fs/promises';
import { classifyFile, detectLanguage } from './fileClassifier.js';
import { resolveSymbols } from './symbolResolver.js';
import { buildDependencyGraph, type FileContent } from './dependencyAnalyzer.js';
import { walkRepository } from './walker.js';
import type { ClassifiedFile, FileSymbols, RepositoryAnalysis } from './types.js';

/**
 * Analyzes a real directory tree: classifies every file, resolves top-level symbols for
 * TypeScript/JavaScript source files, and builds a dependency graph between them.
 * This is intentionally shallow (syntactic parsing, no type checker) — enough for Phase 2's
 * "what exists and how does it connect" question, not a full semantic analysis.
 */
export async function analyzeRepository(rootDir: string): Promise<RepositoryAnalysis> {
  const walked = await walkRepository(rootDir);

  const files: ClassifiedFile[] = walked.map((w) => ({
    path: w.path,
    category: classifyFile(w.path),
    language: detectLanguage(w.path),
  }));

  const sourceFiles = files.filter(
    (f) => f.category === 'source' && f.language !== 'unknown',
  );
  const pathToAbsolute = new Map(walked.map((w) => [w.path, w.absolute]));

  const contents: FileContent[] = await Promise.all(
    sourceFiles.map(async (f) => ({
      path: f.path,
      content: await readFile(pathToAbsolute.get(f.path)!, 'utf8'),
    })),
  );

  const symbols: FileSymbols[] = contents.map((f) => ({
    path: f.path,
    symbols: resolveSymbols(f.path, f.content),
  }));

  const dependencyGraph = buildDependencyGraph(contents);

  return { root: rootDir, files, symbols, dependencyGraph };
}
