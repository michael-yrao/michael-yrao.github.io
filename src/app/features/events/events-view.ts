// Pure view logic for the Events page — filtering, day-grouping, and display formatting.
// Nothing here reads a service or a signal, so every function is testable with plain data.

import { EventSource, EventsFeed, TechEvent } from '../../core/models/events.model';
import { localISODate } from '../../core/utils/local-date';

/** The area toolbar's selection. 'all' means nyc + online — 'other' is never shown by the
 *  area chips, since it has no chip of its own (an unrecognized area from the feed still
 *  surfaces via source/search, just not via an area toggle). */
export type EventAreaFilter = 'all' | 'nyc' | 'online';

export interface EventsFilter {
  readonly area: EventAreaFilter;
  /** `null` = no source filter (every source). */
  readonly sourceId: string | null;
  readonly query: string;
}

export const DEFAULT_EVENTS_FILTER: EventsFilter = { area: 'all', sourceId: null, query: '' };

/** One calendar day's events, in the same ascending order `groupByDay` received them. */
export interface EventDayGroup {
  readonly dayKey: string;
  readonly events: readonly TechEvent[];
}

/** An event is upcoming when it hasn't ended yet (or, with no `end`, hasn't started yet) as
 *  of `nowMs`. The worker already filters its feed to upcoming events, but the page never
 *  relies on that — a feed can sit in a viewer's tab for hours, so the client re-checks on
 *  every render. A start/end that fails to parse (`NaN`) is treated as not-upcoming, so a
 *  malformed date hides the event rather than crashing or wrongly pinning it to the top. */
export function isUpcoming(event: TechEvent, nowMs: number): boolean {
  const endMs = Date.parse(event.end ?? event.start);
  return endMs > nowMs;
}

function matchesArea(event: TechEvent, area: EventAreaFilter): boolean {
  if (area === 'all') return event.area === 'nyc' || event.area === 'online';
  return event.area === area;
}

function matchesSource(event: TechEvent, sourceId: string | null): boolean {
  return sourceId === null || event.sourceId === sourceId;
}

/** Matches `query` against an event's title, location, and (when given) its source's label
 *  and company, case-insensitively — a search for a company name finds that company's events
 *  even when the title itself never mentions it. `source` is optional and missing/unresolved
 *  contributes no text, rather than throwing. An empty/blank query matches everything. */
export function matchesQuery(
  event: TechEvent,
  query: string,
  source?: Pick<EventSource, 'label' | 'company'>,
): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [event.title, event.location, source?.label, source?.company]
    .filter((part): part is string => Boolean(part))
    .join(' ')
    .toLowerCase();
  return haystack.includes(needle);
}

/** Narrows `events` to those upcoming (as of `nowMs`) and matching `filter`. `sourcesById`
 *  resolves each event's source for `matchesQuery` — a missing entry just means that event's
 *  search text is title + location only. Pure — never mutates `events`. Input is assumed
 *  ascending by `start` (the feed's own contract), and filtering preserves that order. */
export function filterEvents(
  events: readonly TechEvent[],
  filter: EventsFilter,
  nowMs: number,
  sourcesById: Readonly<Record<string, EventSource>>,
): readonly TechEvent[] {
  return events.filter(
    (event) =>
      isUpcoming(event, nowMs) &&
      matchesArea(event, filter.area) &&
      matchesSource(event, filter.sourceId) &&
      matchesQuery(event, filter.query, sourcesById[event.sourceId]),
  );
}

/** The calendar-day key an event groups under. All-day events key off the UTC calendar date
 *  in `start` directly (a slice, not a `Date` conversion) — an all-day event's `start` is a
 *  midnight-UTC stamp for a specific day, and converting that through the viewer's local
 *  timezone can shift it onto the adjacent day (e.g. a UTC midnight start reads as the
 *  previous evening west of Greenwich). A timed event keys off its local calendar date, so
 *  it lands in the day group a viewer would actually expect it under. */
const ISO_DATE_LENGTH = 10;

function dayKeyFor(event: TechEvent): string {
  if (event.allDay) return event.start.slice(0, ISO_DATE_LENGTH);
  return localISODate(new Date(event.start));
}

/** Groups `events` (assumed ascending by `start`) into consecutive day buckets, in the order
 *  each day first appears — mirrors `CheatSheetService.techniquesByFamily`'s immutable
 *  reduce-based grouping. */
export function groupByDay(events: readonly TechEvent[]): readonly EventDayGroup[] {
  return events.reduce<EventDayGroup[]>((groups, event) => {
    const dayKey = dayKeyFor(event);
    const existing = groups.find((g) => g.dayKey === dayKey);
    if (existing) {
      return groups.map((g) => (g === existing ? { ...g, events: [...g.events, event] } : g));
    }
    return [...groups, { dayKey, events: [event] }];
  }, []);
}

const TIME_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };
const EN_DASH = '–';

/** "7:00 PM" or "7:00 PM–9:00 PM" in the viewer's local timezone (never `event.timezone` —
 *  the day group and the card's own time must agree on whose clock they're reading). "All
 *  day" for an all-day event, regardless of its `start`/`end` stamps. */
export function formatEventTime(event: TechEvent): string {
  if (event.allDay) return 'All day';
  const formatter = new Intl.DateTimeFormat(undefined, TIME_FORMAT_OPTIONS);
  const start = formatter.format(new Date(event.start));
  if (!event.end) return start;
  const end = formatter.format(new Date(event.end));
  return `${start}${EN_DASH}${end}`;
}

const DAY_LABEL_OPTIONS: Intl.DateTimeFormatOptions = {
  weekday: 'long',
  month: 'short',
  day: 'numeric',
};

/** "Saturday, Sep 26" for a day group's `dayKey` (`YYYY-MM-DD`). Built via `new Date(y, m-1,
 *  d)` — local-parts construction, never `new Date(dayKey)`, which parses a bare date as UTC
 *  midnight and can render as the previous day in a timezone west of Greenwich. */
export function formatDayLabel(dayKey: string): string {
  const [year, month, day] = dayKey.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat(undefined, DAY_LABEL_OPTIONS).format(date);
}

const AS_OF_OPTIONS: Intl.DateTimeFormatOptions = { dateStyle: 'medium', timeStyle: 'short' };

/** "Sep 26, 2026, 3:04 PM" for the toolbar's "as of …" line, from the feed's `generatedAt`. */
export function formatAsOf(generatedAt: string): string {
  return new Intl.DateTimeFormat(undefined, AS_OF_OPTIONS).format(new Date(generatedAt));
}

/** Sources with at least one upcoming event in the feed — the set the source-chip row shows.
 *  A source with `count` 0 (or absent) never gets a chip, since selecting it would always
 *  show "no matches". */
export function chipSources(feed: EventsFeed | null): readonly EventSource[] {
  return (feed?.sources ?? []).filter((source) => (source.count ?? 0) > 0);
}
