import { makeName } from './utils.js';
import type { Widget } from './types.js';

export function createWidget(id: string): Widget {
  return { id, name: makeName(id) };
}
