import { readdir } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { EXCLUDED_DIRS } from './fileClassifier.js';

export interface WalkedFile {
  /** Repo-relative, posix-separated path. */
  path: string;
  absolute: string;
}

function toPosix(path: string): string {
  return sep === '\\' ? path.split(sep).join('/') : path;
}

/**
 * Recursively lists files under `rootDir`, skipping known build/VCS/dependency directories.
 * Returns repo-relative paths using posix separators regardless of host OS.
 */
export async function walkRepository(rootDir: string): Promise<WalkedFile[]> {
  const results: WalkedFile[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (EXCLUDED_DIRS.has(entry.name)) {
          continue;
        }
        await walk(join(dir, entry.name));
      } else if (entry.isFile()) {
        const absolute = join(dir, entry.name);
        results.push({ path: toPosix(relative(rootDir, absolute)), absolute });
      }
    }
  }

  await walk(rootDir);
  return results;
}
