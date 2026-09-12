import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { analyzeRepository } from '../../src/core/repository/repositoryAnalyzer.js';
import { retrieveEvidence } from '../../src/core/evidence/evidenceRetriever.js';
import { rankEvidence } from '../../src/core/evidence/evidenceRanker.js';
import type { EvidenceItem } from '../../src/core/types/evidence.js';

const FIXTURE_ROOT = fileURLToPath(new URL('../fixtures/sample-repo', import.meta.url));

function item(partial: Partial<EvidenceItem> & Pick<EvidenceItem, 'source' | 'relevance'>): EvidenceItem {
  return { path: partial.path ?? partial.identifier, ...partial };
}

describe('rankEvidence (known-good orderings)', () => {
  it('orders by relevance within the same source type', () => {
    const low = item({ source: 'code', path: 'a.ts', relevance: 0.3 });
    const high = item({ source: 'code', path: 'b.ts', relevance: 0.9 });

    expect(rankEvidence([low, high])).toEqual([high, low]);
  });

  it('lets source authority reorder items relative to relevance alone', () => {
    // Sorting by relevance alone would put the git item first (0.7 > 0.5); ranking must not.
    const codeItem = item({ source: 'code', path: 'core.ts', relevance: 0.5 });
    const gitItem = item({ source: 'git', path: 'core.ts', identifier: 'fix bug', relevance: 0.7 });

    const byRelevanceAlone = [...([gitItem, codeItem])].sort((a, b) => b.relevance - a.relevance);
    expect(byRelevanceAlone[0]).toBe(gitItem);

    const ranked = rankEvidence([gitItem, codeItem]);
    expect(ranked[0]).toBe(codeItem);
    expect(ranked[1]).toBe(gitItem);
  });

  it('gives a specificity bonus to items with resolved symbol matches', () => {
    const withSymbol = item({ source: 'code', path: 'a.ts', relevance: 0.6, symbols: ['makeName'] });
    const withoutSymbol = item({ source: 'code', path: 'b.ts', relevance: 0.6 });

    expect(rankEvidence([withoutSymbol, withSymbol])).toEqual([withSymbol, withoutSymbol]);
  });

  it('breaks exact ties deterministically by source-type priority, then by path', () => {
    const test = item({ source: 'test', path: 'z.test.ts', relevance: 1 });
    const code = item({ source: 'code', path: 'a.ts', relevance: 1 });
    const gitEqual = item({ source: 'code', path: 'b.ts', relevance: 1 });

    const ranked = rankEvidence([test, gitEqual, code]);
    expect(ranked.map((e) => e.path)).toEqual(['a.ts', 'b.ts', 'z.test.ts']);
  });

  it('does not mutate the input array and does not drop items', () => {
    const items = [
      item({ source: 'git', path: 'a.ts', identifier: 'x', relevance: 0.2 }),
      item({ source: 'code', path: 'a.ts', relevance: 0.4 }),
    ];
    const original = [...items];

    const ranked = rankEvidence(items);

    expect(items).toEqual(original);
    expect(ranked).toHaveLength(items.length);
  });
});

describe('rankEvidence (outcome feedback, Phase 16)', () => {
  it('leaves ordering unchanged when no outcome adjustments are passed', () => {
    const a = item({ source: 'code', path: 'a.ts', relevance: 0.6 });
    const b = item({ source: 'code', path: 'b.ts', relevance: 0.6 });

    expect(rankEvidence([a, b])).toEqual(rankEvidence([a, b], new Map()));
  });

  it('lets a positive outcome adjustment promote an item over an equally-relevant peer', () => {
    const boosted = item({ source: 'code', path: 'a.ts', relevance: 0.6 });
    const plain = item({ source: 'code', path: 'b.ts', relevance: 0.6 });

    const ranked = rankEvidence([plain, boosted], new Map([['a.ts', 2]]));
    expect(ranked[0]).toBe(boosted);
  });

  it('lets a negative outcome adjustment demote an item below an equally-relevant peer', () => {
    const penalized = item({ source: 'code', path: 'a.ts', relevance: 0.6 });
    const plain = item({ source: 'code', path: 'b.ts', relevance: 0.6 });

    const ranked = rankEvidence([penalized, plain], new Map([['a.ts', -2]]));
    expect(ranked[0]).toBe(plain);
  });

  it('never lets outcome feedback override the source-authority gap', () => {
    const codeItem = item({ source: 'code', path: 'core.ts', relevance: 0.5 });
    const gitItem = item({ source: 'git', path: 'core.ts', identifier: 'fix bug', relevance: 0.5 });

    // Even a maximally negative adjustment against the code item shouldn't flip it below git.
    const ranked = rankEvidence([gitItem, codeItem], new Map([['core.ts', -2]]));
    expect(ranked[0]).toBe(codeItem);
  });

  it('does not adjust items with no path', () => {
    const noPath: EvidenceItem = { source: 'git', relevance: 0.6 };
    expect(() => rankEvidence([noPath], new Map([['whatever', 2]]))).not.toThrow();
  });
});

describe('rankEvidence (fixture repo, integration with retrieveEvidence)', () => {
  it('ranks matching code evidence above the test evidence for the same file', async () => {
    const repository = await analyzeRepository(FIXTURE_ROOT);
    const evidence = retrieveEvidence(
      { type: 'explain', request: 'How do I make the widget name?' },
      repository,
    );

    const ranked = rankEvidence(evidence);
    const firstCodeIndex = ranked.findIndex((e) => e.source === 'code');
    const firstTestIndex = ranked.findIndex((e) => e.source === 'test');

    expect(firstCodeIndex).toBeGreaterThanOrEqual(0);
    expect(firstTestIndex).toBeGreaterThan(firstCodeIndex);
  });
});
