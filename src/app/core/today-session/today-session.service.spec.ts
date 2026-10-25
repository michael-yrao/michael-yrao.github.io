import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createMemoryStorage } from '../memory-storage.testing';
import { PendingAttemptsService } from '../services/pending-attempts.service';
import { PracticeService } from '../services/practice.service';
import { ProgressService } from '../services/progress.service';
import { sessionDateISO } from '../utils/local-date';
import { TodaySessionService } from './today-session.service';

const REF = { owner: 'me', repo: 'dsa', branch: 'main' };
const KEY = 'po-today-session:me/dsa';

function setup(pending: number[] = []) {
  const items = [1, 2, 3].map((lcNumber) => ({ lcNumber, title: 't', done: false }));
  const pendingSet = signal<ReadonlySet<number>>(new Set(pending));
  const navigate = vi.fn().mockResolvedValue(true);
  TestBed.configureTestingModule({
    providers: [
      {
        provide: ProgressService,
        useValue: { repoRef: signal(REF), data: signal({ schedule: { days: [{ date: sessionDateISO(), items }] } }) },
      },
      { provide: PendingAttemptsService, useValue: { pending: pendingSet, provisional: signal(new Set<number>()) } },
      {
        provide: PracticeService,
        useValue: { indexNumbers: signal(new Set([1, 2, 3])), indexRef: signal(REF), ref: signal(REF), data: signal(null), loadIndex: vi.fn() },
      },
      { provide: Router, useValue: { navigate } },
    ],
  });
  return { service: TestBed.inject(TodaySessionService), navigate };
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

  it('counts a pending attempt as done', () => {
    const { service } = setup([2]);
    expect(service.isDone(2)).toBe(true);
    expect(service.isDone(1)).toBe(false);
  });
});
