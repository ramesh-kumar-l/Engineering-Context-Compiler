import { posix } from 'node:path';
import ts from 'typescript';
import { scriptKindFor } from './symbolResolver.js';
import type { DependencyEdge, DependencyGraph } from './types.js';

/**
 * Extracts raw module specifiers referenced by a file: static imports/exports-from,
 * and `require(...)`/dynamic `import(...)` calls. Resolution to actual repo files happens
 * separately in {@link resolveImportSpecifier}.
 */
export function extractImports(path: string, sourceText: string): string[] {
  const sourceFile = ts.createSourceFile(
    path,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    scriptKindFor(path),
  );

  const specifiers: string[] = [];

  function visit(node: ts.Node): void {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text);
    } else if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'require')) &&
      node.arguments.length > 0 &&
      ts.isStringLiteral(node.arguments[0]!)
    ) {
      specifiers.push((node.arguments[0] as ts.StringLiteral).text);
    }
    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return specifiers;
}

const EXTENSIONLESS_SUFFIXES = ['.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js'];

/** Maps a TS-ESM-style `.js`/`.jsx`/`.mjs` specifier onto the `.ts`/`.tsx` source it compiles from. */
function sourceExtensionCandidate(joined: string): string | null {
  if (joined.endsWith('.mjs')) return joined.slice(0, -4) + '.ts';
  if (joined.endsWith('.jsx')) return joined.slice(0, -4) + '.tsx';
  if (joined.endsWith('.js')) return joined.slice(0, -3) + '.ts';
  return null;
}

/**
 * Resolves an import specifier found in `fromFile` against the known repo-relative file
 * set. Bare specifiers (npm packages) and relative specifiers that don't match a known
 * file are both reported as external — the graph only asserts edges it can verify.
 */
export function resolveImportSpecifier(
  fromFile: string,
  specifier: string,
  knownFiles: ReadonlySet<string>,
): { to: string; external: boolean } {
  if (!specifier.startsWith('.')) {
    return { to: specifier, external: true };
  }

  const joined = posix.normalize(posix.join(posix.dirname(fromFile), specifier));
  const candidates = [joined];
  const sourceCandidate = sourceExtensionCandidate(joined);
  if (sourceCandidate) candidates.push(sourceCandidate);
  for (const suffix of EXTENSIONLESS_SUFFIXES) candidates.push(joined + suffix);

  for (const candidate of candidates) {
    if (knownFiles.has(candidate)) {
      return { to: candidate, external: false };
    }
  }
  return { to: joined, external: true };
}

export interface FileContent {
  path: string;
  content: string;
}

/** Builds a repo-wide dependency graph from each source file's import specifiers. */
export function buildDependencyGraph(files: readonly FileContent[]): DependencyGraph {
  const knownFiles = new Set(files.map((f) => f.path));
  const edges: DependencyEdge[] = [];

  for (const file of files) {
    for (const specifier of extractImports(file.path, file.content)) {
      const { to, external } = resolveImportSpecifier(file.path, specifier, knownFiles);
      edges.push({ from: file.path, to, external });
    }
  }

  return { edges };
}
