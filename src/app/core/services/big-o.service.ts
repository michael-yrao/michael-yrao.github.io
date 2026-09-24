import { Injectable, signal } from '@angular/core';
import { catchError, of } from 'rxjs';

import { BigOData, BIG_O_SCHEMA_VERSION } from '../models/big-o.model';
import { isBigOEntry } from '../big-o/big-o-validation';
import {
  GOLD_STANDARD_REPO,
  GitHubFileService,
  LoadStatus,
  httpErrorMessage,
} from './github-file.service';

const BIG_O_FILE = 'dashboard/big-o.json';
const BIG_O_WHAT = 'Big-O trainer';
const MALFORMED_CONTRACT_MESSAGE =
  'The Big-O trainer contract is invalid — is dashboard/big-o.json malformed?';

/** Unvalidated JSON as it comes off the wire — everything is checked in `invalidReason`
 *  before anything downstream trusts it as a `BigOData`. */
type RawBigOPayload = { schemaVersion?: unknown; entries?: unknown } | null;

/**
 * Fetches cse-progress's Big-O trainer contract (`dashboard/big-o.json`) from the
 * gold-standard repo only, same shape as `ShowcaseService`. Loads once per session unless
 * `force`d, and a second `load()` while one is already in flight is a no-op.
 */
@Injectable({ providedIn: 'root' })
export class BigOService {
  readonly status = signal<LoadStatus>('idle');
  readonly error = signal<string | null>(null);
  readonly data = signal<BigOData | null>(null);

  // Monotonic request id: a slow earlier fetch must not overwrite a later, forced one.
  private seq = 0;

  constructor(private readonly github: GitHubFileService) {}

  load(force = false): void {
    if (!force && (this.status() === 'ready' || this.status() === 'loading')) return;

    const mine = ++this.seq;
    this.status.set('loading');
    this.error.set(null);

    this.github
      .fetch$<RawBigOPayload>(GOLD_STANDARD_REPO, BIG_O_FILE, force)
      .pipe(catchError((err) => of(new Error(httpErrorMessage(err, BIG_O_WHAT)))))
      .subscribe((result) => {
        if (mine !== this.seq) return; // a newer load() superseded this response

        if (result instanceof Error) {
          this.status.set('error');
          this.error.set(result.message);
          this.data.set(null);
          return;
        }

        const invalid = this.invalidReason(result);
        if (invalid) {
          this.status.set('error');
          this.error.set(invalid);
          this.data.set(null);
          return;
        }

        this.data.set(result as BigOData);
        this.status.set('ready');
      });
  }

  /** null when the payload is a usable, schema-compatible Big-O contract with every entry
   *  structurally valid; else a human reason. A malformed entry is named by key (or index,
   *  when even the key didn't parse) so an off-contract JSON never reaches the deck. */
  private invalidReason(result: RawBigOPayload): string | null {
    if (!result || typeof result !== 'object') return MALFORMED_CONTRACT_MESSAGE;
    if (typeof result.schemaVersion !== 'number') return MALFORMED_CONTRACT_MESSAGE;
    if (result.schemaVersion !== BIG_O_SCHEMA_VERSION) {
      return `The Big-O trainer contract is schema v${result.schemaVersion}; this site speaks v${BIG_O_SCHEMA_VERSION}. Update the site.`;
    }
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
