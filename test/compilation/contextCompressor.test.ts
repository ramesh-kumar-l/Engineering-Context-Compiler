import { describe, expect, it } from 'vitest';
import { compressEvidenceItem, MAX_SYMBOLS_PER_ITEM } from '../../src/core/compilation/contextCompressor.js';
import type { EvidenceItem } from '../../src/core/types/evidence.js';

describe('compressEvidenceItem', () => {
  it('truncates symbols beyond the max, keeping the front of the list', () => {
    const symbols = Array.from({ length: MAX_SYMBOLS_PER_ITEM + 5 }, (_, i) => `sym${i}`);
    const item: EvidenceItem = { source: 'code', path: 'a.ts', relevance: 0.8, symbols };

    const compressed = compressEvidenceItem(item);

    expect(compressed.symbols).toHaveLength(MAX_SYMBOLS_PER_ITEM);
    expect(compressed.symbols).toEqual(symbols.slice(0, MAX_SYMBOLS_PER_ITEM));
  });

  it('leaves items at or under the cap untouched', () => {
    const item: EvidenceItem = { source: 'code', path: 'a.ts', relevance: 0.8, symbols: ['one', 'two'] };
    expect(compressEvidenceItem(item)).toEqual(item);
  });

  it('leaves items without symbols untouched', () => {
    const item: EvidenceItem = { source: 'git', identifier: 'fix bug', relevance: 0.4 };
    expect(compressEvidenceItem(item)).toEqual(item);
  });

  it('does not mutate the input item', () => {
    const symbols = Array.from({ length: MAX_SYMBOLS_PER_ITEM + 3 }, (_, i) => `sym${i}`);
    const item: EvidenceItem = { source: 'code', path: 'a.ts', relevance: 0.8, symbols };
    const originalSymbols = [...symbols];

    compressEvidenceItem(item);

    expect(item.symbols).toEqual(originalSymbols);
  });
});
