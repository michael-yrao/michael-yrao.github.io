import { Injectable, computed, signal } from '@angular/core';
import { catchError, of } from 'rxjs';

import { contractVersionProblem } from '../contracts/contract-version';
import { PATTERN_SENSE_SCHEMA_VERSION, PatternSenseData } from '../models/pattern-sense.model';
import { isPatternSenseData } from '../pattern-sense/pattern-sense-validation';
import { ContractSource, fetchWithAuthorFallback$, isAuthorFallbackOf } from './author-fallback';
import {
  GOLD_STANDARD_REPO,
  GitHubFileService,
  LoadStatus,
  RepoRef,
  httpErrorMessage,
  sameRef,
} from './github-file.service';

const PATTERN_SENSE_FILE = 'dashboard/pattern-sense.json';
const PATTERN_SENSE_WHAT = 'Pattern Sense';
const MALFORMED_CONTRACT_MESSAGE =
  'The Pattern Sense contract is invalid — is dashboard/pattern-sense.json malformed?';

/**
 * Fetches a repo's weekly Pattern Sense deck (`dashboard/pattern-sense.json`), with the same
 * author fallback as `BigOService`. A second `load()` of the ref already ready or in flight is
 * a no-op; a different ref starts a new load.
 */
@Injectable({ providedIn: 'root' })
export class PatternSenseService {
  readonly status = signal<LoadStatus>('idle');
  readonly error = signal<string | null>(null);
  readonly data = signal<PatternSenseData | null>(null);

  /** Whose repo `data` came from; null until a load lands. */
  readonly source = signal<ContractSource | null>(null);
  /** The repo `data` actually came from; null until a load lands. */
  readonly sourceRef = signal<RepoRef | null>(null);

  private readonly requestedRef = signal<RepoRef>(GOLD_STANDARD_REPO);
  /** The viewer asked for another repo's deck and is looking at the author's. */
  readonly isAuthorFallback = computed(() => isAuthorFallbackOf(this.source(), this.requestedRef()));

  // Monotonic request id: a slow earlier fetch must not overwrite a later one.
  private seq = 0;

  constructor(private readonly github: GitHubFileService) {}

  load(ref: RepoRef = GOLD_STANDARD_REPO): void {
    const isCurrent = sameRef(ref, this.requestedRef());
    if (isCurrent && (this.status() === 'ready' || this.status() === 'loading')) return;

    const mine = ++this.seq;
    this.requestedRef.set(ref);
    this.status.set('loading');
    this.error.set(null);
    this.source.set(null);
    this.sourceRef.set(null);

    fetchWithAuthorFallback$<unknown>(this.github, ref, PATTERN_SENSE_FILE, false)
      .pipe(catchError((err) => of(new Error(httpErrorMessage(err, PATTERN_SENSE_WHAT)))))
      .subscribe((result) => {
        if (mine !== this.seq) return; // a newer load() superseded this response

        if (result instanceof Error) {
          this.fail(result.message);
          return;
        }

        const invalid = this.invalidReason(result.body);
        if (invalid) {
          this.fail(invalid);
          return;
        }

        this.data.set(result.body as PatternSenseData);
        this.source.set(result.source);
        this.sourceRef.set(result.sourceRef);
        this.status.set('ready');
      });
  }

  private fail(message: string): void {
    this.status.set('error');
    this.error.set(message);
    this.data.set(null);
  }

  /** null when the payload is a usable, schema-compatible deck; else a human reason. */
  private invalidReason(body: unknown): string | null {
    const versionProblem = contractVersionProblem(
      body,
      PATTERN_SENSE_SCHEMA_VERSION,
      PATTERN_SENSE_WHAT,
    );
    if (versionProblem) return versionProblem;
    return isPatternSenseData(body) ? null : MALFORMED_CONTRACT_MESSAGE;
  }
}
