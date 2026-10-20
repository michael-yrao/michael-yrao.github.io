import { Injectable, Signal, signal } from '@angular/core';
import { Observable, catchError, firstValueFrom, forkJoin, map, of } from 'rxjs';

import { attemptDayDir, attemptNumberFromPath, parseAttemptFile } from '../practice/practice-attempt';
import { DirEntry, GitHubFileService, RepoRef } from './github-file.service';

const FILE_ENTRY_TYPE = 'file';
const NO_PENDING: ReadonlySet<number> = new Set();

/**
 * Which of today's open board rows already have a complete attempt file saved in the progress
 * repo, before the fold lands in the summary. A failed read is "not pending": no mark rather
 * than a wrong one.
 */
@Injectable({ providedIn: 'root' })
export class PendingAttemptsService {
  private readonly pendingSet = signal<ReadonlySet<number>>(NO_PENDING);
  readonly pending: Signal<ReadonlySet<number>> = this.pendingSet.asReadonly();

  // A slow earlier load must not overwrite a newer one.
  private seq = 0;

  constructor(private readonly github: GitHubFileService) {}

  /** Never rejects. Resolves with the pending numbers (also written to `pending` unless a
   *  newer `load` superseded this one). */
  async load(
    ref: RepoRef,
    todayISO: string,
    openNumbers: ReadonlySet<number>,
  ): Promise<ReadonlySet<number>> {
    const mine = ++this.seq;
    const found = openNumbers.size === 0 ? NO_PENDING : await this.completeNumbers(ref, todayISO, openNumbers);
    const result: ReadonlySet<number> = new Set(found);
    if (mine === this.seq) this.pendingSet.set(result);
    return result;
  }

  private async completeNumbers(
    ref: RepoRef,
    todayISO: string,
    openNumbers: ReadonlySet<number>,
  ): Promise<readonly number[]> {
    const dir = attemptDayDir(todayISO);
    try {
      const entries = await firstValueFrom(this.github.listDir$(ref, dir));
      const files = entries
        .filter((entry) => entry.type === FILE_ENTRY_TYPE)
        .map((entry) => ({ entry, number: attemptNumberFromPath(entry.name) }))
        .filter((file): file is { entry: DirEntry; number: number } => file.number !== null && openNumbers.has(file.number));
      if (files.length === 0) return [];
      const checks = await firstValueFrom(
        forkJoin(files.map((file) => this.isComplete$(ref, `${dir}/${file.entry.name}`, file.number))),
      );
      return checks.filter((n): n is number => n !== null);
    } catch {
      return []; // a failed listing counts as nothing pending
    }
  }

  /** The number when the file parses as a complete attempt; null when not, or when it failed. */
  private isComplete$(ref: RepoRef, path: string, number: number): Observable<number | null> {
    return this.github.fetchText$(ref, path).pipe(
      map((content) => (parseAttemptFile(content)?.complete === true ? number : null)),
      catchError(() => of(null)),
    );
  }
}
