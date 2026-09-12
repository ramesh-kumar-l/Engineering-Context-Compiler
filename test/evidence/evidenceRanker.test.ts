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
