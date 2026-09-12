import { describe, expect, it } from 'vitest';
import { estimateTokens, estimateItemTokens } from '../../src/core/compilation/tokenBudget.js';
import type { EvidenceItem } from '../../src/core/types/evidence.js';

describe('estimateTokens', () => {
  it('returns 0 for empty text', () => {
    expect(estimateTokens('')).toBe(0);
  });

  it('scales roughly with text length', () => {
    const short = estimateTokens('abcd');
    const long = estimateTokens('abcd'.repeat(10));
    expect(long).toBeGreaterThan(short);
    expect(long).toBe(short * 10);
  });
});

describe('estimateItemTokens', () => {
  it('accounts for path, identifier, and symbols text plus a flat overhead', () => {
    const bare: EvidenceItem = { source: 'code', path: 'a.ts', relevance: 0.5 };
    const withSymbols: EvidenceItem = {
      source: 'code',
      path: 'a.ts',
      relevance: 0.5,
      symbols: ['makeName', 'ClassWidget'],
    };

    expect(estimateItemTokens(withSymbols)).toBeGreaterThan(estimateItemTokens(bare));
  });

  it('is never zero, even for a minimal item, because of the flat overhead', () => {
    const minimal: EvidenceItem = { source: 'git', relevance: 0 };
    expect(estimateItemTokens(minimal)).toBeGreaterThan(0);
  });
});
