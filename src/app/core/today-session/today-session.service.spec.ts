import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AuthService } from '../auth/auth.service';
import { createMemoryStorage } from '../memory-storage.testing';
import { PendingAttemptsService } from '../services/pending-attempts.service';
import { PracticeService } from '../services/practice.service';
import { ProgressService } from '../services/progress.service';
import { sessionDateISO } from '../utils/local-date';
import { TodaySessionService } from './today-session.service';

const REF = { owner: 'me', repo: 'dsa', branch: 'main' };
const KEY = 'po-today-session:me/dsa';

interface SetupOptions {
  slug?: string | null;
  status?: string;
  repoRef?: typeof REF;
  doneNumbers?: number[];
}

function setup(pending: number[] = [], isColdLoad = false, options: SetupOptions = {}) {
  const { slug = 'me/dsa', status = 'ready', repoRef = REF, doneNumbers = [] } = options;
  const items = [1, 2, 3, ...doneNumbers.filter((n) => n > 3)].map((lcNumber) => ({
    lcNumber,
    title: 't',
    done: doneNumbers.includes(lcNumber),
  }));
  const pendingSet = signal<ReadonlySet<number>>(new Set(pending));
  const navigate = vi.fn().mockResolvedValue(true);
  const loadSummary = vi.fn();
  const progress = isColdLoad
    ? { repoRef: signal(null), data: signal(null), status: signal(status), loadSummary }
    : {
        repoRef: signal(repoRef),
        data: signal({ schedule: { days: [{ date: sessionDateISO(), items }] } }),
        status: signal(status),
        loadSummary,
      };
  TestBed.configureTestingModule({
    providers: [
      { provide: ProgressService, useValue: progress },
      { provide: AuthService, useValue: { resolveRepo: () => slug } },
      { provide: PendingAttemptsService, useValue: { pending: pendingSet, provisional: signal(new Set<number>()) } },
      {
        provide: PracticeService,
        useValue: { indexNumbers: signal(new Set([1, 2, 3])), indexRef: signal(REF), ref: signal(REF), data: signal(null), loadIndex: vi.fn() },
      },
      { provide: Router, useValue: { navigate } },
    ],
  });
  return { service: TestBed.inject(TodaySessionService), navigate, loadSummary };
}

describe('TodaySessionService', () => {
  beforeEach(() => vi.stubGlobal('localStorage', createMemoryStorage()));
  afterEach(() => vi.unstubAllGlobals());

  it('advanceFrom goes to the next undone, then home and clears storage after the last', () => {
    const { service, navigate } = setup();
    service.start();
    expect(navigate).toHaveBeenLastCalledWith(['/practice', 1]);

    service.advanceFrom(1);
    expect(navigate).toHaveBeenLastCalledWith(['/practice', 2]);
    service.markCompleted(1);
    service.markCompleted(2);
    service.advanceFrom(2);
    expect(navigate).toHaveBeenLastCalledWith(['/practice', 3]);
    service.markCompleted(3);
    service.advanceFrom(3);

    expect(navigate).toHaveBeenLastCalledWith(['/']);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it('restores the run-through from storage alone on a cold load, with no progress data', () => {
    localStorage.setItem(KEY, JSON.stringify({ date: sessionDateISO(), order: [1, 2, 3], index: 1, completed: [1] }));
    const { service } = setup([], true);

    expect(service.active()).toBe(true);
    expect(service.queue()).toEqual([1, 2, 3]);
    expect(service.current()).toBe(2);
    expect(service.doneCount()).toBe(1);
  });

  it.each([
    { name: 'signed in and idle', slug: 'me/dsa', status: 'idle', calls: 1 },
    { name: 'signed in and ready', slug: 'me/dsa', status: 'ready', calls: 0 },
    { name: 'signed out', slug: null, status: 'idle', calls: 0 },
  ])('loads the viewer summary only when $name', ({ slug, status, calls }) => {
    const { loadSummary } = setup([], false, { slug, status });
    TestBed.tick();

    expect(loadSummary).toHaveBeenCalledTimes(calls);
    if (calls) expect(loadSummary).toHaveBeenCalledWith('me/dsa');
  });

  it('counts a folded schedule completion only when the loaded summary is the viewer repo', () => {
    localStorage.setItem(KEY, JSON.stringify({ date: sessionDateISO(), order: [9001, 70], index: 0, completed: [] }));
    const own = setup([], false, { doneNumbers: [9001] }).service;
    expect(own.isDone(9001)).toBe(true);
    expect(own.current()).toBe(70);

    TestBed.resetTestingModule();
    const other = setup([], false, { doneNumbers: [9001], repoRef: { ...REF, owner: 'someone' } }).service;
    expect(other.isDone(9001)).toBe(false);
  });

  it.each([
    { name: 'no stored session builds one at n', stored: null, n: 2, expected: { index: 1, completed: [] as number[] }, isNavigated: true },
    {
      name: 'a stored session keeps its completed and moves the index',
      stored: { date: sessionDateISO(), order: [1, 2, 3], index: 0, completed: [1] },
      n: 3,
      expected: { index: 2, completed: [1] },
      isNavigated: true,
    },
    { name: 'n outside the queue writes and navigates nowhere', stored: null, n: 9, expected: null, isNavigated: false },
  ])('startAt: $name', ({ stored, n, expected, isNavigated }) => {
    if (stored) localStorage.setItem(KEY, JSON.stringify(stored));
    const { service, navigate } = setup();

    service.startAt(n);

    if (expected === null) expect(localStorage.getItem(KEY)).toBeNull();
    else expect(JSON.parse(localStorage.getItem(KEY) as string)).toMatchObject({ order: [1, 2, 3], ...expected });
    if (isNavigated) expect(navigate).toHaveBeenCalledWith(['/practice', n]);
    else expect(navigate).not.toHaveBeenCalled();
  });

  it('counts a pending attempt as done', () => {
    const { service } = setup([2]);
    expect(service.isDone(2)).toBe(true);
    expect(service.isDone(1)).toBe(false);
  });
});
