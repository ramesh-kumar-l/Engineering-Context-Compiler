import { describe, expect, it } from 'vitest';
import { selectEvidence, isPrimarySource } from '../../src/core/compilation/contextSelector.js';
import type { EvidenceItem } from '../../src/core/types/evidence.js';

function item(partial: Partial<EvidenceItem> & Pick<EvidenceItem, 'source' | 'relevance'>): EvidenceItem {
  return { path: partial.path ?? partial.identifier, ...partial };
}

describe('isPrimarySource', () => {
  it('treats code and test as primary, everything else as supporting', () => {
    expect(isPrimarySource('code')).toBe(true);
    expect(isPrimarySource('test')).toBe(true);
    expect(isPrimarySource('git')).toBe(false);
    expect(isPrimarySource('documentation')).toBe(false);
  });
});

describe('selectEvidence (known-good orderings)', () => {
  it('includes every item and excludes nothing when the budget is generous', () => {
    const items = [
      item({ source: 'code', path: 'a.ts', relevance: 0.9 }),
      item({ source: 'test', path: 'a.test.ts', relevance: 0.7 }),
      item({ source: 'git', path: 'a.ts', identifier: 'fix', relevance: 0.5 }),
    ];

    const result = selectEvidence(items, 10_000);

    expect(result.primary).toHaveLength(2);
    expect(result.supporting).toHaveLength(1);
    expect(result.excluded).toEqual([]);
  });

  it('splits primary (code/test) from supporting (everything else)', () => {
    const code = item({ source: 'code', path: 'a.ts', relevance: 0.9 });
    const test = item({ source: 'test', path: 'a.test.ts', relevance: 0.6 });
    const git = item({ source: 'git', path: 'a.ts', identifier: 'fix', relevance: 0.4 });
    const doc = item({ source: 'documentation', path: 'README.md', relevance: 0.3 });

    const result = selectEvidence([code, test, git, doc], 10_000);

    expect(result.primary).toEqual([code, test]);
    expect(result.supporting).toEqual([git, doc]);
  });

  it('excludes lower-ranked items that do not fit the budget, with a reason and count', () => {
    // Each item costs the same, so a budget sized for exactly one item's worth of tokens
    // must keep the first (highest-ranked) item and exclude the rest.
    const items = [
      item({ source: 'code', path: 'a.ts', relevance: 0.9 }),
      item({ source: 'code', path: 'b.ts', relevance: 0.8 }),
      item({ source: 'code', path: 'c.ts', relevance: 0.7 }),
    ];
    const oneItemBudget = 12 + Math.ceil('a.ts'.length / 4);

    const result = selectEvidence(items, oneItemBudget);

    expect(result.primary).toEqual([items[0]]);
    expect(result.excluded).toEqual([{ reason: 'token_budget_exceeded', count: 2 }]);
  });

  it('keeps ranked order intact within primary/supporting - never reorders on its own', () => {
    const items = [
      item({ source: 'code', path: 'a.ts', relevance: 0.9 }),
      item({ source: 'code', path: 'b.ts', relevance: 0.5 }),
    ];

    const result = selectEvidence(items, 10_000);
    expect(result.primary).toEqual(items);
  });

  it('lets a smaller later item fill space an earlier oversized item could not use', () => {
    const big = item({
      source: 'code',
      path: 'huge.ts',
      relevance: 0.9,
      symbols: Array.from({ length: 50 }, (_, i) => `verboseSymbolName${i}`),
    });
    const small = item({ source: 'git', path: 'a.ts', identifier: 'fix', relevance: 0.5 });

    // Budget too small for `big` but large enough for `small` alone.
    const budget = 12 + Math.ceil('fix'.length / 4) + 5;
    const result = selectEvidence([big, small], budget);

    expect(result.primary).toEqual([]);
    expect(result.supporting).toEqual([small]);
    expect(result.excluded).toEqual([{ reason: 'token_budget_exceeded', count: 1 }]);
  });

  it('does not mutate the input array', () => {
    const items = [item({ source: 'code', path: 'a.ts', relevance: 0.9 })];
    const original = [...items];

    selectEvidence(items, 10_000);

    expect(items).toEqual(original);
  });
});
