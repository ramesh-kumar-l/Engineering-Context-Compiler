import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { retrieveGitEvidence } from '../../src/core/evidence/gitEvidenceRetriever.js';

let repoRoot: string;

function git(args: string[]): void {
  execFileSync('git', args, { cwd: repoRoot, stdio: 'ignore' });
}

beforeEach(() => {
  repoRoot = mkdtempSync(join(tmpdir(), 'ecc-git-evidence-'));
  git(['init', '--quiet']);
  git(['config', 'user.email', 'test@example.com']);
  git(['config', 'user.name', 'Test']);

  writeFileSync(join(repoRoot, 'widget.ts'), 'export const a = 1;\n');
  git(['add', 'widget.ts']);
  git(['commit', '--quiet', '-m', 'add widget']);

  writeFileSync(join(repoRoot, 'widget.ts'), 'export const a = 2;\n');
  git(['add', 'widget.ts']);
  git(['commit', '--quiet', '-m', 'update widget value']);
});

afterEach(() => {
  rmSync(repoRoot, { recursive: true, force: true });
});

describe('retrieveGitEvidence', () => {
  it('returns recent commits for a tracked file, newest first', () => {
    const evidence = retrieveGitEvidence(repoRoot, ['widget.ts']);

    expect(evidence).toHaveLength(2);
    const [newest, oldest] = evidence;
    expect(newest?.source).toBe('git');
    expect(newest?.identifier).toBe('update widget value');
    expect(newest?.provenance?.commit).toBeTruthy();
    expect(newest?.relevance).toBeGreaterThan(oldest?.relevance ?? Infinity);
  });

  it('returns no evidence for an untracked path without throwing', () => {
    expect(retrieveGitEvidence(repoRoot, ['does-not-exist.ts'])).toEqual([]);
  });

  it('returns no evidence when the directory is not a git repository', () => {
    const nonRepo = mkdtempSync(join(tmpdir(), 'ecc-not-a-repo-'));
    try {
      expect(retrieveGitEvidence(nonRepo, ['widget.ts'])).toEqual([]);
    } finally {
      rmSync(nonRepo, { recursive: true, force: true });
    }
  });
});
