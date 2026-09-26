import type { EventArea, TechEvent } from './contract';

/** Signals an adapter has already extracted for one event, enough to classify its area. */
export interface AreaSignals {
  summary: string;
  /**
   * The ICS LOCATION value, unescaped. `undefined` when the concept doesn't apply (Bevy has
   * no per-event free-text location); `''` when an ICS event genuinely has no LOCATION prop.
   */
  location?: string;
  /** Bevy: `event_type_title` contains "Virtual". */
  isVirtualEventType?: boolean;
  /** Bevy: `chapter.relative_url === '/new-york/'`. */
  isNycChapter?: boolean;
  /** The event's source-level area pin, if any. */
  areaPin?: 'nyc' | 'online';
}

const ONLINE_KEYWORD_RE = /\b(online|virtual|webinar|livestream)\b/i;
const NYC_RE = /New York|, NY\b|Brooklyn|Manhattan|Queens|NYC/i;
const HTTP_URL_RE = /^https?:\/\//i;

/** True for a `LOCATION`-shaped string that is actually a URL (Luma's online-event convention). */
export function isHttpUrl(value: string): boolean {
  return HTTP_URL_RE.test(value.trim());
}

/** SUMMARY and LOCATION concatenated, for a single keyword/place-name sniff over both. */
function combinedText(signals: AreaSignals): string {
  return `${signals.summary} ${signals.location ?? ''}`;
}

function isExplicitOnline(signals: AreaSignals): boolean {
  return Boolean(signals.isVirtualEventType) || ONLINE_KEYWORD_RE.test(combinedText(signals));
}

function isNycLocationOrSummary(signals: AreaSignals): boolean {
  return Boolean(signals.isNycChapter) || NYC_RE.test(combinedText(signals));
}

function hasEmptyOrUrlLocation(signals: AreaSignals): boolean {
  if (signals.location === undefined) return false;
  const trimmedLocation = signals.location.trim();
  return trimmedLocation.length === 0 || isHttpUrl(trimmedLocation);
}

/**
 * `'nyc' | 'online' | 'other'`, first match wins (2026-09-26 precedence, decided by the tech
 * lead -- see the repo-root CLAUDE.md "Events" section):
 *   a. a source-level area pin always wins, unconditionally
 *   b. an explicit online signal: Bevy `event_type_title` contains "Virtual", or SUMMARY/LOCATION
 *      matches an online/virtual/webinar/livestream keyword
 *   c. New York signalled in LOCATION or SUMMARY, or a Bevy `/new-york/` chapter
 *   d. a LOCATION that's empty or itself a URL (Luma's online-event convention; a fallback,
 *      since an explicit NYC signal in (c) must win first -- e.g. an online Luma link whose
 *      title names New York City)
 *   e. otherwise 'other'
 */
export function classifyArea(signals: AreaSignals): EventArea {
  if (signals.areaPin) return signals.areaPin;
  if (isExplicitOnline(signals)) return 'online';
  if (isNycLocationOrSummary(signals)) return 'nyc';
  if (hasEmptyOrUrlLocation(signals)) return 'online';
  return 'other';
}

// How long after it ends an event still counts as "upcoming" (covers clock skew / an event
// still visibly running), and how far into the future the feed looks.
const UPCOMING_GRACE_MS = 60 * 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const UPCOMING_HORIZON_DAYS = 90;
export const UPCOMING_HORIZON_MS = UPCOMING_HORIZON_DAYS * MS_PER_DAY;

export function isUpcoming(event: Pick<TechEvent, 'start' | 'end'>, nowMs: number): boolean {
  const startMs = Date.parse(event.start);
  const endMs = event.end ? Date.parse(event.end) : startMs;
  return endMs >= nowMs - UPCOMING_GRACE_MS && startMs <= nowMs + UPCOMING_HORIZON_MS;
}

const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

/** Deterministic 32-bit FNV-1a hash, as an 8-hex-digit string. Used only when a feed has no UID. */
export function fnv1a(input: string): string {
  let hash = FNV_OFFSET_BASIS;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

/** The one place `TechEvent.id` is built, so every adapter dedupes the same way. */
export function buildEventId(
  sourceId: string,
  uid: string | undefined,
  title: string,
  startIso: string,
): string {
  const suffix = uid ?? fnv1a(`${title}${startIso}`);
  return `${sourceId}:${suffix}`;
}

export function sortEvents(events: readonly TechEvent[]): TechEvent[] {
  return [...events].sort((a, b) => {
    if (a.start !== b.start) return a.start < b.start ? -1 : 1;
    if (a.title === b.title) return 0;
    return a.title < b.title ? -1 : 1;
  });
}

export function dedupeEvents(events: readonly TechEvent[]): TechEvent[] {
  const seen = new Map<string, TechEvent>();
  for (const event of events) {
    if (!seen.has(event.id)) {
      seen.set(event.id, event);
    }
  }
  return [...seen.values()];
}
