import { describe, expect, it } from 'vitest';
import { COACH_LIMITS } from './contract.js';
import { parseMessageRequest } from './validate.js';

const CONTEXT = { route: '/practice/1', repo: 'cse-progress' };
const FULL_CONTEXT = {
  ...CONTEXT,
  problem: { number: 1, title: 'Two Sum' },
  code: 'print(1)',
  run: { passed: 2, total: 3, verdicts: '✓✓✗' },
};

function request(overrides: Record<string, unknown>): unknown {
  return { sessionId: null, message: 'hi', context: CONTEXT, ...overrides };
}

describe('parseMessageRequest', () => {
  const rejected: ReadonlyArray<[string, unknown]> = [
    ['not an object', 'text'],
    ['array', []],
    ['empty message', request({ message: '' })],
    ['blank message', request({ message: '   ' })],
    ['message over the limit', request({ message: 'x'.repeat(COACH_LIMITS.messageChars + 1) })],
    ['numeric sessionId', request({ sessionId: 5 })],
    ['missing context', request({ context: undefined })],
    ['empty route', request({ context: { ...CONTEXT, route: '' } })],
    ['code over the limit', request({ context: { ...CONTEXT, code: 'x'.repeat(COACH_LIMITS.codeChars + 1) } })],
    ['non-string code', request({ context: { ...CONTEXT, code: 7 } })],
    ['problem number zero', request({ context: { ...CONTEXT, problem: { number: 0, title: 'T' } } })],
    ['problem without title', request({ context: { ...CONTEXT, problem: { number: 1 } } })],
    ['run passed above total', request({ context: { ...CONTEXT, run: { passed: 4, total: 3, verdicts: '' } } })],
    ['verdicts over the limit', request({ context: { ...CONTEXT, run: { passed: 0, total: 1, verdicts: '✓'.repeat(COACH_LIMITS.verdictChars + 1) } } })],
  ];

  it.each(rejected)('rejects %s', (_name, raw) => {
    expect(parseMessageRequest(raw)).toBeNull();
  });

  it('accepts a minimal request with a null session', () => {
    expect(parseMessageRequest(request({}))).toEqual({ sessionId: null, message: 'hi', context: CONTEXT });
  });

  it('accepts a full request, keeps a session id, and drops unknown fields', () => {
    const raw = request({ sessionId: 'abc', context: { ...FULL_CONTEXT, extra: 'x' }, model: 'other' });
    expect(parseMessageRequest(raw)).toEqual({ sessionId: 'abc', message: 'hi', context: FULL_CONTEXT });
  });

  it('accepts an empty editor buffer as code', () => {
    const parsed = parseMessageRequest(request({ context: { ...CONTEXT, code: '' } }));
    expect(parsed?.context.code).toBe('');
  });
});
