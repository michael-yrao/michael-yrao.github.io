import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ScheduleDay, ScheduleItem } from '../models/progress.model';
import { buildQueue, nextUndone, readSession } from './today-queue';

function item(overrides: Partial<ScheduleItem>): ScheduleItem {
  return { lcNumber: 1, title: 't', technique: 'x', startComfort: null, difficulty: null, done: false, ...overrides } as ScheduleItem;
}

function day(items: ScheduleItem[]): ScheduleDay {
  return { date: '2026-10-24', weekday: 'Sat', label: null, units: 1, items } as ScheduleDay;
}

describe('buildQueue', () => {
  const specs = new Set([1, 2, 3, 4, 5, 6]);
  it.each<{ name: string; day: ScheduleDay | undefined; expected: number[] }>([
    {
      name: 'drops complexity and primer, keeps probe and a missing kind',
      day: day([item({ lcNumber: 1, kind: 'complexity' }), item({ lcNumber: 2, kind: 'primer' }), item({ lcNumber: 3, kind: 'probe' }), item({ lcNumber: 4 })]),
      expected: [3, 4],
    },
    { name: 'drops a null lcNumber', day: day([item({ lcNumber: null }), item({ lcNumber: 2, kind: 'new' })]), expected: [2] },
    { name: 'drops a number with no spec', day: day([item({ lcNumber: 99 }), item({ lcNumber: 2 })]), expected: [2] },
    { name: 'drops a deferred row', day: day([item({ lcNumber: 1, deferredTo: '2026-10-25' }), item({ lcNumber: 2 })]), expected: [2] },
    { name: 'keeps a done row and de-duplicates by first occurrence', day: day([item({ lcNumber: 3, done: true }), item({ lcNumber: 2 }), item({ lcNumber: 3 })]), expected: [3, 2] },
    { name: 'an undefined day is empty', day: undefined, expected: [] },
  ])('$name', ({ day: scheduleDay, expected }) => {
    expect(buildQueue(scheduleDay, specs)).toEqual(expected);
  });
});

describe('nextUndone', () => {
  const doneSet = (...done: number[]) => (n: number) => done.includes(n);
  it.each<{ name: string; order: number[]; done: (n: number) => boolean; from: number; expected: number | null }>([
    { name: 'the next undone after the current', order: [1, 2, 3], done: doneSet(), from: 1, expected: 2 },
    { name: 'wraps to an earlier undone', order: [1, 2, 3], done: doneSet(2, 3), from: 2, expected: 1 },
    { name: 'all done is null', order: [1, 2], done: doneSet(1, 2), from: 0, expected: null },
    { name: 'an empty order is null', order: [], done: doneSet(), from: 0, expected: null },
  ])('$name', ({ order, done, from, expected }) => {
    expect(nextUndone(order, done, from)).toBe(expected);
  });
});

describe('readSession', () => {
  const today = '2026-10-24';
  afterEach(() => vi.restoreAllMocks());

  it.each<{ name: string; raw: string | null; expected: unknown; isLogged: boolean }>([
    { name: 'a valid session', raw: JSON.stringify({ date: today, order: [1, 2], index: 1, completed: [1] }), expected: { date: today, order: [1, 2], index: 1, completed: [1] }, isLogged: false },
    { name: 'another date', raw: JSON.stringify({ date: '2026-10-23', order: [1], index: 0, completed: [] }), expected: null, isLogged: false },
    { name: 'malformed JSON', raw: '{nope', expected: null, isLogged: true },
    { name: 'index out of range', raw: JSON.stringify({ date: today, order: [1], index: 1, completed: [] }), expected: null, isLogged: false },
    { name: 'order of non-integers', raw: JSON.stringify({ date: today, order: ['a'], index: 0, completed: [] }), expected: null, isLogged: false },
    { name: 'completed not an array', raw: JSON.stringify({ date: today, order: [1], index: 0, completed: 1 }), expected: null, isLogged: false },
    { name: 'completed outside order', raw: JSON.stringify({ date: today, order: [1], index: 0, completed: [2] }), expected: null, isLogged: false },
    { name: 'null input', raw: null, expected: null, isLogged: false },
  ])('$name', ({ raw, expected, isLogged }) => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(readSession(raw, today)).toEqual(expected);
    expect(errorSpy.mock.calls.length > 0).toBe(isLogged);
  });
});
