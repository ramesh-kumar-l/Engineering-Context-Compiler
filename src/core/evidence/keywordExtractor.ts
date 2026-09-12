const STOPWORDS = new Set([
  'a', 'an', 'the', 'to', 'for', 'of', 'in', 'on', 'and', 'or', 'is', 'are',
  'with', 'that', 'this', 'it', 'be', 'as', 'at', 'by', 'from', 'how', 'what',
  'why', 'can', 'you', 'please', 'i', 'we', 'me', 'my', 'our', 'us', 'do',
  'does', 'not', 'so', 'if', 'when', 'there', 'these', 'those', 'need', 'want',
])

const MIN_KEYWORD_LENGTH = 3

/**
 * Splits a file path or identifier (camelCase/PascalCase/snake_case/kebab-case) into
 * lowercase words, so "fileClassifier.ts" and "classify" can be compared as tokens.
 */
export function tokenizeIdentifier(identifier: string): string[] {
  const withoutExtension = identifier.replace(/\.[a-zA-Z0-9]+$/, '')
  const spaced = withoutExtension
    .replace(/[/_.-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
  return spaced
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => word.length >= MIN_KEYWORD_LENGTH)
}

/** Extracts meaningful lowercase keywords from a free-text request, dropping stopwords/short words. */
export function extractKeywords(text: string): string[] {
  const words = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= MIN_KEYWORD_LENGTH && !STOPWORDS.has(word))
  return [...new Set(words)]
}
