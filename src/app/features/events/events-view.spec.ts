import { EventSource, TechEvent } from '../../core/models/events.model';
import {
  chipSources,
  DEFAULT_EVENTS_FILTER,
  EventsFilter,
  filterEvents,
  formatAsOf,
  formatDayLabel,
  formatEventTime,
  groupByDay,
  isUpcoming,
  matchesQuery,
} from './events-view';

const NOW_MS = Date.parse('2026-09-26T12:00:00Z');

function makeEvent(overrides: Partial<TechEvent> = {}): TechEvent {
  return {
    id: 'evt-1',
    title: 'TypeScript Meetup',
    start: '2026-09-27T23:00:00Z',
    area: 'nyc',
    url: 'https://example.com/evt-1',
    sourceId: 'src-1',
    ...overrides,
  };
}

describe('isUpcoming', () => {
  it('is true for an event that starts after now and has no end', () => {
    expect(isUpcoming(makeEvent({ start: '2026-09-27T23:00:00Z' }), NOW_MS)).toBe(true);
  });

  it('is false for an event that already ended', () => {
    expect(
      isUpcoming(makeEvent({ start: '2026-09-25T18:00:00Z', end: '2026-09-25T20:00:00Z' }), NOW_MS),
    ).toBe(false);
  });

  it('is true for an in-progress event (started, not yet ended)', () => {
    expect(
      isUpcoming(makeEvent({ start: '2026-09-26T11:00:00Z', end: '2026-09-26T13:00:00Z' }), NOW_MS),
    ).toBe(true);
  });

  it('is false for an event with an unparsable date', () => {
    expect(isUpcoming(makeEvent({ start: 'not-a-date' }), NOW_MS)).toBe(false);
  });
});

describe('matchesQuery', () => {
  it('matches an empty/blank query against anything', () => {
    expect(matchesQuery(makeEvent(), '')).toBe(true);
    expect(matchesQuery(makeEvent(), '   ')).toBe(true);
  });

  it('matches the title case-insensitively', () => {
    expect(matchesQuery(makeEvent({ title: 'React NYC Night' }), 'react')).toBe(true);
    expect(matchesQuery(makeEvent({ title: 'React NYC Night' }), 'vue')).toBe(false);
  });

  it('matches the location', () => {
    expect(matchesQuery(makeEvent({ location: 'Brooklyn, NY' }), 'brooklyn')).toBe(true);
  });

  it('does not throw when location is absent', () => {
    expect(matchesQuery(makeEvent({ location: undefined }), 'anything')).toBe(false);
  });

  it("matches an event's source company even when the title lacks the word", () => {
    const event = makeEvent({ title: 'Observability Night' });
    const source: Pick<EventSource, 'label' | 'company'> = { label: 'Obs Meetup', company: 'Datadog' };

    expect(matchesQuery(event, 'datadog', source)).toBe(true);
  });

  it("matches an event's source label even when the title lacks the word", () => {
    const event = makeEvent({ title: 'Monthly Meetup' });
    const source: Pick<EventSource, 'label' | 'company'> = { label: 'React NYC', company: 'Meetup' };

    expect(matchesQuery(event, 'react nyc', source)).toBe(true);
  });

  it('does not throw and matches only title/location when no source is given', () => {
    expect(matchesQuery(makeEvent({ title: 'Datadog Night' }), 'datadog')).toBe(true);
    expect(matchesQuery(makeEvent({ title: 'Some Meetup' }), 'datadog')).toBe(false);
  });
});

