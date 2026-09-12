import { describe, expect, it } from 'vitest';
import { extractKeywords, tokenizeIdentifier } from '../../src/core/evidence/keywordExtractor.js';

describe('extractKeywords', () => {
  it('lowercases, dedupes, and drops stopwords/short words', () => {
    expect(extractKeywords('How do I fix the widget name bug?')).toEqual([
      'fix',
      'widget',
      'name',
      'bug',
    ]);
  });

  it('returns an empty array for text with no meaningful words', () => {
    expect(extractKeywords('is a to')).toEqual([]);
  });
});

describe('tokenizeIdentifier', () => {
  it('splits camelCase, file extensions, and path separators into lowercase words', () => {
    expect(tokenizeIdentifier('src/fileClassifier.ts')).toEqual(['src', 'file', 'classifier']);
  });

  it('splits snake_case and kebab-case', () => {
    expect(tokenizeIdentifier('make_widget-name')).toEqual(['make', 'widget', 'name']);
  });
});
