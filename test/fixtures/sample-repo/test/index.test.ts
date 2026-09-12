import { describe, expect, it } from 'vitest';
import { createWidget } from '../src/index.js';

describe('createWidget', () => {
  it('builds a widget with a derived name', () => {
    expect(createWidget('a').name).toContain('a');
  });
});
