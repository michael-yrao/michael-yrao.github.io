import { Injectable, computed, signal } from '@angular/core';
import { catchError, of } from 'rxjs';

import { contractVersionProblem } from '../contracts/contract-version';
import { ShowcaseData, ShowcaseEntry, SHOWCASE_SCHEMA_VERSION } from '../models/showcase.model';
import { indexEntries } from '../showcase/showcase-key';
import { isShowcaseEntry } from '../showcase/showcase-validation';
import { ContractSource, fetchWithAuthorFallback$, isAuthorFallbackOf } from './author-fallback';
import {
  GOLD_STANDARD_REPO,
  GitHubFileService,
  LoadStatus,
  RepoRef,
  httpErrorMessage,
  sameRef,
} from './github-file.service';

const SHOWCASE_FILE = 'dashboard/showcase.json';
const SHOWCASE_WHAT = 'solution code';
const MALFORMED_CONTRACT_MESSAGE =
  'The solution code contract is invalid — is dashboard/showcase.json malformed?';

/** Unvalidated JSON as it comes off the wire — everything is checked in `invalidReason`
 *  before anything downstream trusts it as a `ShowcaseData`. */
type RawShowcasePayload = { schemaVersion?: unknown; entries?: unknown } | null;

/**
 * Fetches a repo's curated, verbatim solution slices (`dashboard/showcase.json`). The caller
 * passes the viewer's `?repo=` ref (default: the gold-standard repo); when that repo has no
 * showcase file (HTTP 404 only) the author's is used instead and `isAuthorFallback` says so —
 * the walkthrough's step generators are hand-traced against the author's attempt. A second
 * `load()` of the ref already ready or in flight is a no-op unless `force`d; a different ref
 * starts a new load.
 */
@Injectable({ providedIn: 'root' })
export class ShowcaseService {
  readonly status = signal<LoadStatus>('idle');
  readonly error = signal<string | null>(null);
  readonly data = signal<ShowcaseData | null>(null);
  /** Whose repo `data` came from; null until a load lands. */
  readonly source = signal<ContractSource | null>(null);
  /** The repo `data` actually came from; null until a load lands. */
  readonly sourceRef = signal<RepoRef | null>(null);

  private readonly requestedRef = signal<RepoRef>(GOLD_STANDARD_REPO);
  /** The viewer asked for another repo's code and is looking at the author's. */
  readonly isAuthorFallback = computed(() => isAuthorFallbackOf(this.source(), this.requestedRef()));

  private readonly entries = computed(() => {
    const current = this.data();
    return current ? indexEntries(current) : null;
  });

  // Monotonic request id: a slow earlier fetch must not overwrite a later, forced one.
  private seq = 0;

  constructor(private readonly github: GitHubFileService) {}

  load(ref: RepoRef = GOLD_STANDARD_REPO, force = false): void {
    const isCurrent = sameRef(ref, this.requestedRef());
    if (!force && isCurrent && (this.status() === 'ready' || this.status() === 'loading')) return;

    const mine = ++this.seq;
    this.requestedRef.set(ref);
    this.status.set('loading');
    this.error.set(null);
    this.source.set(null);
    this.sourceRef.set(null);

    fetchWithAuthorFallback$<RawShowcasePayload>(this.github, ref, SHOWCASE_FILE, force)
      .pipe(catchError((err) => of(new Error(httpErrorMessage(err, SHOWCASE_WHAT)))))
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

        this.data.set(result.body as ShowcaseData);
        this.source.set(result.source);
        this.sourceRef.set(result.sourceRef);
        this.status.set('ready');
      });
  }

  /** Re-fetches the ref last requested, bypassing caches (the Retry button). */
  reload(): void {
    this.load(this.requestedRef(), true);
  }

  private fail(message: string): void {
    this.status.set('error');
    this.error.set(message);
    this.data.set(null);
  }

  entryFor(key: string | null): ShowcaseEntry | null {
    if (key === null) return null;
    return this.entries()?.get(key) ?? null;
  }

  /** null when the payload is a usable, schema-compatible showcase contract with every entry
   *  structurally valid; else a human reason. A malformed entry is named by key (or index,
   *  when even the key didn't parse) so an off-contract JSON never reaches `buildDisplay`. */
  private invalidReason(result: RawShowcasePayload): string | null {
    if (!result || typeof result !== 'object') return MALFORMED_CONTRACT_MESSAGE;
    const versionProblem = contractVersionProblem(result, SHOWCASE_SCHEMA_VERSION, SHOWCASE_WHAT);
    if (versionProblem) return versionProblem;
    if (!Array.isArray(result.entries)) return MALFORMED_CONTRACT_MESSAGE;

    const badEntryIndex = result.entries.findIndex((entry) => !isShowcaseEntry(entry));
    if (badEntryIndex !== -1)
      return this.malformedEntryMessage(result.entries[badEntryIndex], badEntryIndex);

    return null;
  }

  private malformedEntryMessage(entry: unknown, index: number): string {
    const key = this.keyOf(entry);
    const label = key !== null ? key : `index ${index}`;
    return `The solution code contract has a malformed entry (${label}) — is dashboard/showcase.json malformed?`;
  }

  private keyOf(entry: unknown): string | null {
    if (typeof entry !== 'object' || entry === null) return null;
    const key = (entry as { key?: unknown }).key;
    return typeof key === 'string' ? key : null;
  }
}
