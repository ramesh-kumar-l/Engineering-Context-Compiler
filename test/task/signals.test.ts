import { describe, expect, it } from 'vitest';
import { TASK_SIGNALS } from '../../src/core/task/signals.js';
import { TASK_TYPES } from '../../src/core/types/task.js';

describe('TASK_SIGNALS', () => {
  it('defines at least one signal for every TaskType', () => {
    for (const type of TASK_TYPES) {
      expect(TASK_SIGNALS[type].length).toBeGreaterThan(0);
    }
  });

  it('only uses positive weights', () => {
    for (const type of TASK_TYPES) {
      for (const signal of TASK_SIGNALS[type]) {
        expect(signal.weight).toBeGreaterThan(0);
      }
    }
  });
});
