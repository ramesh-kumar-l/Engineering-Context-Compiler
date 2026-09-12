import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { walkRepository } from '../repository/walker.js'
import { classifyFile } from '../repository/fileClassifier.js'
import { extractKeywords, tokenizeIdentifier } from '../evidence/keywordExtractor.js'
import { estimateTokens } from '../compilation/tokenBudget.js'

export interface BaselineRetrieval {
  paths: string[]
  totalTokens: number
}

/**
 * Simulates the "agent alone" condition Phase 11's exit criteria needs ECC compared against:
 * no repository model, no ranking, no trust/provenance, no compression - just a keyword grep
 * over source-file paths in filesystem-walk order, reading each matched file whole (as an
 * agent using a generic text-search tool would) until the token budget runs out. Deliberately
 * dependency-free and offline (no LLM call) so the comparison stays deterministic and CI-safe,
 * see [[04-decisions]] #17.
 */
export async function retrieveBaselineEvidence(
  rootDir: string,
  request: string,
  tokenBudget: number,
): Promise<BaselineRetrieval> {
  const keywords = extractKeywords(request)
  const files = await walkRepository(rootDir)

  const paths: string[] = []
  let totalTokens = 0

  for (const file of files) {
    if (classifyFile(file.path) !== 'source') continue
    if (totalTokens >= tokenBudget) break

    const pathWords = tokenizeIdentifier(file.path)
    const matches = keywords.some((keyword) =>
      pathWords.some((word) => word.includes(keyword) || keyword.includes(word)),
    )
    if (!matches) continue

    const content = await readFile(join(rootDir, file.path), 'utf8')
    totalTokens += estimateTokens(content)
    paths.push(file.path)
  }

  return { paths, totalTokens }
}
