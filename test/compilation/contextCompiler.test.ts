import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { analyzeRepository } from '../../src/core/repository/repositoryAnalyzer.js';
import { retrieveEvidence } from '../../src/core/evidence/evidenceRetriever.js';
import { rankEvidence } from '../../src/core/evidence/evidenceRanker.js';
import { compileContext } from '../../src/core/compilation/contextCompiler.js';
import { validateContextPackage } from '../../src/core/schema/validate.js';
import type { EvidenceItem } from '../../src/core/types/evidence.js';

const FIXTURE_ROOT = fileURLToPath(new URL('../fixtures/sample-repo', import.meta.url));

function item(partial: Partial<EvidenceItem> & Pick<EvidenceItem, 'source' | 'relevance'>): EvidenceItem {
  return { path: partial.path ?? partial.identifier, ...partial };
}

describe('compileContext (known-good cases)', () => {
  const task = { type: 'explain' as const, request: 'How do I make the widget name?' };
  const repository = { name: 'sample-repo', commit: 'abc123' };

  it('produces a schema-valid package with a generous budget and no exclusions', () => {
    const ranked = rankEvidence([
      item({ source: 'code', path: 'a.ts', relevance: 0.9, symbols: ['makeName'] }),
      item({ source: 'test', path: 'a.test.ts', relevance: 0.6 }),
    ]);

    const pkg = compileContext(task, repository, ranked, { tokenBudget: 10_000 });

    const result = validateContextPackage(pkg);
    expect(result.ok).toBe(true);
    expect(pkg.context.primary).toHaveLength(2);
    expect(pkg.excluded).toEqual([]);
  });

  it('populates excluded reasons when the budget is tight, and still produces a valid package', () => {
    const ranked = rankEvidence([
      item({ source: 'code', path: 'a.ts', relevance: 0.9 }),
      item({ source: 'code', path: 'b.ts', relevance: 0.8 }),
      item({ source: 'code', path: 'c.ts', relevance: 0.7 }),
    ]);

    const pkg = compileContext(task, repository, ranked, { tokenBudget: 15 });

    const result = validateContextPackage(pkg);
    expect(result.ok).toBe(true);
    expect(pkg.excluded.length).toBeGreaterThan(0);
    const [firstExclusion] = pkg.excluded;
    expect(firstExclusion?.reason).toBe('token_budget_exceeded');
    expect(firstExclusion?.count).toBeGreaterThan(0);
  });

  it('returns a valid, empty-evidence package when given no evidence', () => {
    const pkg = compileContext(task, repository, []);
    expect(validateContextPackage(pkg).ok).toBe(true);
    expect(pkg.context.primary).toEqual([]);
    expect(pkg.context.supporting).toEqual([]);
    expect(pkg.excluded).toEqual([]);
    expect(pkg.conflicts).toEqual([]);
  });

  it('attaches an explicit trust level and guaranteed provenance to every included item', () => {
    const ranked = rankEvidence([
      item({ source: 'code', path: 'a.ts', relevance: 0.9 }),
      item({ source: 'memory', identifier: 'past-note', relevance: 0.3 }),
    ]);

    const pkg = compileContext(task, repository, ranked, { tokenBudget: 10_000 });

    const allItems = [...pkg.context.primary, ...pkg.context.supporting];
    expect(allItems.length).toBeGreaterThan(0);
    for (const evidenceItem of allItems) {
      expect(evidenceItem.provenance).toBeDefined();
      expect(['fact', 'derived', 'inference', 'unknown']).toContain(evidenceItem.trustLevel);
    }
  });

  it('surfaces a conflict when two items share a subject but disagree on trust level', () => {
    const ranked = rankEvidence([
      item({ source: 'code', path: 'a.ts', relevance: 0.9 }),
      item({ source: 'memory', path: 'a.ts', relevance: 0.2 }),
    ]);

    const pkg = compileContext(task, repository, ranked, { tokenBudget: 10_000 });

    const result = validateContextPackage(pkg);
    expect(result.ok).toBe(true);
    expect(pkg.conflicts.length).toBeGreaterThan(0);
    expect(pkg.conflicts.some((c) => c.subject === 'a.ts')).toBe(true);
  });
});

describe('compileContext (fixture repo, end-to-end retrieve -> rank -> compile)', () => {
  it('compiles a schema-valid package from a real repository analysis', async () => {
    const repositoryAnalysis = await analyzeRepository(FIXTURE_ROOT);
    const task = { type: 'explain' as const, request: 'How do I make the widget name?' };

    const evidence = retrieveEvidence(task, repositoryAnalysis);
    const ranked = rankEvidence(evidence);
    const pkg = compileContext(task, { name: 'sample-repo', commit: 'HEAD' }, ranked);

    const result = validateContextPackage(pkg);
    expect(result.ok).toBe(true);
    expect(pkg.context.primary.length + pkg.context.supporting.length).toBeGreaterThan(0);
  });
});
