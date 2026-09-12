export const FILE_CATEGORIES = [
  'source',
  'test',
  'config',
  'documentation',
  'build',
  'other',
] as const;
export type FileCategory = (typeof FILE_CATEGORIES)[number];

export const LANGUAGES = ['typescript', 'javascript', 'unknown'] as const;
export type Language = (typeof LANGUAGES)[number];

export interface ClassifiedFile {
  /** Repo-relative, posix-separated path. */
  path: string;
  category: FileCategory;
  language: Language;
}

export const SYMBOL_KINDS = [
  'function',
  'class',
  'interface',
  'type',
  'enum',
  'variable',
] as const;
export type SymbolKind = (typeof SYMBOL_KINDS)[number];

export interface ResolvedSymbol {
  name: string;
  kind: SymbolKind;
  exported: boolean;
  /** 1-based line number where the declaration starts. */
  line: number;
}

export interface FileSymbols {
  path: string;
  symbols: ResolvedSymbol[];
}

export interface DependencyEdge {
  /** Repo-relative path of the importing file. */
  from: string;
  /** Repo-relative path of the imported file, or the raw specifier if unresolved. */
  to: string;
  /** True when `to` could not be resolved to a file inside the repo (e.g. an npm package). */
  external: boolean;
}

export interface DependencyGraph {
  edges: DependencyEdge[];
}

export interface RepositoryAnalysis {
  root: string;
  files: ClassifiedFile[];
  symbols: FileSymbols[];
  dependencyGraph: DependencyGraph;
}
