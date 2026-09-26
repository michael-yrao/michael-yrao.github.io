// Hand-rolled, dependency-free iCal (RFC 5545) parsing: enough to read Meetup and Luma
// feeds, and nothing else. See worker/README.md and the repo-root CLAUDE.md "Events" section
// for why this isn't node-ical (Node-only) or ical.js (needs VTIMEZONE registration we don't
// want) -- both ruled out during planning.

/** One unfolded logical line's NAME[;PARAM=VALUE...]:VALUE, already split apart. */
export interface ContentLine {
  name: string;
  params: Readonly<Record<string, string>>;
  value: string;
}

/** One VEVENT's properties, keyed by uppercased property name (first occurrence wins). */
export type VEventRecord = Readonly<Record<string, ContentLine>>;

/**
 * RFC 5545 line unfolding: a CRLF (or bare LF) followed by exactly one space or tab is a
 * fold, not a line break -- remove the break and that one whitespace character. Meetup
 * feeds fold with CRLF; Luma feeds fold with bare LF; both are handled the same way here.
 */
export function unfoldLines(text: string): string[] {
  const physicalLines = text.replace(/\r\n/g, '\n').split('\n');
  const logicalLines: string[] = [];
  for (const line of physicalLines) {
    const isFoldContinuation =
      logicalLines.length > 0 && (line.startsWith(' ') || line.startsWith('\t'));
    if (isFoldContinuation) {
      const previousIndex = logicalLines.length - 1;
      logicalLines[previousIndex] = `${logicalLines[previousIndex]}${line.slice(1)}`;
    } else {
      logicalLines.push(line);
    }
  }
  return logicalLines;
}

/**
 * Splits one unfolded logical line into its property name, parameters, and raw value. The
 * NAME/PARAMS-vs-VALUE separator is the first colon that is not inside a quoted param value
 * (params can carry a colon inside quotes, e.g. `ORGANIZER;CN="A, B":MAILTO:x@y`).
 */
export function parseContentLine(line: string): ContentLine {
  let inQuotes = false;
  let splitIndex = -1;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ':' && !inQuotes) {
      splitIndex = i;
      break;
    }
  }
  const head = splitIndex === -1 ? line : line.slice(0, splitIndex);
  const value = splitIndex === -1 ? '' : line.slice(splitIndex + 1);
  const [name, ...paramParts] = head.split(';');
  const params: Record<string, string> = {};
  for (const part of paramParts) {
    const eqIndex = part.indexOf('=');
    if (eqIndex === -1) continue;
    const key = part.slice(0, eqIndex);
    const rawValue = part.slice(eqIndex + 1);
    params[key] = rawValue.replace(/^"(.*)"$/, '$1');
  }
  return { name: (name ?? '').toUpperCase(), params, value };
}

const ESCAPE_SEQUENCE_RE = /\\\\|\\[nN]|\\,|\\;/g;

const ESCAPE_REPLACEMENTS: Readonly<Record<string, string>> = {
  '\\\\': '\\',
  '\\,': ',',
  '\\;': ';',
};

/** Reverses RFC 5545 TEXT escaping: `\n`/`\N` -> newline, `\,` -> `,`, `\;` -> `;`, `\\` -> `\`. */
export function unescapeText(value: string): string {
  return value.replace(ESCAPE_SEQUENCE_RE, (match) => {
    if (match === '\\n' || match === '\\N') return '\n';
    return ESCAPE_REPLACEMENTS[match] ?? match;
  });
}

/** A DTSTART/DTEND value, still in its original wall-clock form (not yet converted to UTC). */
export interface ICalDateParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  tzid?: string;
  isUtc: boolean;
  /** VALUE=DATE (all-day, no time-of-day component). */
  isDate: boolean;
}

const DATE_TIME_RE = /^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/;

export function parseICalDate(value: string, tzid?: string): ICalDateParts {
  const match = DATE_TIME_RE.exec(value.trim());
  if (!match) {
    throw new Error(`Unparseable iCal date/time value: "${value}"`);
  }
  const [, year, month, day, hour, minute, second, utcMarker] = match;
  return {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: hour === undefined ? 0 : Number(hour),
    minute: minute === undefined ? 0 : Number(minute),
    second: second === undefined ? 0 : Number(second),
    tzid,
    isUtc: utcMarker === 'Z',
    isDate: hour === undefined,
  };
}

/**
 * Extracts every VEVENT block's properties, ignoring everything outside a VEVENT (VCALENDAR
 * headers, VTIMEZONE and its own RRULE lines) and any component nested inside a VEVENT
 * (e.g. VALARM), so a VTIMEZONE's RRULE can never be mistaken for an event's.
 */
export function parseVEvents(text: string): VEventRecord[] {
  const lines = unfoldLines(text);
  const events: Record<string, ContentLine>[] = [];
  let current: Record<string, ContentLine> | null = null;
  let nestedDepth = 0;

  for (const line of lines) {
    if (line.length === 0) continue;
    const contentLine = parseContentLine(line);

    if (contentLine.name === 'BEGIN' && contentLine.value === 'VEVENT' && current === null) {
      current = {};
      nestedDepth = 0;
      continue;
    }
    if (current === null) continue;

    if (contentLine.name === 'BEGIN') {
      nestedDepth += 1;
      continue;
    }
    if (contentLine.name === 'END' && contentLine.value === 'VEVENT' && nestedDepth === 0) {
      events.push(current);
      current = null;
      continue;
    }
    if (contentLine.name === 'END') {
      nestedDepth = Math.max(0, nestedDepth - 1);
      continue;
    }
    if (nestedDepth === 0 && !(contentLine.name in current)) {
      current[contentLine.name] = contentLine;
    }
  }

  return events;
}
