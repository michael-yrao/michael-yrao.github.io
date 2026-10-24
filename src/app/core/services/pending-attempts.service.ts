import { Injectable, Signal, signal } from '@angular/core';
import { Observable, catchError, firstValueFrom, map, of } from 'rxjs';

import { attemptDayDir, attemptNumberFromPath, parseAttemptFile } from '../practice/practice-attempt';
import { DirEntry, GitHubFileService, RepoRef } from './github-file.service';

const FILE_ENTRY_TYPE = 'file';
const REFUSED_FILE = 'refused.json';
const NO_NUMBERS: ReadonlySet<number> = new Set();
const NO_REFUSALS: ReadonlyMap<number, string> = new Map();

/** What one saved attempt file says: its problem and whether it is a finished rep. */
interface SavedFile {
  readonly number: number;
  readonly isComplete: boolean;
  /** Finished but not yet rated: `complete: true` with `rating: null`. */
  readonly isProvisional: boolean;
}

interface AttemptName {
  readonly name: string;
  readonly number: number;
}

interface PendingState {
  readonly pending: ReadonlySet<number>;
  readonly provisional: ReadonlySet<number>;
  readonly refused: ReadonlyMap<number, string>;
  readonly hasSavedToday: boolean;
}

const EMPTY_STATE: PendingState = {
  pending: NO_NUMBERS,
  provisional: NO_NUMBERS,
  refused: NO_REFUSALS,
  hasSavedToday: false,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** `refused.json` is `[{number, reason}]`; any other shape counts as no refusals at all. */
function parseRefused(text: string): ReadonlyMap<number, string> {
  try {
    const value: unknown = JSON.parse(text);
    if (!Array.isArray(value)) return NO_REFUSALS;
    const isWellFormed = value.every(
      (item) => isRecord(item) && Number.isInteger(item['number']) && typeof item['reason'] === 'string',
    );
    if (!isWellFormed) return NO_REFUSALS;
    return new Map(value.map((item) => [item['number'] as number, item['reason'] as string]));
  } catch {
    return NO_REFUSALS;
  }
}

/**
 * What today's attempt folder (the session date's) says before the fold lands in the summary:
 * which open board rows already have a finished attempt saved (`pending`), which of those are
 * still unrated (`provisional`), which saves the fold refused (`refused`, with the reason), and
 * whether any finished save exists at all (`hasSavedToday`). A failed read is "nothing": no
 * mark rather than a wrong one.
 */
@Injectable({ providedIn: 'root' })
export class PendingAttemptsService {
  private readonly pendingSet = signal<ReadonlySet<number>>(NO_NUMBERS);
  private readonly provisionalSet = signal<ReadonlySet<number>>(NO_NUMBERS);
  private readonly refusedMap = signal<ReadonlyMap<number, string>>(NO_REFUSALS);
  private readonly savedToday = signal(false);

  /** Open rows with a finished attempt file (rated or provisional). */
  readonly pending: Signal<ReadonlySet<number>> = this.pendingSet.asReadonly();
  /** The subset of `pending` whose file is finished but not yet rated. */
  readonly provisional: Signal<ReadonlySet<number>> = this.provisionalSet.asReadonly();
  /** Problem number -> reason, from the folder's `refused.json`. */
  readonly refused: Signal<ReadonlyMap<number, string>> = this.refusedMap.asReadonly();
  /** Any finished (complete or provisional) attempt file in the folder, on an open row or not. */
  readonly hasSavedToday: Signal<boolean> = this.savedToday.asReadonly();

  // A slow earlier load must not overwrite a newer one.
  private seq = 0;

  constructor(private readonly github: GitHubFileService) {}

  /** Never rejects. `sessionDateISO` names the folder. Resolves with the pending numbers (all
   *  four signals are written unless a newer `load` superseded this one). */
  async load(
    ref: RepoRef,
    sessionDateISO: string,
    openNumbers: ReadonlySet<number>,
  ): Promise<ReadonlySet<number>> {
    const mine = ++this.seq;
    const state = await this.readState(ref, sessionDateISO, openNumbers);
    if (mine === this.seq) {
      this.pendingSet.set(state.pending);
      this.provisionalSet.set(state.provisional);
      this.refusedMap.set(state.refused);
      this.savedToday.set(state.hasSavedToday);
    }
    return state.pending;
  }

  private async readState(
    ref: RepoRef,
    sessionDateISO: string,
    openNumbers: ReadonlySet<number>,
  ): Promise<PendingState> {
    const dir = attemptDayDir(sessionDateISO);
    try {
      const entries = await firstValueFrom(this.github.listDir$(ref, dir));
      const names = attemptNames(entries);
      const openNames = names.filter((file) => openNumbers.has(file.number));
      const otherNames = names.filter((file) => !openNumbers.has(file.number));
      const [refused, openFiles] = await Promise.all([
        this.readRefused(ref, dir, entries),
        this.readSaved(ref, dir, openNames),
      ]);
      // Files off the open rows are read only when no open row already proves a save today.
      const isSaved = openFiles.some((file) => file.isComplete);
      const otherFiles = isSaved ? [] : await this.readSaved(ref, dir, otherNames);
      return {
        pending: new Set(openFiles.filter((file) => file.isComplete).map((file) => file.number)),
        provisional: new Set(openFiles.filter((file) => file.isProvisional).map((file) => file.number)),
        refused,
        hasSavedToday: isSaved || otherFiles.some((file) => file.isComplete),
      };
    } catch {
      return EMPTY_STATE; // a failed listing counts as nothing saved
    }
  }

  private async readSaved(ref: RepoRef, dir: string, names: readonly AttemptName[]): Promise<readonly SavedFile[]> {
    const read = await Promise.all(
      names.map((file) => firstValueFrom(this.savedFile$(ref, `${dir}/${file.name}`, file.number))),
    );
    return read.filter((file): file is SavedFile => file !== null);
  }

  /** The file's state when it parses as an attempt; null when it did not parse or failed. */
  private savedFile$(ref: RepoRef, path: string, number: number): Observable<SavedFile | null> {
    return this.github.fetchText$(ref, path).pipe(
      map((content) => {
        const attempt = parseAttemptFile(content);
        if (attempt === null) return null;
        return { number, isComplete: attempt.complete, isProvisional: attempt.complete && attempt.rating === null };
      }),
      catchError(() => of(null)),
    );
  }

  /** Fetched only when the listing already holds it. */
  private async readRefused(
    ref: RepoRef,
    dir: string,
    entries: readonly DirEntry[],
  ): Promise<ReadonlyMap<number, string>> {
    const isListed = entries.some((entry) => entry.type === FILE_ENTRY_TYPE && entry.name === REFUSED_FILE);
    if (!isListed) return NO_REFUSALS;
    const text = await firstValueFrom(
      this.github.fetchText$(ref, `${dir}/${REFUSED_FILE}`).pipe(catchError(() => of(''))),
    );
    return parseRefused(text);
  }
}

function attemptNames(entries: readonly DirEntry[]): readonly AttemptName[] {
  return entries
    .filter((entry) => entry.type === FILE_ENTRY_TYPE)
    .map((entry) => ({ name: entry.name, number: attemptNumberFromPath(entry.name) }))
    .filter((file): file is AttemptName => file.number !== null);
}
