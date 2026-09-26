import { describe, expect, it } from 'vitest';
import type { TechEvent } from './contract';
import {
  buildEventId,
  classifyArea,
  dedupeEvents,
  fnv1a,
  isUpcoming,
  sortEvents,
} from './normalize';

// Precedence (2026-09-26, tech-lead decision -- first match wins):
//   a. source pin -> unconditional
//   b. Bevy Virtual / an online keyword in SUMMARY+LOCATION -> 'online'
//   c. New York in LOCATION or SUMMARY, or Bevy /new-york/ chapter -> 'nyc'
//   d. LOCATION empty or a URL -> 'online' (fallback)
//   e. otherwise -> 'other'
describe('classifyArea', () => {
  it('(a) a source pin wins unconditionally, even over an online keyword in the summary', () => {
    expect(classifyArea({ summary: 'Monthly Webinar', location: '123 Main St', areaPin: 'nyc' })).toBe(
      'nyc',
    );
  });

  it('(a) a source pin wins unconditionally, even over an empty LOCATION', () => {
    expect(classifyArea({ summary: 'x', location: '', areaPin: 'nyc' })).toBe('nyc');
  });

  it('(b) is online when the Bevy event_type_title is Virtual', () => {
    expect(classifyArea({ summary: 'x', isVirtualEventType: true })).toBe('online');
  });

  it('(b) is online when the summary matches an online keyword', () => {
    expect(classifyArea({ summary: 'Monthly Webinar', location: '123 Main St' })).toBe('online');
  });

  it('(b) the online keyword wins over a LOCATION that would otherwise be empty/URL', () => {
    expect(classifyArea({ summary: 'Monthly Webinar', location: '' })).toBe('online');
  });

  it('(c) is nyc when ICS LOCATION matches a NYC pattern', () => {
    expect(classifyArea({ summary: 'x', location: '620 8th Ave, New York, NY 10018' })).toBe('nyc');
  });

  it('(c) is nyc when only the SUMMARY names New York City, even with a URL LOCATION', () => {
    // The exact live Datadog/Luma case: "Infra Demo Night | New York City" with an online
    // luma.com URL as LOCATION -- the NYC-in-summary signal (c) must win over the
    // empty-or-URL-location fallback (d).
    expect(
      classifyArea({
        summary: 'Infra Demo Night | New York City',
        location: 'https://luma.com/event/evt-7h9SGiYxFEGPhAu',
      }),
    ).toBe('nyc');
  });

  it('(c) is nyc when the Bevy chapter is /new-york/', () => {
    expect(classifyArea({ summary: 'x', isNycChapter: true })).toBe('nyc');
  });

  it('(d) is online when ICS LOCATION is empty and nothing else matches', () => {
    expect(classifyArea({ summary: 'x', location: '' })).toBe('online');
  });

  it('(d) is online when ICS LOCATION is a URL and the summary names no city', () => {
    // The live Luma "Datadog Workshop" case: an online link, no place name anywhere.
    expect(classifyArea({ summary: 'Datadog Workshop', location: 'https://luma.com/event/evt-1' })).toBe(
      'online',
    );
  });

  it('(e) is other when nothing matches', () => {
    expect(classifyArea({ summary: 'x', location: 'Herengracht 601, Amsterdam' })).toBe('other');
  });
});

describe('isUpcoming', () => {
  const nowMs = Date.UTC(2026, 8, 26, 17);

  it('keeps an event that starts within the horizon', () => {
    expect(isUpcoming({ start: '2026-10-01T00:00:00.000Z' }, nowMs)).toBe(true);
  });

  it('drops an event that starts beyond the 90-day horizon', () => {
    expect(isUpcoming({ start: '2027-06-01T00:00:00.000Z' }, nowMs)).toBe(false);
  });

  it('keeps an event within the 60-minute post-end grace period', () => {
    const start = new Date(nowMs - 90 * 60 * 1000).toISOString();
    const end = new Date(nowMs - 30 * 60 * 1000).toISOString();
    expect(isUpcoming({ start, end }, nowMs)).toBe(true);
  });

  it('drops an event that ended more than 60 minutes ago', () => {
    const start = new Date(nowMs - 3 * 60 * 60 * 1000).toISOString();
    const end = new Date(nowMs - 2 * 60 * 60 * 1000).toISOString();
    expect(isUpcoming({ start, end }, nowMs)).toBe(false);
  });

  it('falls back to start when there is no end', () => {
    const start = new Date(nowMs - 30 * 60 * 1000).toISOString();
    expect(isUpcoming({ start }, nowMs)).toBe(true);
  });
});

describe('fnv1a', () => {
  it('is deterministic', () => {
    expect(fnv1a('hello')).toBe(fnv1a('hello'));
  });

  it('differs for different input', () => {
    expect(fnv1a('hello')).not.toBe(fnv1a('world'));
  });
});

describe('buildEventId', () => {
  it('uses the uid when present', () => {
    expect(buildEventId('src', 'uid-1', 'Title', '2026-01-01T00:00:00.000Z')).toBe('src:uid-1');
  });

  it('falls back to a deterministic hash when there is no uid', () => {
    const id = buildEventId('src', undefined, 'Title', '2026-01-01T00:00:00.000Z');
    expect(id).toBe(`src:${fnv1a('Title2026-01-01T00:00:00.000Z')}`);
  });
});

function event(overrides: Partial<TechEvent>): TechEvent {
  return {
    id: 'a:1',
    title: 'A',
    start: '2026-01-01T00:00:00.000Z',
    area: 'nyc',
    url: 'https://example.com',
    sourceId: 'a',
    ...overrides,
  };
}

describe('sortEvents', () => {
  it('sorts ascending by start, then by title', () => {
    const events = [
      event({ id: 'a:1', title: 'B', start: '2026-02-01T00:00:00.000Z' }),
      event({ id: 'a:2', title: 'Z', start: '2026-01-01T00:00:00.000Z' }),
      event({ id: 'a:3', title: 'A', start: '2026-01-01T00:00:00.000Z' }),
    ];
    expect(sortEvents(events).map((e) => e.id)).toEqual(['a:3', 'a:2', 'a:1']);
  });

  it('does not mutate the input array', () => {
    const events = [event({ id: 'a:1', start: '2026-02-01T00:00:00.000Z' }), event({ id: 'a:2' })];
    const copy = [...events];
    sortEvents(events);
    expect(events).toEqual(copy);
  });
});

describe('dedupeEvents', () => {
  it('keeps the first event for a repeated id', () => {
    const events = [event({ id: 'a:1', title: 'first' }), event({ id: 'a:1', title: 'second' })];
    const deduped = dedupeEvents(events);
    expect(deduped).toHaveLength(1);
    expect(deduped[0]?.title).toBe('first');
  });
});
