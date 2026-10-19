import { describe, expect, it } from 'vitest';
import { COACH_LIMITS } from './contract';
import { MAX_BODY_CHARS, parseCoachRequest } from './validate';

const CONTEXT = { route: '/practice/1', repo: 'cse-progress' };
const FULL_CONTEXT = {
  ...CONTEXT,
  problem: { number: 1, title: 'Two Sum' },
  code: 'print(1)',
  run: { passed: 2, total: 3, verdicts: '✓✓✗' },
};

function body(overrides: Record<string, unknown>): string {
  return JSON.stringify({ sessionId: null, message: 'hi', context: CONTEXT, ...overrides });
}

describe('parseCoachRequest', () => {
  const rejected: ReadonlyArray<[string, string]> = [
    ['not JSON', 'nope'],
    ['a JSON array', '[]'],
    ['a body over the cap', 'x'.repeat(MAX_BODY_CHARS + 1)],
    ['an empty message', body({ message: '' })],
    ['a blank message', body({ message: '   ' })],
    ['a message over the limit', body({ message: 'x'.repeat(COACH_LIMITS.messageChars + 1) })],
    ['a numeric sessionId', body({ sessionId: 5 })],
    ['a missing context', body({ context: undefined })],
    ['an empty route', body({ context: { ...CONTEXT, route: '' } })],
    ['code over the limit', body({ context: { ...CONTEXT, code: 'x'.repeat(COACH_LIMITS.codeChars + 1) } })],
    ['a problem number of zero', body({ context: { ...CONTEXT, problem: { number: 0, title: 'T' } } })],
    ['a run with passed above total', body({ context: { ...CONTEXT, run: { passed: 4, total: 3, verdicts: '' } } })],
    ['verdicts over the limit', body({ context: { ...CONTEXT, run: { passed: 0, total: 1, verdicts: '✓'.repeat(COACH_LIMITS.verdictChars + 1) } } })],
  ];

  it.each(rejected)('rejects %s', (_name, text) => {
    expect(parseCoachRequest(text)).toBeNull();
  });

  const accepted: ReadonlyArray<[string, string, unknown]> = [
    ['a minimal request', body({}), { sessionId: null, message: 'hi', context: CONTEXT }],
    [
      'a full request, dropping unknown fields',
      body({ sessionId: 'abc', context: { ...FULL_CONTEXT, extra: 1 }, model: 'other' }),
      { sessionId: 'abc', message: 'hi', context: FULL_CONTEXT },
    ],
    ['an empty editor buffer', body({ context: { ...CONTEXT, code: '' } }), { sessionId: null, message: 'hi', context: { ...CONTEXT, code: '' } }],
  ];

  it.each(accepted)('accepts %s', (_name, text, expected) => {
    expect(parseCoachRequest(text)).toEqual(expected);
  });
});
