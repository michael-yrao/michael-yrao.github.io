import type { EventSource, TechEvent } from '../contract';
import { buildEventId, classifyArea } from '../normalize';

/** Only the source field this adapter needs. */
type SourceRef = Pick<EventSource, 'id'>;

interface BevyChapter {
  relative_url?: string;
  timezone?: string;
  chapter_location?: string;
}

interface BevyResult {
  id?: number | string;
  title?: string;
  start_date?: string;
  url?: string;
  event_type_title?: string;
  chapter?: BevyChapter;
}

interface BevyResponse {
  results?: unknown;
}

const NYC_CHAPTER_RELATIVE_URL = '/new-york/';
const VIRTUAL_EVENT_TYPE_RE = /virtual/i;

function toTechEvent(result: BevyResult, source: SourceRef): TechEvent | null {
  if (!result.title || !result.start_date || !result.url) return null;

  const startMs = Date.parse(result.start_date);
  if (Number.isNaN(startMs)) return null;
  const start = new Date(startMs).toISOString();

  const chapter = result.chapter ?? {};
  const area = classifyArea({
    summary: result.title,
    isVirtualEventType: VIRTUAL_EVENT_TYPE_RE.test(result.event_type_title ?? ''),
    isNycChapter: chapter.relative_url === NYC_CHAPTER_RELATIVE_URL,
  });

  const uid = result.id === undefined ? undefined : String(result.id);

  return {
    id: buildEventId(source.id, uid, result.title, start),
    title: result.title,
    start,
    timezone: chapter.timezone,
    location: chapter.chapter_location,
    area,
    url: result.url,
    sourceId: source.id,
  };
}

/** Pure: raw Bevy `upcoming_event` search-response body -> normalized `TechEvent[]`. The
 * endpoint returns every chapter worldwide; filtering to an area happens via `classifyArea`,
 * not here. `nowMs` is accepted for interface symmetry with the iCal adapter. */
export function adaptBevyEvents(body: string, source: SourceRef, _nowMs: number): TechEvent[] {
  let parsed: BevyResponse;
  try {
    parsed = JSON.parse(body) as BevyResponse;
  } catch {
    throw new Error(`Source "${source.id}" did not return valid JSON`);
  }
  if (!Array.isArray(parsed.results)) {
    throw new Error(`Source "${source.id}" JSON body had no "results" array`);
  }
  return (parsed.results as BevyResult[])
    .map((result) => toTechEvent(result, source))
    .filter((event): event is TechEvent => event !== null);
}
