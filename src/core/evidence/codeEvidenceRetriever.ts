import type { EngineeringTask } from '../types/task.js'
import type { EvidenceItem } from '../types/evidence.js'
import type { ClassifiedFile, FileSymbols, RepositoryAnalysis } from '../repository/types.js'
import { extractKeywords, tokenizeIdentifier } from './keywordExtractor.js'

/** Caps the candidate set on very large repos - ranking/filtering proper is Phase 5's job. */
export const MAX_CODE_CANDIDATES = 50

interface FileScore {
  file: ClassifiedFile
  matchedKeywords: Set<string>
  matchedSymbols: string[]
}

function scoreFile(
  keywords: string[],
  file: ClassifiedFile,
  fileSymbols: FileSymbols | undefined,
): FileScore {
  const matchedKeywords = new Set<string>()
  const pathWords = new Set(tokenizeIdentifier(file.path))
  for (const keyword of keywords) {
    if (pathWords.has(keyword)) {
      matchedKeywords.add(keyword)
    }
  }

  const matchedSymbols: string[] = []
  for (const symbol of fileSymbols?.symbols ?? []) {
    const symbolWords = tokenizeIdentifier(symbol.name)
    const hitKeywords = keywords.filter((keyword) => symbolWords.includes(keyword))
    if (hitKeywords.length > 0) {
      matchedSymbols.push(symbol.name)
      hitKeywords.forEach((keyword) => matchedKeywords.add(keyword))
    }
  }

  return { file, matchedKeywords, matchedSymbols }
}

/**
 * Retrieves candidate source files relevant to a task's free-text request, by matching
 * request keywords against file path segments and resolved symbol names. This is a basic
 * keyword-overlap heuristic sufficient for candidate retrieval - Phase 5 builds proper
 * multi-signal ranking on top of these relevance scores.
 */
export function retrieveCodeEvidence(
  task: EngineeringTask,
  repository: RepositoryAnalysis,
): EvidenceItem[] {
  const keywords = extractKeywords(task.request)
  if (keywords.length === 0) {
    return []
  }

  const symbolsByPath = new Map(repository.symbols.map((s) => [s.path, s]))
  const sourceFiles = repository.files.filter((f) => f.category === 'source')

  const scored = sourceFiles
    .map((file) => scoreFile(keywords, file, symbolsByPath.get(file.path)))
    .filter((s) => s.matchedKeywords.size > 0)

  const items: EvidenceItem[] = scored.map((s) => ({
    source: 'code',
    path: s.file.path,
    symbols: s.matchedSymbols.length > 0 ? s.matchedSymbols : undefined,
    relevance: Math.min(1, s.matchedKeywords.size / keywords.length),
    provenance: { source: 'code', path: s.file.path },
  }))

  return items.sort((a, b) => b.relevance - a.relevance).slice(0, MAX_CODE_CANDIDATES)
}
