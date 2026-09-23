import { Injectable, computed, signal } from '@angular/core';
import { catchError, of } from 'rxjs';

import { ShowcaseData, ShowcaseEntry, SHOWCASE_SCHEMA_VERSION } from '../models/showcase.model';
import { indexEntries } from '../showcase/showcase-key';
import { isShowcaseEntry } from '../showcase/showcase-validation';
import {
  GOLD_STANDARD_REPO,
  GitHubFileService,
  LoadStatus,
  httpErrorMessage,
} from './github-file.service';

const SHOWCASE_FILE = 'dashboard/showcase.json';
const SHOWCASE_WHAT = 'solution code';
const MALFORMED_CONTRACT_MESSAGE =
  'The solution code contract is invalid — is dashboard/showcase.json malformed?';

/** Unvalidated JSON as it comes off the wire — everything is checked in `invalidReason`
 *  before anything downstream trusts it as a `ShowcaseData`. */
type RawShowcasePayload = { schemaVersion?: unknown; entries?: unknown } | null;

/**
 * Fetches cse-progress's curated, verbatim solution slices (`dashboard/showcase.json`) from
 * the gold-standard repo only — unlike `ProgressService`, this never reads `?repo=` (a step
 * generator is a hand-written trace of one specific attempt, so it can't follow someone
 * else's code). Loads once per session unless `force`d, and a second `load()` while one is
 * already in flight is a no-op.
 */
@Injectable({ providedIn: 'root' })
export class ShowcaseService {
  readonly status = signal<LoadStatus>('idle');
  readonly error = signal<string | null>(null);
  readonly data = signal<ShowcaseData | null>(null);

  private readonly entries = computed(() => {
    const current = this.data();
    return current ? indexEntries(current) : null;
  });

  // Monotonic request id: a slow earlier fetch must not overwrite a later, forced one.
  private seq = 0;

  constructor(private readonly github: GitHubFileService) {}

  load(force = false): void {
    if (!force && (this.status() === 'ready' || this.status() === 'loading')) return;

    const mine = ++this.seq;
    this.status.set('loading');
    this.error.set(null);

    this.github
      .fetch$<RawShowcasePayload>(GOLD_STANDARD_REPO, SHOWCASE_FILE, force)
      .pipe(catchError((err) => of(new Error(httpErrorMessage(err, SHOWCASE_WHAT)))))
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

        this.data.set(result as ShowcaseData);
        this.status.set('ready');
      });
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
    if (typeof result.schemaVersion !== 'number') return MALFORMED_CONTRACT_MESSAGE;
    if (result.schemaVersion !== SHOWCASE_SCHEMA_VERSION) {
      return `The solution code contract is schema v${result.schemaVersion}; this site speaks v${SHOWCASE_SCHEMA_VERSION}. Update the site.`;
    }
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
