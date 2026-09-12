import { describe, expect, it } from 'vitest';
import { resolveSymbols } from '../../src/core/repository/symbolResolver.js';

const SAMPLE = `
export interface Widget {
  id: string;
}

export type WidgetId = string;

export enum Color {
  Red,
  Blue,
}

export const DEFAULT_NAME = 'widget';

function internalHelper(): number {
  return 1;
}

export function makeName(prefix: string): string {
  return prefix;
}

export class NameFactory {
  create(): string {
    return 'x';
  }
}
`;

describe('resolveSymbols', () => {
  const symbols = resolveSymbols('sample.ts', SAMPLE);

  it('finds every top-level declaration kind', () => {
    const kinds = symbols.map((s) => s.kind).sort();
    expect(kinds).toEqual(
      ['class', 'enum', 'function', 'function', 'interface', 'type', 'variable'].sort(),
    );
  });

  it('marks exported vs. non-exported symbols correctly', () => {
    const helper = symbols.find((s) => s.name === 'internalHelper');
    const makeName = symbols.find((s) => s.name === 'makeName');
    expect(helper?.exported).toBe(false);
    expect(makeName?.exported).toBe(true);
  });

  it('records 1-based line numbers', () => {
    const widget = symbols.find((s) => s.name === 'Widget');
    expect(widget?.line).toBeGreaterThan(0);
  });

  it('returns no symbols for a file with only statements', () => {
    expect(resolveSymbols('empty.ts', 'console.log(1);')).toEqual([]);
  });
});
