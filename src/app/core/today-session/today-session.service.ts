import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../auth/auth.service';
import { PracticeNumbers } from '../practice/practice-numbers';
import { sessionDateISO } from '../utils/local-date';
import { PendingAttemptsService } from '../services/pending-attempts.service';
import { PracticeService } from '../services/practice.service';
import { ProgressService } from '../services/progress.service';
import { TodaySession, buildQueue, nextUndone, readSession } from './today-queue';

const STORAGE_KEY_PREFIX = 'po-today-session:';
const HOME_ROUTE = '/';
const PRACTICE_ROUTE = '/practice';

function withCompleted(session: TodaySession, n: number): TodaySession {
  return session.completed.includes(n) ? session : { ...session, completed: [...session.completed, n] };
}

/**
 * Today's run-through: compiles the day's runnable problems into a queue, keeps the learner's place
 * across page leaves (per repo, in localStorage), and walks to the next undone problem.
 */
@Injectable({ providedIn: 'root' })
export class TodaySessionService {
  private readonly progress = inject(ProgressService);
  private readonly auth = inject(AuthService);
  private readonly pendingAttempts = inject(PendingAttemptsService);
  private readonly router = inject(Router);
  private readonly practiceNumbers = new PracticeNumbers(inject(PracticeService), this.progress.repoRef).numbers;

  /** Completions made while no session exists yet (the board marks a problem before the run-through starts). */
  private readonly looseCompleted = signal<ReadonlySet<number>>(new Set());
  /** The session when there is no repo to key storage by. */
  private readonly memorySession = signal<TodaySession | null>(null);
  /** Bumped on every storage write so `session` re-reads. */
  private readonly storageWrites = signal(0);

  /** Keyed by the signed-in viewer's repo, known from boot on every page, not by the progress page's load. */
  private readonly storageKey = computed(() => {
    const slug = this.auth.resolveRepo(null);
    return slug ? `${STORAGE_KEY_PREFIX}${slug}` : null;
  });

  /** Today's schedule day, only when the loaded summary is the viewer's own repo (the progress page can show another). */
  private readonly todayDay = computed(() => {
    const slug = this.auth.resolveRepo(null);
    const ref = this.progress.repoRef();
    if (!slug || !ref || `${ref.owner}/${ref.repo}` !== slug) return undefined;
    return this.progress.data()?.schedule?.days.find((day) => day.date === sessionDateISO());
  });

  constructor() {
    // The practice page never loads the summary itself; load the viewer's own only when nothing is loaded yet.
    effect(() => {
      const slug = this.auth.resolveRepo(null);
      if (slug && this.progress.status() === 'idle') untracked(() => this.progress.loadSummary(slug));
    });
  }

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
    const isStoredDone = this.session()?.completed.includes(n) ?? false;
    return (
      !!item?.done ||
      isStoredDone ||
      this.pendingAttempts.pending().has(n) ||
      this.pendingAttempts.provisional().has(n) ||
      this.looseCompleted().has(n)
    );
  }

  contains(n: number): boolean {
    return this.queue().includes(n);
  }

  /** True while a run-through is active and problem n belongs to it. */
  isRunning(n: number): boolean {
    return this.active() && this.contains(n);
  }

  start(): void {
    const order = buildQueue(this.todayDay(), this.practiceNumbers());
    const index = order.findIndex((n) => !this.isDone(n));
    if (index === -1) return;
    this.writeSession({ date: sessionDateISO(), order, index, completed: order.filter((n) => this.isDone(n)) });
    this.goToPractice(order[index]);
  }

  resume(): void {
    const n = this.current();
    if (n !== null) this.goToPractice(n);
  }

  markCompleted(n: number): void {
    const stored = this.session();
    if (stored) {
      if (!stored.completed.includes(n) && stored.order.includes(n)) this.writeSession(withCompleted(stored, n));
      return;
    }
    this.looseCompleted.update((done) => new Set(done).add(n));
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
    if (stored) this.writeSession({ ...withCompleted(stored, n), index: order.indexOf(next) });
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
