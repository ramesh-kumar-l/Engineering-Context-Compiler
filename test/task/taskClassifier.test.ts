import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { classifyTask } from '../../src/core/task/taskClassifier.js';
import type { TaskType } from '../../src/core/types/task.js';

interface LabeledRequest {
  request: string;
  expected: TaskType;
}

const FIXTURE_PATH = fileURLToPath(new URL('../fixtures/task-requests.json', import.meta.url));
const LABELED_REQUESTS: LabeledRequest[] = JSON.parse(readFileSync(FIXTURE_PATH, 'utf-8'));

/** Minimum fraction of the labeled set the classifier must get right. */
const ACCURACY_THRESHOLD = 0.85;

describe('classifyTask', () => {
  it('returns low confidence and the default type for an empty/ungrounded request', () => {
    expect(classifyTask('')).toEqual({ type: 'explain', confidence: 0 });
    expect(classifyTask('hello there').confidence).toBe(0);
  });

  it('is case-insensitive', () => {
    expect(classifyTask('REFACTOR THE FILE CLASSIFIER').type).toBe('refactor');
  });

  it('prefers the type with the most specific (highest-weight) signal on overlap', () => {
    // "add" alone would suggest modify, but "add tests" is a stronger, more
    // specific signal for test - this is the case the weighting exists for.
    expect(classifyTask('Add tests for the dependency graph edge cases').type).toBe('test');
  });

  it('reaches at least 85% accuracy on the labeled request set', () => {
    const misclassified: Array<{ request: string; expected: TaskType; actual: TaskType }> = [];

    for (const { request, expected } of LABELED_REQUESTS) {
      const { type } = classifyTask(request);
      if (type !== expected) {
        misclassified.push({ request, expected, actual: type });
      }
    }

    const accuracy = (LABELED_REQUESTS.length - misclassified.length) / LABELED_REQUESTS.length;

    expect(accuracy, `misclassified: ${JSON.stringify(misclassified, null, 2)}`).toBeGreaterThanOrEqual(
      ACCURACY_THRESHOLD,
    );
  });

  it('covers every TaskType at least once in the labeled set', () => {
    const coveredTypes = new Set(LABELED_REQUESTS.map((r) => r.expected));
    const allTypes: TaskType[] = [
      'explain',
      'debug',
      'modify',
      'review',
      'refactor',
      'investigate',
      'plan',
      'test',
      'optimize',
    ];
    for (const type of allTypes) {
      expect(coveredTypes.has(type)).toBe(true);
    }
  });
});
