import { describe, expect, it } from 'vitest';
import { validateAttempt } from './validate';

const PATH = 'dsa/attempts/20261101/1_two_sum.py';
const SAVED_AT = '2026-11-01T10:00:00.000Z';
const INVALID = { error: 'invalid-attempt-header' };
const COMPLEXITY = {
  time: 'O(n)',
  space: 'O(1)',
  whyTime: 'one pass over the input',
  whySpace: 'a few counters',
};
const RECOGNITION = { picked: 'Two Pointers', at: SAVED_AT };
const COMPLETE = { complete: true, rating: 'clean', tests: '9/9', complexity: COMPLEXITY };

function attempt(fields: Record<string, unknown>) {
  const header = {
    complete: false,
    rating: null,
    tests: '3/9',
    complexity: null,
    savedAt: SAVED_AT,
    ...fields,
  };
  return { owner: 'alice', repo: 'cse-progress', branch: 'main', path: PATH, content: `# po-attempt: ${JSON.stringify(header)}\nx = 1\n` };
}

describe('validateAttempt header', () => {
  const cases: { name: string; fields: Record<string, unknown>; ok: boolean }[] = [
    { name: 'in-progress, no recognition', fields: {}, ok: true },
    { name: 'in-progress with recognition', fields: { recognition: RECOGNITION }, ok: true },
    { name: 'complete with recognition', fields: { ...COMPLETE, recognition: RECOGNITION }, ok: true },
    { name: 'unknown header key', fields: { extra: 1 }, ok: false },
    { name: 'empty picked', fields: { recognition: { ...RECOGNITION, picked: '' } }, ok: false },
    { name: 'picked too long', fields: { recognition: { ...RECOGNITION, picked: 'x'.repeat(201) } }, ok: false },
    { name: 'bad at', fields: { recognition: { ...RECOGNITION, at: '2026-10-20' } }, ok: false },
    { name: 'extra recognition key', fields: { recognition: { ...RECOGNITION, extra: 1 } }, ok: false },
    { name: 'missing at', fields: { recognition: { picked: 'x' } }, ok: false },
    { name: 'null recognition', fields: { recognition: null }, ok: false },
  ];

  for (const { name, fields, ok } of cases) {
    it(name, () => {
      const result = validateAttempt(attempt(fields));
      if (ok) expect(result).toHaveProperty('commitMessage');
      else expect(result).toEqual(INVALID);
    });
  }
});
