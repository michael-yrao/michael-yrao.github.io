import { TestBed } from '@angular/core/testing';
import { HttpClient } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';

import { EventsService } from './events.service';
import { EventsFeed, EVENTS_SCHEMA_VERSION } from '../models/events.model';
import { EVENTS_API_URL } from '../data/site-links';

function makeFeed(overrides: Partial<EventsFeed> = {}): EventsFeed {
  return {
    schemaVersion: EVENTS_SCHEMA_VERSION,
    generatedAt: '2026-09-26T12:00:00Z',
    horizonDays: 30,
    sources: [
      { id: 's1', label: 'NYC Tech', company: 'Meetup', kind: 'ical', ok: true, count: 2 },
      { id: 's2', label: 'Broken Feed', company: 'Meetup', kind: 'ical', ok: false, error: 'timeout' },
    ],
    events: [
      {
        id: 'e1',
        title: 'Two Sum Night',
        start: '2026-09-27T23:00:00Z',
        area: 'nyc',
        url: 'https://example.com/e1',
        sourceId: 's1',
      },
    ],
    ...overrides,
  };
}

function makeHttp(get: (url: string) => unknown) {
  const calls: string[] = [];
  return {
    calls,
    get: (url: string) => {
      calls.push(url);
      return get(url);
    },
  };
}

function configure(http: { get: (url: string) => unknown }): EventsService {
  TestBed.configureTestingModule({
    providers: [EventsService, { provide: HttpClient, useValue: http }],
  });
  return TestBed.inject(EventsService);
}

describe('EventsService', () => {
  it('fetches EVENTS_API_URL and goes ready on a valid feed', () => {
    const feed = makeFeed();
    const http = makeHttp(() => of(feed));
    const service = configure(http);

    service.load();

    expect(http.calls).toEqual([EVENTS_API_URL]);
    expect(service.status()).toBe('ready');
    expect(service.error()).toBeNull();
    expect(service.data()).toEqual(feed);
    expect(service.generatedAt()).toBe(feed.generatedAt);
  });

  it('exposes only the not-ok sources via failedSources', () => {
    const service = configure(makeHttp(() => of(makeFeed())));

    service.load();

    expect(service.failedSources().map((s) => s.id)).toEqual(['s2']);
  });

  it('sets a connection-wording error on a status-0 (offline) failure', () => {
    const service = configure(makeHttp(() => throwError(() => ({ status: 0 }))));

    service.load();

    expect(service.status()).toBe('error');
    expect(service.error()).toBe('Could not reach the events feed — check your connection.');
    expect(service.data()).toBeNull();
  });

  it('sets an HTTP-status error message on a server failure', () => {
    const service = configure(makeHttp(() => throwError(() => ({ status: 500 }))));

    service.load();

    expect(service.status()).toBe('error');
    expect(service.error()).toBe('Could not load the events feed (HTTP 500).');
  });

  it('errors on a schema mismatch', () => {
    const mismatched = { ...makeFeed(), schemaVersion: EVENTS_SCHEMA_VERSION + 1 };
    const service = configure(makeHttp(() => of(mismatched)));

    service.load();

    expect(service.status()).toBe('error');
    expect(service.error()).toContain('schema');
  });

  it('errors when events is not an array', () => {
    const malformed = { ...makeFeed(), events: 'nope' };
    const service = configure(makeHttp(() => of(malformed)));

    service.load();

    expect(service.status()).toBe('error');
    expect(service.error()).toBe('The events feed has no events[] array.');
  });

  it('dedupes repeated load() calls into a single request', () => {
    const http = makeHttp(() => of(makeFeed()));
    const service = configure(http);

    service.load();
    service.load();
    service.load();

    expect(http.calls.length).toBe(1);
  });

  it('a forced load appends a ?_= cache-buster and fetches again once ready', () => {
    const http = makeHttp(() => of(makeFeed()));
    const service = configure(http);

    service.load();
    service.load(true);

    expect(http.calls.length).toBe(2);
    expect(http.calls[1]).toContain(`${EVENTS_API_URL}?_=`);
  });

  it('a forced load is a no-op while a load is already in flight', () => {
    const http = makeHttp(() => new Observable(() => {}));
    const service = configure(http);

    service.load();
    service.load(true);

    expect(http.calls.length).toBe(1);
    expect(service.status()).toBe('loading');
  });

  it('a pending request stays in the loading state and never resolves data', () => {
    const service = configure(makeHttp(() => new Observable(() => {})));

    service.load();

    expect(service.status()).toBe('loading');
    expect(service.data()).toBeNull();
  });

  it('a forced reload that fails keeps the previously loaded data on screen', () => {
    let call = 0;
    const http = makeHttp(() => {
      call += 1;
      return call === 1 ? of(makeFeed()) : throwError(() => ({ status: 500 }));
    });
    const service = configure(http);

    service.load();
    service.load(true);

    expect(service.status()).toBe('error');
    expect(service.data()).not.toBeNull();
    expect(service.data()?.events.length).toBe(1);
  });
});
