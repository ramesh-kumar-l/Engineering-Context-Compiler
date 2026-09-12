import type { EvidenceItem } from '../types/evidence.js'
import type { RepositoryAnalysis } from '../repository/types.js'

/** Relevance carried over from the source file this test evidence was found for, damped slightly. */
const TEST_RELEVANCE_FACTOR = 0.9

function basenameWithoutExtension(path: string): string {
  const file = path.split('/').pop() ?? path
  return file.replace(/\.[a-zA-Z0-9]+$/, '')
}

/**
 * Finds test files exercising `codePath`, via two independent signals: a dependency-graph
 * edge (a test file importing the source file) and a naming-convention fallback
 * (`foo.ts` <-> `foo.test.ts` / `foo.spec.ts`), since not every test imports its subject by
 * a resolvable relative path (e.g. fixture-driven or end-to-end style tests).
 */
function findRelatedTestFiles(codePath: string, repository: RepositoryAnalysis): Set<string> {
  const related = new Set<string>()
  const testFiles = repository.files.filter((f) => f.category === 'test')
  const testPaths = new Set(testFiles.map((f) => f.path))

  for (const edge of repository.dependencyGraph.edges) {
    if (edge.to === codePath && testPaths.has(edge.from)) {
      related.add(edge.from)
    }
  }

  const base = basenameWithoutExtension(codePath)
  for (const testFile of testFiles) {
    const testBase = basenameWithoutExtension(testFile.path).replace(/\.(test|spec)$/, '')
    if (testBase === base) {
      related.add(testFile.path)
    }
  }

  return related
}

/** Retrieves test-file evidence related to already-retrieved code evidence. */
export function retrieveTestEvidence(
  codeEvidence: EvidenceItem[],
  repository: RepositoryAnalysis,
): EvidenceItem[] {
  const items = new Map<string, EvidenceItem>()

  for (const code of codeEvidence) {
    if (!code.path) {
      continue
    }
    const relevance = code.relevance * TEST_RELEVANCE_FACTOR
    for (const testPath of findRelatedTestFiles(code.path, repository)) {
      const existing = items.get(testPath)
      if (!existing || relevance > existing.relevance) {
        items.set(testPath, {
          source: 'test',
          path: testPath,
          relevance,
          provenance: { source: 'test', path: testPath },
        })
      }
    }
  }

  return [...items.values()].sort((a, b) => b.relevance - a.relevance)
}
