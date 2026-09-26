import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of } from 'rxjs';

import { EventSource, EventsFeed, EVENTS_SCHEMA_VERSION } from '../models/events.model';
import { EVENTS_API_URL } from '../data/site-links';
import { LoadStatus } from './github-file.service';

/** The status code `HttpClient` reports for a network failure (no response reached the
 *  server at all — offline, DNS failure, CORS block) — distinct from any real HTTP status
 *  the worker itself could return. */
const OFFLINE_STATUS = 0;

/** Unvalidated JSON as it comes off the wire — checked in `invalidReason` before anything
 *  downstream trusts it as an `EventsFeed`. */
type RawEventsPayload = { schemaVersion?: unknown; events?: unknown } | null;

/**
 * Fetches the Tech Events feed from the Cloudflare Worker at `EVENTS_API_URL`. Loads once per
 * session unless `force`d; a `force`d reload is honoured only once the previous load has
 * settled (never while one is already in flight) and busts the worker's cache with a
 * `?_=Date.now()` query param. `data` is only ever replaced by a successful, schema-valid
 * response — a failed reload (forced or not) leaves whatever was already loaded on screen
 * instead of blanking the page.
 */
@Injectable({ providedIn: 'root' })
export class EventsService {
  private readonly http = inject(HttpClient);

  readonly status = signal<LoadStatus>('idle');
  readonly error = signal<string | null>(null);
  readonly data = signal<EventsFeed | null>(null);
  readonly loadedAt = signal<Date | null>(null);

  readonly generatedAt = computed<string | null>(() => this.data()?.generatedAt ?? null);

  readonly failedSources = computed<readonly EventSource[]>(() =>
    (this.data()?.sources ?? []).filter((source) => !source.ok),
  );

  /** A no-op while a load is already in flight (forced or not), and a no-op on an unforced
   *  call once a load has already succeeded. */
  load(force = false): void {
    if (this.status() === 'loading') return;
    if (this.status() === 'ready' && !force) return;

    this.status.set('loading');
    this.error.set(null);

    const url = force ? `${EVENTS_API_URL}?_=${Date.now()}` : EVENTS_API_URL;

    this.http
      .get<RawEventsPayload>(url)
      .pipe(catchError((err) => of(new Error(this.eventsErrorMessage(err)))))
      .subscribe((result) => {
        if (result instanceof Error) {
          this.status.set('error');
          this.error.set(result.message);
          return;
        }

        const invalid = this.invalidReason(result);
        if (invalid) {
          this.status.set('error');
          this.error.set(invalid);
          return;
        }

        this.data.set(result as EventsFeed);
        this.loadedAt.set(new Date());
        this.status.set('ready');
      });
  }

  /** `null` when `result` is a usable, schema-compatible feed; else a human reason. Checks
   *  only `schemaVersion` and `events[]` — the two fields every downstream reader depends on
   *  (`sources` is read defensively elsewhere via `?? []`, so a missing/malformed
   *  `sources` degrades to "no chips" rather than an error page). */
  private invalidReason(result: RawEventsPayload): string | null {
    if (!result || typeof result !== 'object') return 'The events feed is invalid.';
    if (typeof result.schemaVersion !== 'number') return 'The events feed is invalid.';
    if (result.schemaVersion !== EVENTS_SCHEMA_VERSION) {
      return `The events feed is schema v${result.schemaVersion}; this site speaks v${EVENTS_SCHEMA_VERSION}. Update the site.`;
    }
    if (!Array.isArray(result.events)) return 'The events feed has no events[] array.';
    return null;
  }

  private eventsErrorMessage(err: { status?: number }): string {
    const status = err?.status;
    if (status === OFFLINE_STATUS) return 'Could not reach the events feed — check your connection.';
    return `Could not load the events feed (HTTP ${status ?? '?'}).`;
  }
}
