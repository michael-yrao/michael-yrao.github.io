// Converts a wall-clock date/time in a named IANA zone to a UTC instant, using only
// `Intl.DateTimeFormat` (whose data ships with the JS engine) -- no bundled tz database.

export interface WallClockParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

// DST transitions can shift a zone's offset out from under a first guess; recomputing the
// offset at the refined instant (instead of the naive one) fixes that in one extra pass.
const OFFSET_REFINEMENT_PASSES = 2;

/** The zone's offset (local minus UTC, in ms) at the given UTC instant. */
function offsetMsAt(utcMs: number, tzid: string): number {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tzid,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const parts: Record<string, string> = {};
  for (const part of formatter.formatToParts(new Date(utcMs))) {
    parts[part.type] = part.value;
  }
  const localAsUtcMs = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return localAsUtcMs - utcMs;
}

/**
 * Converts wall-clock `parts` as observed in `tzid` to a UTC epoch ms instant. An unknown
 * (unrecognized by `Intl`) TZID falls back to treating the wall clock as UTC -- the caller
 * keeps the original `tzid` string as a label even though the instant may be a few hours off.
 */
export function zonedWallClockToUTC(parts: WallClockParts, tzid: string): number {
  const wallAsUtcMs = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  let estimateMs = wallAsUtcMs;
  try {
    for (let pass = 0; pass < OFFSET_REFINEMENT_PASSES; pass += 1) {
      const offsetMs = offsetMsAt(estimateMs, tzid);
      estimateMs = wallAsUtcMs - offsetMs;
    }
    return estimateMs;
  } catch {
    return wallAsUtcMs;
  }
}
