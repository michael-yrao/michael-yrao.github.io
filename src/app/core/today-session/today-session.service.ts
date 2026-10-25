import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { PracticeNumbers } from '../practice/practice-numbers';
import { sessionDateISO } from '../utils/local-date';
import { PendingAttemptsService } from '../services/pending-attempts.service';
import { PracticeService } from '../services/practice.service';
import { ProgressService } from '../services/progress.service';
import { TodaySession, buildQueue, nextUndone, readSession } from './today-queue';

const STORAGE_KEY_PREFIX = 'po-today-session:';
const HOME_ROUTE = '/';
const PRACTICE_ROUTE = '/practice';

/**
 * Today's run-through: compiles the day's runnable problems into a queue, keeps the learner's place
 * across page leaves (per repo, in localStorage), and walks to the next undone problem.
 */
@Injectable({ providedIn: 'root' })
export class TodaySessionService {
  private readonly progress = inject(ProgressService);
  private readonly pendingAttempts = inject(PendingAttemptsService);
  private readonly router = inject(Router);
  private readonly practiceNumbers = new PracticeNumbers(inject(PracticeService), this.progress.repoRef).numbers;

  private readonly completed = signal<ReadonlySet<number>>(new Set());
  /** The session when there is no repo to key storage by. */
  private readonly memorySession = signal<TodaySession | null>(null);
  /** Bumped on every storage write so `session` re-reads. */
  private readonly storageWrites = signal(0);

  private readonly storageKey = computed(() => {
    const source = this.progress.repoRef(); // the read-only view of `source`
    return source ? `${STORAGE_KEY_PREFIX}${source.owner}/${source.repo}` : null;
  });

  private readonly todayDay = computed(() =>
    this.progress.data()?.schedule?.days.find((day) => day.date === sessionDateISO()),
  );

  private readonly session = computed<TodaySession | null>(() => {
    const key = this.storageKey();
    if (key === null) return this.memorySession();
    this.storageWrites();
    return this.readStored(key);
  });

  readonly queue = computed<number[]>(() => {
    const stored = this.session();
    return stored ? [...stored.order] : buildQueue(this.todayDay(), this.practiceNumbers());
  });

  readonly active = computed(() => this.session() !== null && this.queue().some((n) => !this.isDone(n)));

  readonly doneCount = computed(() => this.queue().filter((n) => this.isDone(n)).length);

  readonly current = computed<number | null>(() => nextUndone(this.queue(), (n) => this.isDone(n), this.session()?.index ?? 0));

  isDone(n: number): boolean {
    const item = this.todayDay()?.items.find((candidate) => candidate.lcNumber === n);
    return !!item?.done || this.pendingAttempts.pending().has(n) || this.pendingAttempts.provisional().has(n) || this.completed().has(n);
  }

  contains(n: number): boolean {
    return this.queue().includes(n);
  }

  start(): void {
    const order = buildQueue(this.todayDay(), this.practiceNumbers());
    const index = order.findIndex((n) => !this.isDone(n));
    if (index === -1) return;
    this.writeSession({ date: sessionDateISO(), order, index });
    this.goToPractice(order[index]);
  }

  resume(): void {
    const n = this.current();
    if (n !== null) this.goToPractice(n);
  }

  markCompleted(n: number): void {
    this.completed.update((done) => new Set(done).add(n));
  }

  /** Moves past `n` (counted as done) to the next undone problem, or home with the session cleared when none is left. */
  advanceFrom(n: number): void {
    const order = this.queue();
    const position = order.indexOf(n);
    if (position === -1) return;
    const next = nextUndone(order, (candidate) => candidate === n || this.isDone(candidate), position + 1);
    if (next === null) {
      this.writeSession(null);
      void this.router.navigate([HOME_ROUTE]);
      return;
    }
    const stored = this.session();
    if (stored) this.writeSession({ ...stored, index: order.indexOf(next) });
    this.goToPractice(next);
  }

  private goToPractice(n: number): void {
    void this.router.navigate([PRACTICE_ROUTE, n]);
  }

  private readStored(key: string): TodaySession | null {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(key);
    } catch (error) {
      console.error('today-session: could not read storage', error);
      return null;
    }
    const session = readSession(raw, sessionDateISO());
    if (session === null && raw !== null) this.removeStored(key);
    return session;
  }

  private removeStored(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('today-session: could not remove stale session', error);
    }
  }

  private writeSession(session: TodaySession | null): void {
    const key = this.storageKey();
    if (key === null) {
      this.memorySession.set(session);
      return;
    }
    try {
      if (session === null) localStorage.removeItem(key);
      else localStorage.setItem(key, JSON.stringify(session));
    } catch (error) {
      console.error('today-session: could not write storage', error);
    }
    this.storageWrites.update((count) => count + 1);
  }
}
