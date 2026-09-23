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
