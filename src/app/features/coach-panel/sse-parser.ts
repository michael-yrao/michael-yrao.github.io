import type { CoachErrorCode, CoachEvent, CoachStopReason } from '../../core/models/coach.model';

const FRAME_SEPARATOR = /\r\n\r\n|\n\n/;
const LINE_BREAK = /\r\n|\n|\r/;
const FIELD_SEPARATOR = ':';
const STOP_REASONS: readonly string[] = ['done', 'interrupted', 'max-turns', 'error'];
// A Record keyed by CoachErrorCode makes the compiler reject a code added to the contract but missed here.
const ERROR_CODE_SET: Readonly<Record<CoachErrorCode, true>> = {
  busy: true,
  'clone-failed': true,
  'pull-conflict': true,
  'sdk-error': true,
  'bad-request': true,
  unauthorized: true,
  'not-owner': true,
  'rate-limited': true,
  'container-unavailable': true,
};
const ERROR_CODES: readonly string[] = Object.keys(ERROR_CODE_SET);

type Fields = Readonly<Record<string, unknown>>;

const isString = (v: unknown): v is string => typeof v === 'string';
const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean';
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
const isStringOrNull = (v: unknown): v is string | null => v === null || isString(v);

const BUILDERS: Readonly<Record<string, (f: Fields) => CoachEvent | null>> = {
  session: (f) =>
    isStringOrNull(f['sessionId']) && isBoolean(f['resumed']) && isString(f['repoHead'])
      ? { type: 'session', sessionId: f['sessionId'], resumed: f['resumed'], repoHead: f['repoHead'] }
      : null,
  text: (f) => (isString(f['delta']) ? { type: 'text', delta: f['delta'] } : null),
  tool_start: (f) =>
    isString(f['id']) && isString(f['label']) ? { type: 'tool_start', id: f['id'], label: f['label'] } : null,
  tool_end: (f) => (isString(f['id']) && isBoolean(f['ok']) ? { type: 'tool_end', id: f['id'], ok: f['ok'] } : null),
  turn_end: (f) =>
    isString(f['sessionId']) &&
    isNumber(f['turnCostUsd']) &&
    isNumber(f['sessionCostUsd']) &&
    isString(f['repoHead']) &&
    isBoolean(f['repoChanged']) &&
    isBoolean(f['dirty']) &&
    isString(f['stopReason']) &&
    STOP_REASONS.includes(f['stopReason'])
      ? {
          type: 'turn_end',
          sessionId: f['sessionId'],
          turnCostUsd: f['turnCostUsd'],
          sessionCostUsd: f['sessionCostUsd'],
          repoHead: f['repoHead'],
          repoChanged: f['repoChanged'],
          dirty: f['dirty'],
          stopReason: f['stopReason'] as CoachStopReason,
        }
      : null,
  error: (f) =>
    isString(f['code']) && ERROR_CODES.includes(f['code'])
      ? { type: 'error', code: f['code'] as CoachErrorCode }
      : null,
};

/** One frame's `event:` name and JSON `data:` text to a validated event; null for anything unknown or malformed. */
export function parseCoachEvent(eventName: string, data: string): CoachEvent | null {
  const build = Object.hasOwn(BUILDERS, eventName) ? BUILDERS[eventName] : undefined;
  if (build === undefined) return null;
  let payload: unknown;
  try {
    payload = JSON.parse(data);
  } catch {
    return null;
  }
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return null;
  return build(payload as Fields);
}

function parseFrame(frame: string): CoachEvent | null {
  let eventName = '';
  const dataLines: string[] = [];
  for (const line of frame.split(LINE_BREAK)) {
    if (line === '' || line.startsWith(FIELD_SEPARATOR)) continue; // blank or a `: ping` comment
    const colon = line.indexOf(FIELD_SEPARATOR);
    const field = colon === -1 ? line : line.slice(0, colon);
    const value = colon === -1 ? '' : line.slice(colon + 1).replace(/^ /, '');
    if (field === 'event') eventName = value;
    else if (field === 'data') dataLines.push(value);
  }
  return dataLines.length === 0 ? null : parseCoachEvent(eventName, dataLines.join('\n'));
}

export interface SseParser {
  /** Feed one decoded chunk; returns the events its completed frames carry. */
  push(chunk: string): readonly CoachEvent[];
}

/** Incremental SSE reader: keeps only the unconsumed tail between chunks. */
export function createSseParser(): SseParser {
  let tail = '';
  return {
    push(chunk) {
      const events: CoachEvent[] = [];
      let rest = tail + chunk;
      for (;;) {
        const match = FRAME_SEPARATOR.exec(rest);
        if (match === null) break;
        const event = parseFrame(rest.slice(0, match.index));
        if (event !== null) events.push(event);
        rest = rest.slice(match.index + match[0].length);
      }
      tail = rest;
      return events;
    },
  };
}
