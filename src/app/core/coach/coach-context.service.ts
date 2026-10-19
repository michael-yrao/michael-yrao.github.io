import { Injectable, Signal, signal } from '@angular/core';

import type { CaseVerdict } from '../runner/runner.model';

/** What the practice page shows the coach: the problem, the editor's text and the latest finished run.
 *  Raw verdicts; the panel's `page-context.ts` owns the verdict-to-mark map and truncation. */
export interface CoachPracticeSnapshot {
  readonly number: number;
  readonly title: string;
  readonly code: string;
  readonly run: {
    readonly passed: number;
    readonly total: number;
    readonly verdicts: readonly CaseVerdict[];
  } | null;
}

@Injectable({ providedIn: 'root' })
export class CoachContextService {
  private readonly snapshot = signal<CoachPracticeSnapshot | null>(null);

  readonly practice: Signal<CoachPracticeSnapshot | null> = this.snapshot.asReadonly();

  publish(snapshot: CoachPracticeSnapshot): void {
    this.snapshot.set(snapshot);
  }

  clear(): void {
    this.snapshot.set(null);
  }
}
