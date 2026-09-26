/** Today's date as `YYYY-MM-DD` in the VIEWER's local timezone — deliberately NOT
 *  `toISOString()`, which is UTC and can be off by a day depending on the viewer's
 *  timezone and time of day. Used everywhere a component compares against a server-emitted
 *  ISO date (nextReview, schedule day dates, study-day dates): the server never bakes in
 *  "today" for exactly this reason — a summary can be viewed days after it was generated,
 *  and only the viewer's own clock can say what "today" means to them right now. */
export function todayLocalISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const ISO_DATE_SHAPE = /^\d{4}-\d{2}-\d{2}$/;

// Fixed offsets into a `YYYY-MM-DD` string — named so the slice calls below read as "month"
// and "day" rather than a pair of bare numbers.
const MONTH_SLICE_START = 5;
const MONTH_SLICE_END = 7;
const DAY_SLICE_START = 8;
const DAY_SLICE_END = 10;

const MONTH_ABBREVIATIONS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/** Short "Mon D" rendering of a fixed `YYYY-MM-DD` date, e.g. `'2026-10-21'` -> `'Oct 21'`,
 *  `'2026-01-05'` -> `'Jan 5'`. Slice-based like `todayLocalISO()` above — no `Date`
 *  construction, so no timezone shift risk. Returns the input unchanged when it doesn't match
 *  the `YYYY-MM-DD` shape (fail-visible, not silent). */
export function shortMonthDay(iso: string): string {
  if (!ISO_DATE_SHAPE.test(iso)) return iso;
  const month = MONTH_ABBREVIATIONS[Number(iso.slice(MONTH_SLICE_START, MONTH_SLICE_END)) - 1];
  if (!month) return iso;
  const day = Number(iso.slice(DAY_SLICE_START, DAY_SLICE_END));
  return `${month} ${day}`;
}

const YEAR_SLICE_START = 0;
const YEAR_SLICE_END = 4;
const DAYS_PER_WEEK = 7;
// `Date.UTC(...).getUTCDay()` is 0=Sun..6=Sat; shifting Sunday to the END of the week (6)
// turns it into a Monday-start ordinal (Mon=0 ... Sun=6), which is how far back to walk to
// reach that week's Monday.
const SUNDAY_UTC_DAY = 0;
const MONDAY_START_OFFSET = DAYS_PER_WEEK - 1;

/** `YYYY-MM-DD` -> the UTC millis midnight of that date, via `Date.UTC` (never `new
 *  Date(iso)`, which parses as UTC for a bare date but would invite drift if this ever grew
 *  a time component) — the shared building block for `weekStartISO`/`addDaysISO` below. */
function toUTCMillis(iso: string): number {
  const year = Number(iso.slice(YEAR_SLICE_START, YEAR_SLICE_END));
  const month = Number(iso.slice(MONTH_SLICE_START, MONTH_SLICE_END));
  const day = Number(iso.slice(DAY_SLICE_START, DAY_SLICE_END));
  return Date.UTC(year, month - 1, day);
}

/** The UTC millis -> `YYYY-MM-DD`, the inverse of `toUTCMillis`. */
function fromUTCMillis(millis: number): string {
  const d = new Date(millis);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** `iso` shifted by `n` days (negative walks backward) — `Date.UTC` handles month/year
 *  rollover, so no manual day-count arithmetic is needed. */
export function addDaysISO(iso: string, n: number): string {
  return fromUTCMillis(toUTCMillis(iso) + n * MS_PER_DAY);
}

/** The Monday of the ISO week `iso` falls in (Monday-start, unlike `Date`'s native
 *  Sunday-start week) — computed from `Date.UTC` parts, so there's no viewer-timezone drift
 *  the way a local `Date` constructor would introduce. Used to group daily workload entries
 *  into weekly bars. */
export function weekStartISO(iso: string): string {
  const utcDay = new Date(toUTCMillis(iso)).getUTCDay();
  const daysSinceMonday = utcDay === SUNDAY_UTC_DAY ? MONDAY_START_OFFSET : utcDay - 1;
  return addDaysISO(iso, -daysSinceMonday);
}
