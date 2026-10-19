import { describe, expect, it } from 'vitest';
import { chooseMode, createInputQueue, createSession, type LiveQuery, type SessionMode } from './session.js';

function fakeLive(): LiveQuery {
  return {
    query: { next: async () => ({ value: undefined, done: true }), interrupt: async () => undefined, close: () => undefined },
    input: createInputQueue(),
  };
}

describe('chooseMode', () => {
  const cases: ReadonlyArray<[string, Parameters<typeof chooseMode>[0], SessionMode]> = [
    ['a null request id starts fresh even with a live query', { hasLive: true, currentId: 'a', requestedId: null, transcriptExists: true }, 'new'],
    ['the live session id continues', { hasLive: true, currentId: 'a', requestedId: 'a', transcriptExists: true }, 'continue'],
    ['no live query but a saved transcript resumes', { hasLive: false, currentId: null, requestedId: 'a', transcriptExists: true }, 'resume'],
    ['a stale id with a transcript resumes it', { hasLive: true, currentId: 'b', requestedId: 'a', transcriptExists: true }, 'resume'],
    ['a stale id with no transcript starts fresh', { hasLive: true, currentId: 'b', requestedId: 'a', transcriptExists: false }, 'new'],
    ['no live query and no transcript starts fresh', { hasLive: false, currentId: null, requestedId: 'a', transcriptExists: false }, 'new'],
  ];

  it.each(cases)('%s', (_name, args, expected) => {
    expect(chooseMode(args)).toBe(expected);
  });
});

describe('createSession', () => {
  it('lets one turn in at a time', () => {
    const session = createSession();
    expect(session.tryAcquire()).toBe(true);
    expect(session.snapshot().busy).toBe(true);
    expect(session.tryAcquire()).toBe(false);
    session.release();
    expect(session.tryAcquire()).toBe(true);
  });

  it('meters cumulative cost into per-turn amounts and resets on a new live query', () => {
    const session = createSession();
    session.attach(fakeLive());
    expect(session.recordCost(0.25)).toEqual({ turnCostUsd: 0.25, sessionCostUsd: 0.25 });
    expect(session.recordCost(0.75)).toEqual({ turnCostUsd: 0.5, sessionCostUsd: 0.75 });
    expect(session.recordCost(0.5)).toEqual({ turnCostUsd: 0, sessionCostUsd: 0.75 });
    session.attach(fakeLive());
    expect(session.recordCost(0.1)).toEqual({ turnCostUsd: 0.1, sessionCostUsd: 0.1 });
  });
});
