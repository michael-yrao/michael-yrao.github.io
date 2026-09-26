import type { EventSource, TechEvent } from '../contract';
import { type ICalDateParts, type VEventRecord, parseICalDate, parseVEvents, unescapeText } from '../ics';
import { buildEventId, classifyArea, isHttpUrl } from '../normalize';
import { zonedWallClockToUTC } from '../tz';

/** Only the source fields this adapter needs -- accepts the worker's richer internal
 * `FeedSourceConfig` (which carries the fetch `url` the public `EventSource` contract omits)
 * just as well as a plain `EventSource`. */
type SourceRef = Pick<EventSource, 'id' | 'area'>;

const LUMA_ONLINE_LOCATION_RE = /^https:\/\/luma\.com\//i;
const LUMA_UID_EVT_RE = /^(evt-[^@]+)@/;

function toUtcIso(parts: ICalDateParts): string {
  if (parts.isUtc || !parts.tzid) {
    return new Date(
      Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second),
    ).toISOString();
  }
  return new Date(zonedWallClockToUTC(parts, parts.tzid)).toISOString();
}

/**
 * Luma feeds carry no URL property. Their LOCATION is either already a `https://luma.com/...`
 * link (online event -> use it as-is) or a street address (in-person -> derive the event page
 * from the UID's `evt-...` prefix). The brief's derived shape, `https://luma.com/evt-XXXX`
 * (no `/event/` segment), 404s in practice -- `https://luma.com/event/evt-XXXX` 307-redirects
 * to the real slug (verified with `curl -sI`; see this engineer's report). We use the form
 * that actually resolves.
 */
function deriveLumaUrl(location: string, uid: string | undefined): string {
  const trimmedLocation = location.trim();
  if (LUMA_ONLINE_LOCATION_RE.test(trimmedLocation)) {
    return trimmedLocation;
  }
  const uidMatch = uid ? LUMA_UID_EVT_RE.exec(uid) : null;
  return uidMatch ? `https://luma.com/event/${uidMatch[1]}` : trimmedLocation;
}

function eventUrl(vevent: VEventRecord, uid: string | undefined, location: string): string {
  const urlProp = vevent.URL;
  if (urlProp && urlProp.value.trim().length > 0) {
    return urlProp.value.trim();
  }
  return deriveLumaUrl(location, uid);
}

function toTechEvent(vevent: VEventRecord, source: SourceRef): TechEvent | null {
  const dtstart = vevent.DTSTART;
  if (!dtstart) return null;

  const startParts = parseICalDate(dtstart.value, dtstart.params.TZID);
  const dtend = vevent.DTEND;
  const endParts = dtend ? parseICalDate(dtend.value, dtend.params.TZID) : undefined;

  const start = toUtcIso(startParts);
  const end = endParts ? toUtcIso(endParts) : undefined;
  const title = unescapeText(vevent.SUMMARY?.value ?? '(untitled event)');
  const location = vevent.LOCATION ? unescapeText(vevent.LOCATION.value) : '';
  const uid = vevent.UID?.value.trim();

  const area = classifyArea({
    summary: title,
    location,
    areaPin: source.area,
  });

  return {
    id: buildEventId(source.id, uid, title, start),
    title,
    start,
    end,
    timezone: startParts.tzid,
    allDay: startParts.isDate,
    // A URL-shaped LOCATION (Luma's online-event convention) belongs in `url`, not `location`
    // -- `TechEvent.location` is always a human-readable place, never a link.
    location: location.length > 0 && !isHttpUrl(location) ? location : undefined,
    area,
    url: eventUrl(vevent, uid, location),
    sourceId: source.id,
  };
}

const VCALENDAR_HEADER_RE = /^\s*BEGIN:VCALENDAR/;

/** Pure: raw ICS body -> normalized `TechEvent[]`. `nowMs` is accepted for interface symmetry
 * with the Bevy adapter and future recurrence expansion; iCal events carry their own instant. */
export function adaptIcalEvents(body: string, source: SourceRef, _nowMs: number): TechEvent[] {
  if (!VCALENDAR_HEADER_RE.test(body)) {
    throw new Error(`Source "${source.id}" did not return an iCal feed`);
  }
  return parseVEvents(body)
    .map((vevent) => toTechEvent(vevent, source))
    .filter((event): event is TechEvent => event !== null);
}
