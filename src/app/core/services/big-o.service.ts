import { Injectable, computed, signal } from '@angular/core';
import { catchError, of } from 'rxjs';

import { contractVersionProblem } from '../contracts/contract-version';
import { BigOData, BIG_O_SCHEMA_VERSION } from '../models/big-o.model';
import { isBigOEntry } from '../big-o/big-o-validation';
import { ContractSource, fetchWithAuthorFallback$, isAuthorFallbackOf } from './author-fallback';
import {
  GOLD_STANDARD_REPO,
  GitHubFileService,
  LoadStatus,
  RepoRef,
  httpErrorMessage,
  sameRef,
} from './github-file.service';

const BIG_O_FILE = 'dashboard/big-o.json';
const BIG_O_WHAT = 'Big-O trainer';
const MALFORMED_CONTRACT_MESSAGE =
  'The Big-O trainer contract is invalid — is dashboard/big-o.json malformed?';

/** Unvalidated JSON as it comes off the wire — everything is checked in `invalidReason`
 *  before anything downstream trusts it as a `BigOData`. */
type RawBigOPayload = { schemaVersion?: unknown; entries?: unknown } | null;

/**
 * Fetches a repo's Big-O trainer contract (`dashboard/big-o.json`), same shape and same
 * author fallback as `ShowcaseService`: the caller's ref (default: the gold-standard repo),
 * else, on an HTTP 404 only, the author's. A second `load()` of the ref already ready or in
 * flight is a no-op unless `force`d; a different ref starts a new load.
 */
@Injectable({ providedIn: 'root' })
export class BigOService {
  readonly status = signal<LoadStatus>('idle');
  readonly error = signal<string | null>(null);
  readonly data = signal<BigOData | null>(null);
  /** Whose repo `data` came from; null until a load lands. */
  readonly source = signal<ContractSource | null>(null);
  /** The repo `data` actually came from; null until a load lands. */
  readonly sourceRef = signal<RepoRef | null>(null);

  private readonly requestedRef = signal<RepoRef>(GOLD_STANDARD_REPO);
  /** The viewer asked for another repo's code and is looking at the author's. */
  readonly isAuthorFallback = computed(() => isAuthorFallbackOf(this.source(), this.requestedRef()));

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

    fetchWithAuthorFallback$<RawBigOPayload>(this.github, ref, BIG_O_FILE, force)
      .pipe(catchError((err) => of(new Error(httpErrorMessage(err, BIG_O_WHAT)))))
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

        this.data.set(result.body as BigOData);
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

  /** null when the payload is a usable, schema-compatible Big-O contract with every entry
   *  structurally valid; else a human reason. A malformed entry is named by key (or index,
   *  when even the key didn't parse) so an off-contract JSON never reaches the deck. */
  private invalidReason(result: RawBigOPayload): string | null {
    if (!result || typeof result !== 'object') return MALFORMED_CONTRACT_MESSAGE;
    const versionProblem = contractVersionProblem(result, BIG_O_SCHEMA_VERSION, BIG_O_WHAT);
    if (versionProblem) return versionProblem;
    if (!Array.isArray(result.entries)) return MALFORMED_CONTRACT_MESSAGE;

    const badEntryIndex = result.entries.findIndex((entry) => !isBigOEntry(entry));
    if (badEntryIndex !== -1)
      return this.malformedEntryMessage(result.entries[badEntryIndex], badEntryIndex);

    return null;
  }

  private malformedEntryMessage(entry: unknown, index: number): string {
    const key = this.keyOf(entry);
    const label = key !== null ? key : `index ${index}`;
    return `The Big-O trainer contract has a malformed entry (${label}) — is dashboard/big-o.json malformed?`;
  }

  private keyOf(entry: unknown): string | null {
    if (typeof entry !== 'object' || entry === null) return null;
    const key = (entry as { key?: unknown }).key;
    return typeof key === 'string' ? key : null;
  }
}
