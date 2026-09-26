import { adaptBevyEvents } from './adapters/bevy';
import { adaptIcalEvents } from './adapters/ical';
import type { EventSource, EventsFeed, TechEvent } from './contract';
import { EVENTS_SCHEMA_VERSION } from './contract';
import { dedupeEvents, isUpcoming, sortEvents, UPCOMING_HORIZON_DAYS } from './normalize';
import type { FeedSourceConfig } from './sources';

/** How long a single upstream fetch is given before it's treated as failed. */
export const FETCH_TIMEOUT_MS = 8000;
/** Cloudflare's edge cache TTL for upstream feed fetches (`cf.cacheTtl`), in seconds. */
export const UPSTREAM_CACHE_TTL_SECONDS = 600;

const USER_AGENT = 'progressiveoverflow-events-worker/1 (+https://progressiveoverflow.com)';

/** Minimal shape this module needs from `fetch`, so tests can inject a fake without a network. */
export type FetchImpl = (input: string, init?: RequestInit) => Promise<Response>;

function describeError(reason: unknown): string {
  if (reason instanceof DOMException && reason.name === 'TimeoutError') {
    return 'Request timed out';
  }
  if (reason instanceof Error) return reason.message;
  return 'Unknown error';
}

function parseBody(body: string, source: FeedSourceConfig, nowMs: number): TechEvent[] {
  return source.kind === 'ical'
    ? adaptIcalEvents(body, source, nowMs)
    : adaptBevyEvents(body, source, nowMs);
}

/** One source's fetch outcome, paired with the source it came from (so a later step can build
 * each public source without re-indexing back into the original `sources` array). */
type SourceOutcome =
  | { source: FeedSourceConfig; ok: true; events: readonly TechEvent[] }
  | { source: FeedSourceConfig; ok: false; error: string };

function toSourceOutcome(
  source: FeedSourceConfig,
  outcome: PromiseSettledResult<TechEvent[]>,
): SourceOutcome {
  return outcome.status === 'fulfilled'
    ? { source, ok: true, events: outcome.value }
    : { source, ok: false, error: describeError(outcome.reason) };
}

/** How many of the *final* served `events[]` (post upcoming-filter, post-dedupe) belong to
 * each source, keyed by `sourceId`. A source's raw adapter output can be larger than this
 * (past events, events beyond the horizon) -- `EventSource.count` must reflect what the
 * client can actually see, since the Angular page uses `count > 0` to decide which chips to
 * show. */
function countEventsBySource(events: readonly TechEvent[]): Readonly<Record<string, number>> {
  return events.reduce<Record<string, number>>(
    (counts, event) => ({ ...counts, [event.sourceId]: (counts[event.sourceId] ?? 0) + 1 }),
    {},
  );
}

/** The source as served to the client: the internal fetch `url` dropped, `ok`/`count`/`error`
 * filled in from how the fetch went. */
function toPublicSource(
  source: FeedSourceConfig,
  outcome: { ok: true; count: number } | { ok: false; error: string },
): EventSource {
  const { url: _url, ...publicFields } = source;
  return outcome.ok
    ? { ...publicFields, ok: true, count: outcome.count }
    : { ...publicFields, ok: false, error: outcome.error };
}

async function fetchOneSource(
  source: FeedSourceConfig,
  fetchImpl: FetchImpl,
  nowMs: number,
): Promise<TechEvent[]> {
  const response = await fetchImpl(source.url, {
    headers: { 'User-Agent': USER_AGENT },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    cf: { cacheTtl: UPSTREAM_CACHE_TTL_SECONDS, cacheEverything: true },
  } as RequestInit);
  if (!response.ok) {
    throw new Error(`Upstream responded ${response.status} ${response.statusText}`.trim());
  }
  const body = await response.text();
  return parseBody(body, source, nowMs);
}

/**
 * Fetches every source concurrently and builds the served feed. A single bad/slow/malformed
 * source never fails the response: its failure is recorded on that source's `ok`/`error` and
 * every other source's events still make it into the payload (`Promise.allSettled`).
 */
export async function buildFeed(
  sources: readonly FeedSourceConfig[],
  fetchImpl: FetchImpl,
  nowMs: number,
): Promise<EventsFeed> {
  const settled = await Promise.allSettled(
    sources.map((source) => fetchOneSource(source, fetchImpl, nowMs)),
  );
  // Promise.allSettled preserves order and length 1:1 with `sources`, so this zip never misses.
  const outcomes = sources.map((source, index) => {
    const outcome = settled[index];
    if (!outcome) throw new Error(`Missing settled result for source "${source.id}"`);
    return toSourceOutcome(source, outcome);
  });

  const rawEvents = outcomes.flatMap((outcome) => (outcome.ok ? outcome.events : []));
  const events = sortEvents(dedupeEvents(rawEvents.filter((event) => isUpcoming(event, nowMs))));
  const countsBySourceId = countEventsBySource(events);

  const resultSources = outcomes.map((outcome) =>
    outcome.ok
      ? toPublicSource(outcome.source, { ok: true, count: countsBySourceId[outcome.source.id] ?? 0 })
      : toPublicSource(outcome.source, { ok: false, error: outcome.error }),
  );

  return {
    schemaVersion: EVENTS_SCHEMA_VERSION,
    generatedAt: new Date(nowMs).toISOString(),
    horizonDays: UPCOMING_HORIZON_DAYS,
    sources: resultSources,
    events,
  };
}
