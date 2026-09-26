import { describe, expect, it, vi } from 'vitest';
import { buildFeed, FETCH_TIMEOUT_MS, type FetchImpl } from './aggregate';
import type { FeedSourceConfig } from './sources';

const NOW_MS = Date.UTC(2026, 8, 26, 17);

const icalSource: FeedSourceConfig = {
  id: 'ical-src',
  label: 'iCal Source',
  company: 'Co',
  kind: 'ical',
  url: 'https://example.com/ical',
};

const bevySource: FeedSourceConfig = {
  id: 'bevy-src',
  label: 'Bevy Source',
  company: 'Co',
  kind: 'bevy',
  url: 'https://example.com/bevy',
};

const validIcalBody = [
  'BEGIN:VCALENDAR',
  'BEGIN:VEVENT',
  'UID:evt-1@example.com',
  'DTSTART:20261001T120000Z',
  'SUMMARY:Test Event',
  'URL;VALUE=URI:https://example.com/e/1',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

const validBevyBody = JSON.stringify({
  results: [
    {
      id: 1,
      title: 'Bevy Event',
      start_date: '2026-10-02T12:00:00-04:00',
      url: 'https://example.com/e/2',
      event_type_title: 'In-Person User Group Meeting',
      chapter: { relative_url: '/new-york/', timezone: 'America/New_York' },
    },
  ],
});

function okResponse(body: string): Response {
  return new Response(body, { status: 200 });
}

describe('buildFeed', () => {
  it('aggregates events from every healthy source and records ok + count', async () => {
    const fetchImpl: FetchImpl = vi.fn(async (url) =>
      url.includes('ical') ? okResponse(validIcalBody) : okResponse(validBevyBody),
    );
    const feed = await buildFeed([icalSource, bevySource], fetchImpl, NOW_MS);

    expect(feed.events).toHaveLength(2);
    expect(feed.sources).toEqual([
      { id: 'ical-src', label: 'iCal Source', company: 'Co', kind: 'ical', ok: true, count: 1 },
      { id: 'bevy-src', label: 'Bevy Source', company: 'Co', kind: 'bevy', ok: true, count: 1 },
    ]);
  });

  it('one failing source never fails the response; its error is recorded and others still show', async () => {
    const fetchImpl: FetchImpl = vi.fn(async (url) => {
      if (url.includes('ical')) throw new Error('boom');
      return okResponse(validBevyBody);
    });
    const feed = await buildFeed([icalSource, bevySource], fetchImpl, NOW_MS);

    const icalResult = feed.sources.find((s) => s.id === 'ical-src');
    const bevyResult = feed.sources.find((s) => s.id === 'bevy-src');
    expect(icalResult?.ok).toBe(false);
    expect(icalResult?.error).toBe('boom');
    expect(bevyResult?.ok).toBe(true);
    expect(feed.events).toHaveLength(1);
  });

  it('records a timeout as a distinct, descriptive per-source error', async () => {
    const fetchImpl: FetchImpl = vi.fn(async (_url, init) => {
      expect(init?.signal).toBeInstanceOf(AbortSignal);
      throw new DOMException('The operation was aborted', 'TimeoutError');
    });
    const feed = await buildFeed([icalSource], fetchImpl, NOW_MS);
    expect(feed.sources[0]?.ok).toBe(false);
    expect(feed.sources[0]?.error).toBe('Request timed out');
  });

  it('records a non-matching body (e.g. an HTML error page) as a per-source error, not a crash', async () => {
    const fetchImpl: FetchImpl = vi.fn(async () => okResponse('<html>rate limited</html>'));
    const feed = await buildFeed([icalSource], fetchImpl, NOW_MS);
    expect(feed.sources[0]?.ok).toBe(false);
    expect(feed.sources[0]?.error).toMatch(/did not return an iCal feed/);
    expect(feed.events).toHaveLength(0);
  });

  it('records a non-2xx upstream status as a per-source error', async () => {
    const fetchImpl: FetchImpl = vi.fn(async () => new Response('nope', { status: 503 }));
    const feed = await buildFeed([icalSource], fetchImpl, NOW_MS);
    expect(feed.sources[0]?.ok).toBe(false);
    expect(feed.sources[0]?.error).toMatch(/503/);
  });

  it('passes the fetch timeout and Cloudflare cache hints on every request', async () => {
    const fetchImpl: FetchImpl = vi.fn(async () => okResponse(validIcalBody));
    await buildFeed([icalSource], fetchImpl, NOW_MS);
    const init = (fetchImpl as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as RequestInit & {
      cf?: { cacheTtl: number };
    };
    expect(init.cf?.cacheTtl).toBe(600);
    expect(FETCH_TIMEOUT_MS).toBe(8000);
  });

  it('strips the internal fetch url off every source in the response', async () => {
    const fetchImpl: FetchImpl = vi.fn(async () => okResponse(validIcalBody));
    const feed = await buildFeed([icalSource], fetchImpl, NOW_MS);
    expect(feed.sources[0]).not.toHaveProperty('url');
  });

  it('sets schemaVersion, generatedAt and horizonDays on the feed envelope', async () => {
    const fetchImpl: FetchImpl = vi.fn(async () => okResponse(validIcalBody));
    const feed = await buildFeed([icalSource], fetchImpl, NOW_MS);
    expect(feed.schemaVersion).toBe(1);
    expect(feed.generatedAt).toBe(new Date(NOW_MS).toISOString());
    expect(feed.horizonDays).toBe(90);
  });

  it('counts only a source\'s events that survive into the final served events[] (post upcoming-filter + dedupe), not its raw adapter output', async () => {
    const pastAndUpcomingBody = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'UID:past@example.com',
      'DTSTART:20250101T120000Z',
      'SUMMARY:Past Event',
      'URL;VALUE=URI:https://example.com/e/past',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'UID:upcoming@example.com',
      'DTSTART:20261001T120000Z',
      'SUMMARY:Upcoming Event',
      'URL;VALUE=URI:https://example.com/e/upcoming',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const fetchImpl: FetchImpl = vi.fn(async () => okResponse(pastAndUpcomingBody));

    const feed = await buildFeed([icalSource], fetchImpl, NOW_MS);

    expect(feed.events).toHaveLength(1);
    expect(feed.sources[0]).toMatchObject({ ok: true, count: 1 });
  });

  it('reports count: 0 (still ok: true) for a source whose events are all past', async () => {
    const allPastBody = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT',
      'UID:past-1@example.com',
      'DTSTART:20250101T120000Z',
      'SUMMARY:Past Event 1',
      'URL;VALUE=URI:https://example.com/e/past-1',
      'END:VEVENT',
      'BEGIN:VEVENT',
      'UID:past-2@example.com',
      'DTSTART:20250201T120000Z',
      'SUMMARY:Past Event 2',
      'URL;VALUE=URI:https://example.com/e/past-2',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    const fetchImpl: FetchImpl = vi.fn(async () => okResponse(allPastBody));

    const feed = await buildFeed([icalSource], fetchImpl, NOW_MS);

    expect(feed.events).toHaveLength(0);
    expect(feed.sources[0]).toMatchObject({ ok: true, count: 0 });
  });
});
