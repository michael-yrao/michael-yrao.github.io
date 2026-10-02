import { Injectable, computed, inject, signal } from '@angular/core';
import { catchError, of } from 'rxjs';

import { PRACTICE_SCHEMA_VERSION, PracticeData, PracticeProblem } from '../models/practice.model';
import { isPracticeProblem } from '../practice/practice-validation';
import { GitHubFileService, LoadStatus, RepoRef, httpErrorMessage, sameRef } from './github-file.service';

const PRACTICE_FILE = 'dashboard/practice.json';
const PRACTICE_WHAT = 'practice';
const MALFORMED_CONTRACT_MESSAGE =
  'The practice contract is invalid — is dashboard/practice.json malformed?';

/** Unvalidated JSON as it comes off the wire — everything is checked in `invalidReason`
 *  before anything downstream trusts it as a `PracticeData`. */
type RawPracticePayload = { schemaVersion?: unknown; problems?: unknown } | null;

/**
 * Fetches cse-progress's practice contract (`dashboard/practice.json`) from the viewer's repo
 * (`?repo=` aware, unlike `ShowcaseService`). A changed ref always refetches; the same ref is a
 * no-op while ready or in flight unless `force`d.
 */
@Injectable({ providedIn: 'root' })
export class PracticeService {
  readonly status = signal<LoadStatus>('idle');
  readonly error = signal<string | null>(null);
  readonly data = signal<PracticeData | null>(null);

  private readonly currentRef = signal<RepoRef | null>(null);
  /** The ref of the current/last load. */
  readonly ref = this.currentRef.asReadonly();

  private readonly problems = computed(() => {
    const current = this.data();
    if (!current) return null;
    return new Map(current.problems.map((problem) => [problem.number, problem] as const));
  });

  // Monotonic request id: a slow earlier fetch must not overwrite a later one.
  private seq = 0;

  private readonly github = inject(GitHubFileService);

  load(ref: RepoRef, force = false): void {
    const isBusyOrReady = this.status() === 'ready' || this.status() === 'loading';
    if (!force && sameRef(ref, this.currentRef()) && isBusyOrReady) return;

    const mine = ++this.seq;
    // Another repo's problems must not linger while this one loads.
    if (!sameRef(ref, this.currentRef())) this.data.set(null);
    this.currentRef.set(ref);
    this.status.set('loading');
    this.error.set(null);

    this.github
      .fetch$<RawPracticePayload>(ref, PRACTICE_FILE, force)
      .pipe(catchError((err) => of(new Error(httpErrorMessage(err, PRACTICE_WHAT)))))
      .subscribe((result) => {
        if (mine !== this.seq) return; // a newer load() superseded this response

        if (result instanceof Error) {
          this.fail(result.message);
          return;
        }

        const invalid = this.invalidReason(result);
        if (invalid) {
          this.fail(invalid);
          return;
        }

        this.data.set(result as PracticeData);
        this.status.set('ready');
      });
  }

  problemFor(number: number): PracticeProblem | null {
    return this.problems()?.get(number) ?? null;
  }

  private fail(message: string): void {
    this.status.set('error');
    this.error.set(message);
    this.data.set(null);
  }

  /** null when the payload is a usable, schema-compatible practice contract with every problem
   *  structurally valid; else a human reason. */
  private invalidReason(result: RawPracticePayload): string | null {
    if (!result || typeof result !== 'object') return MALFORMED_CONTRACT_MESSAGE;
    if (typeof result.schemaVersion !== 'number') return MALFORMED_CONTRACT_MESSAGE;
    if (result.schemaVersion !== PRACTICE_SCHEMA_VERSION) {
      return `The practice contract is schema v${result.schemaVersion}; this site speaks v${PRACTICE_SCHEMA_VERSION}. Update the site.`;
    }
    if (!Array.isArray(result.problems)) return MALFORMED_CONTRACT_MESSAGE;

    const badIndex = result.problems.findIndex((problem) => !isPracticeProblem(problem));
    if (badIndex !== -1) return this.malformedProblemMessage(result.problems[badIndex], badIndex);

    return null;
  }

  private malformedProblemMessage(problem: unknown, index: number): string {
    const number = this.numberOf(problem);
    const label = number !== null ? `#${number}` : `index ${index}`;
    return `The practice contract has a malformed problem (${label}) — is dashboard/practice.json malformed?`;
  }

  private numberOf(problem: unknown): number | null {
    if (typeof problem !== 'object' || problem === null) return null;
    const number = (problem as { number?: unknown }).number;
    return typeof number === 'number' ? number : null;
  }
}