describe('filterEvents', () => {
  const nyc = makeEvent({ id: 'nyc-1', area: 'nyc', sourceId: 'src-a', title: 'NYC Talk' });
  const online = makeEvent({ id: 'online-1', area: 'online', sourceId: 'src-b', title: 'Online Talk' });
  const other = makeEvent({ id: 'other-1', area: 'other', sourceId: 'src-c', title: 'Other Talk' });
  const past = makeEvent({ id: 'past-1', start: '2026-09-01T12:00:00Z', title: 'Past Talk' });
  const events = [nyc, online, other, past];
  const sourcesById: Readonly<Record<string, EventSource>> = {
    'src-b': { id: 'src-b', label: 'React NYC', company: 'Datadog', kind: 'bevy', ok: true },
  };

  it("'all' includes nyc + online but never other", () => {
    const visible = filterEvents(events, DEFAULT_EVENTS_FILTER, NOW_MS, sourcesById);
    expect(visible.map((e) => e.id)).toEqual(['nyc-1', 'online-1']);
  });

  it("'nyc' hides online and other", () => {
    const filter: EventsFilter = { ...DEFAULT_EVENTS_FILTER, area: 'nyc' };
    expect(filterEvents(events, filter, NOW_MS, sourcesById).map((e) => e.id)).toEqual(['nyc-1']);
  });

  it("'online' hides nyc and other", () => {
    const filter: EventsFilter = { ...DEFAULT_EVENTS_FILTER, area: 'online' };
    expect(filterEvents(events, filter, NOW_MS, sourcesById).map((e) => e.id)).toEqual(['online-1']);
  });

  it('always excludes past events regardless of area', () => {
    const filter: EventsFilter = { ...DEFAULT_EVENTS_FILTER, area: 'nyc' };
    expect(filterEvents(events, filter, NOW_MS, sourcesById).map((e) => e.id)).not.toContain('past-1');
  });

  it('narrows by sourceId', () => {
    const filter: EventsFilter = { ...DEFAULT_EVENTS_FILTER, sourceId: 'src-b' };
    expect(filterEvents(events, filter, NOW_MS, sourcesById).map((e) => e.id)).toEqual(['online-1']);
  });

  it('narrows by query against the title', () => {
    const filter: EventsFilter = { ...DEFAULT_EVENTS_FILTER, query: 'NYC Talk' };
    expect(filterEvents(events, filter, NOW_MS, sourcesById).map((e) => e.id)).toEqual(['nyc-1']);
  });

  it("narrows by query against the resolved source's company, via sourcesById", () => {
    const filter: EventsFilter = { ...DEFAULT_EVENTS_FILTER, query: 'datadog' };
    expect(filterEvents(events, filter, NOW_MS, sourcesById).map((e) => e.id)).toEqual(['online-1']);
  });

  it('a query still narrows correctly when sourcesById has no entry for an event', () => {
    const filter: EventsFilter = { ...DEFAULT_EVENTS_FILTER, query: 'NYC Talk' };
    expect(filterEvents(events, filter, NOW_MS, {}).map((e) => e.id)).toEqual(['nyc-1']);
  });

  it('never mutates the input array', () => {
    const copy = [...events];
    filterEvents(events, DEFAULT_EVENTS_FILTER, NOW_MS, sourcesById);
    expect(events).toEqual(copy);
  });
});

describe('groupByDay', () => {
  it('groups timed events by their local calendar date, in first-appearance order', () => {
    // Instants built from LOCAL wall-clock times, so the expected grouping holds in whatever
    // timezone the test runner uses (CI runs in UTC; a fixed-UTC fixture only grouped into
    // two days in Eastern time).
    const local = (y: number, m: number, d: number, h: number, min = 0) =>
      new Date(y, m - 1, d, h, min).toISOString();
    const events = [
      makeEvent({ id: 'a', start: local(2026, 9, 27, 19) }), // 7pm local on Sep 27
      makeEvent({ id: 'b', start: local(2026, 9, 27, 20, 30) }), // 8:30pm local, still Sep 27
      makeEvent({ id: 'c', start: local(2026, 9, 29, 11) }), // Sep 29
    ];

    const groups = groupByDay(events);

    expect(groups.length).toBe(2);
    expect(groups[0].events.map((e) => e.id)).toEqual(['a', 'b']);
    expect(groups[1].events.map((e) => e.id)).toEqual(['c']);
  });

  it('keys an all-day event by its UTC calendar date, not a local-timezone conversion', () => {
    const allDay = makeEvent({ id: 'ad', start: '2026-09-30T00:00:00Z', allDay: true });

    const groups = groupByDay([allDay]);

    expect(groups[0].dayKey).toBe('2026-09-30');
  });

  it('returns an empty array for no events', () => {
    expect(groupByDay([])).toEqual([]);
  });
});

describe('formatEventTime', () => {
  it("returns 'All day' for an all-day event", () => {
    expect(formatEventTime(makeEvent({ allDay: true }))).toBe('All day');
  });

  it('returns a single time when there is no end', () => {
    const result = formatEventTime(makeEvent({ end: undefined }));
    expect(result.length).toBeGreaterThan(0);
    expect(result).not.toContain('–');
  });

  it('returns a start–end range when there is an end', () => {
    const result = formatEventTime(
      makeEvent({ start: '2026-09-27T23:00:00Z', end: '2026-09-28T01:00:00Z' }),
    );
    expect(result).toContain('–');
  });
});

describe('formatDayLabel', () => {
  it('includes the day number', () => {
    expect(formatDayLabel('2026-09-26')).toContain('26');
  });
});

describe('formatAsOf', () => {
  it('returns a non-empty string for a valid ISO timestamp', () => {
    expect(formatAsOf('2026-09-26T12:00:00Z').length).toBeGreaterThan(0);
  });
});

describe('chipSources', () => {
  const sources = [
    { id: 's1', label: 'One', company: 'Co', kind: 'ical' as const, ok: true, count: 3 },
    { id: 's2', label: 'Two', company: 'Co', kind: 'bevy' as const, ok: true, count: 0 },
    { id: 's3', label: 'Three', company: 'Co', kind: 'ical' as const, ok: true },
  ];

  it('keeps only sources with a positive count', () => {
    expect(chipSources({ schemaVersion: 1, generatedAt: 'x', horizonDays: 30, sources, events: [] }).map((s) => s.id)).toEqual(['s1']);
  });

  it('returns an empty array for a null feed', () => {
    expect(chipSources(null)).toEqual([]);
  });
});
