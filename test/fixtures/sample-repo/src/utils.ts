export const DEFAULT_NAME = 'widget';

export function makeName(prefix: string): string {
  return `${prefix}-${DEFAULT_NAME}`;
}

function internalHelper(): number {
  return 42;
}

export class NameFactory {
  create(prefix: string): string {
    return makeName(prefix) + String(internalHelper());
  }
}
