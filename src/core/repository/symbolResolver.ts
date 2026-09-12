import ts from 'typescript';
import type { ResolvedSymbol, SymbolKind } from './types.js';

export function scriptKindFor(path: string): ts.ScriptKind {
  if (path.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (path.endsWith('.ts')) return ts.ScriptKind.TS;
  if (path.endsWith('.jsx')) return ts.ScriptKind.JSX;
  return ts.ScriptKind.JS;
}

function hasExportModifier(node: ts.Node): boolean {
  const modifiers = ts.canHaveModifiers(node) ? ts.getModifiers(node) : undefined;
  return (modifiers ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
}

function lineOf(sourceFile: ts.SourceFile, node: ts.Node): number {
  return sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
}

function symbolFrom(
  sourceFile: ts.SourceFile,
  node: ts.Node,
  kind: SymbolKind,
  name: string,
): ResolvedSymbol {
  return { name, kind, exported: hasExportModifier(node), line: lineOf(sourceFile, node) };
}

/**
 * Extracts top-level declared symbols from source text using purely syntactic AST parsing
 * (no type checker / program) — sufficient for "what does this file declare and export"
 * without the cost of full cross-file type resolution.
 */
export function resolveSymbols(path: string, sourceText: string): ResolvedSymbol[] {
  const sourceFile = ts.createSourceFile(
    path,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    scriptKindFor(path),
  );

  const symbols: ResolvedSymbol[] = [];

  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name) {
      symbols.push(symbolFrom(sourceFile, statement, 'function', statement.name.text));
    } else if (ts.isClassDeclaration(statement) && statement.name) {
      symbols.push(symbolFrom(sourceFile, statement, 'class', statement.name.text));
    } else if (ts.isInterfaceDeclaration(statement)) {
      symbols.push(symbolFrom(sourceFile, statement, 'interface', statement.name.text));
    } else if (ts.isTypeAliasDeclaration(statement)) {
      symbols.push(symbolFrom(sourceFile, statement, 'type', statement.name.text));
    } else if (ts.isEnumDeclaration(statement)) {
      symbols.push(symbolFrom(sourceFile, statement, 'enum', statement.name.text));
    } else if (ts.isVariableStatement(statement)) {
      for (const decl of statement.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          symbols.push(symbolFrom(sourceFile, statement, 'variable', decl.name.text));
        }
      }
    }
  }

  return symbols;
}
