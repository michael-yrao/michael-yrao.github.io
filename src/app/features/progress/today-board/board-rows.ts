// Pure derivation for the today board: day items -> rows, per-row/day counts, the workload bar, row keys and aria labels.
import {
  ProblemProgress,
  Schedule,
  ScheduleDay,
  ScheduleItem,
  WorkloadDay,
} from '../../../core/models/progress.model';
import { addDaysISO, shortMonthDay, weekdayShort } from '../../../core/utils/local-date';
import { WorkloadBand, workloadBand } from '../../../core/utils/workload-band';

export interface WorkloadBar {
  /** Planned units (`workload[].planned`, else `day.units`). */
  units: number;
  ceiling: number;
  pct: number;
  band: WorkloadBand;
  /** The day's DONE units (from the `workload` input's matching `WorkloadDay`) — null when
   *  there's no entry for the day, or its `done` is 0: both render as "no done fill" (round 7,
   *  §Text f/g). */
  done: number | null;
  /** `done / ceiling` as a percent, clamped like `pct` — the solid fill drawn inside the
   *  planned fill. null exactly when `done` is null. */
  donePct: number | null;
}

export interface RowCounts {
  readonly done: number;
  readonly total: number;
  readonly moved: number;
}

export const COMPLEXITY_GATE_TITLE = 'Complexity gate';
const MOVED_GLYPH = '↷';
// A literal `</>` can't be written inline in the template's interpolation (`{{ '</>' }}`) — the
// `</` reads to the HTML parser as a closing tag before Angular's interpolation is tokenized —
// so the walkthrough badge's own glyph lives here instead and the template references it.
export const WALKTHROUGH_GLYPH = '</>';
const RE_ASK_SUFFIX = 're-asks';
const MAX_PCT = 100;
// Monday-first, matching gamify.py's `day_date.strftime('%A')` — used only to label a
// synthetic empty week's 7 days (see `emptyWeek` below), so no `Date` construction (and no
// timezone risk) is needed to name them.
const WEEKDAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'] as const;

/** A run of consecutive `kind === 'complexity'` items collapsed into one board row (the
 *  Sunday complexity re-ask block) — a purely local, derived shape, never part of the
 *  `ScheduleItem`/`Schedule` contract itself. `done` is true only once every member item is
 *  done; `subtitle` is numbers-only ("3 re-asks · 226 · 211 · 778") — the re-ask answers
 *  live off the board by design, so the gate row carries no links. */
export interface ComplexityGateRow {
  readonly isGate: true;
  readonly items: readonly ScheduleItem[];
  readonly done: boolean;
  readonly subtitle: string;
  readonly doneCount: number;
  readonly totalCount: number;
}

/** One rendered board row: either a plain schedule item, or a collapsed complexity gate. */
export type BoardRow = ScheduleItem | ComplexityGateRow;

export function isGateRow(row: BoardRow): row is ComplexityGateRow {
  return (row as ComplexityGateRow).isGate === true;
}

/** A row is "moved" when it wasn't done on its planned day and carries a `deferredTo` date —
 *  the row that stays on its own day, unstruck, when the actual rep landed elsewhere (see
 *  schedule-item-deferred-to-sep29). The `moved` TAG alone never triggers this: only the
 *  `deferredTo` field does (a gate row's own `ScheduleItem`s could still carry a `moved` tag
 *  from an unrelated round with no marker of its own). */
export function isMovedItem(item: ScheduleItem): boolean {
  return !item.done && !!item.deferredTo;
}

/** `isMovedItem` lifted to a `BoardRow` — a gate row is never moved (`deferredTo` only ever
 *  lives on a plain `ScheduleItem`), so this is what the per-day/week moved counts use. */
function isMovedRow(row: BoardRow): boolean {
  return !isGateRow(row) && isMovedItem(row);
}

function toGateRow(items: readonly ScheduleItem[]): ComplexityGateRow {
  const numbers = items
    .map((i) => i.lcNumber)
    .filter((n): n is number => n != null)
    .join(' · ');
  const doneCount = items.filter((i) => i.done).length;
  return {
    isGate: true,
    items,
    done: doneCount === items.length,
    subtitle: `${items.length} ${RE_ASK_SUFFIX} · ${numbers}`,
    doneCount,
    totalCount: items.length,
  };
}

/** A synthetic empty week — 7 real dates and weekday names in the same shape gamify.py emits,
 *  `items: []`, `units: null` throughout. Used whenever the displayed week (current, or a
 *  history gap once history has finished loading) has no real entry, so the strip and the
 *  existing "Nothing scheduled." rendering need no special-casing for it. Pure. */
export function emptyWeek(weekOf: string): Schedule {
  const days: ScheduleDay[] = WEEKDAY_NAMES.map((weekday, i) => ({
    date: addDaysISO(weekOf, i),
    weekday,
    label: null,
    units: null,
    items: [],
  }));
  return { weekOf, days };
}

interface GroupAcc {
  readonly rows: readonly BoardRow[];
  readonly pending: readonly ScheduleItem[];
}

const EMPTY_GROUP_ACC: GroupAcc = { rows: [], pending: [] };

/** Flushes any pending run of complexity items into the accumulated rows: a lone pending
 *  item stays a plain row (only a run of 2+ collapses into a gate). Always returns a NEW
 *  accumulator — never mutates the one it was given. */
function flushPending(acc: GroupAcc): GroupAcc {
  if (acc.pending.length === 0) return acc;
  const row: BoardRow = acc.pending.length === 1 ? acc.pending[0] : toGateRow(acc.pending);
  return { rows: [...acc.rows, row], pending: [] };
}

/** Groups a day's items into board rows, collapsing consecutive `kind === 'complexity'`
 *  items into one gate row. Pure — every step returns a new accumulator, never mutates
 *  `items` or a prior accumulator. */
export function groupComplexityItems(items: readonly ScheduleItem[]): BoardRow[] {
  const grouped = items.reduce<GroupAcc>((acc, item) => {
    if (item.kind === 'complexity') {
      return { rows: acc.rows, pending: [...acc.pending, item] };
    }
    const flushed = flushPending(acc);
    return { rows: [...flushed.rows, item], pending: [] };
  }, EMPTY_GROUP_ACC);
  return [...flushPending(grouped).rows];
}

/** Done/total/moved over a set of board rows — a gate row counts as ONE item toward each
 *  (`done` is defined identically on ScheduleItem and ComplexityGateRow; a gate is never moved). */
export function countRows(rows: readonly BoardRow[]): RowCounts {
  return {
    done: rows.filter((r) => r.done).length,
    total: rows.length,
    moved: rows.filter((r) => isMovedRow(r)).length,
  };
}

/** Week counts: the sum of `countRows` over every day's grouped rows. */
export function sumRowCounts(rowLists: Iterable<readonly BoardRow[]>): RowCounts {
  return [...rowLists].reduce<RowCounts>(
    (acc, rows) => {
      const counts = countRows(rows);
      return {
        done: acc.done + counts.done,
        total: acc.total + counts.total,
        moved: acc.moved + counts.moved,
      };
    },
    { done: 0, total: 0, moved: 0 },
  );
}

/** The selected day's workload bar — null when there's no day, or the day carries no units, or
 *  the ceiling is unknown/non-positive ("empty/no-board day -> no bar", round 2 item 3). A done
 *  fill only draws when the matching `workload` entry has done units (round 7, §Text f/g). */
export function buildWorkloadBar(
  day: ScheduleDay | null,
  ceiling: number | undefined,
  floor: number | undefined,
  workload: readonly WorkloadDay[] | undefined,
): WorkloadBar | null {
  if (!day || ceiling == null || ceiling <= 0) return null;
  const entry = workload?.find((w) => w.date === day.date);
  const units = entry?.planned ?? day.units;
  if (units == null) return null;
  const pct = Math.min(MAX_PCT, (units / ceiling) * MAX_PCT);
  const band = workloadBand(units, ceiling, floor);
  const doneUnits = entry?.done ?? 0;
  const done = doneUnits > 0 ? doneUnits : null;
  const donePct = done != null ? Math.min(MAX_PCT, (done / ceiling) * MAX_PCT) : null;
  return { units, ceiling, pct, band, done, donePct };
}

// Qualitative on purpose: the interval lengths and the graduation threshold are config values
// in the adopter's cse-progress repo (cse.config.yml), and this site renders any cse-coach
// repo — so the wording never states a day count or "one more graduates it". The only
// consumer is the today board, so the const stays local rather than living in a shared util.
const PROVISIONAL_CLEAN_MEANING = `provisional clean — first clean straight after a blank; a short lock-down check before it's trusted`;

const END_NOTE_MEANINGS: Readonly<Record<string, string>> = {
  prov: PROVISIONAL_CLEAN_MEANING,
  s0: PROVISIONAL_CLEAN_MEANING,
  s1: `clean streak 1 — one clean in a row; the next review moves further out`,
  s2: `clean streak 2 — two cleans in a row; further out again`,
  dropped: `dropped from the tracker after this rep`,
};

/** The plain-language meaning of an `endNote` code (`s0`, `s1`, `s2`, `prov`, `dropped`, …),
 *  or null when the note isn't one of the known codes — an unknown/future note is then shown
 *  raw, with no explanation. Pure. `endNote` is server-supplied external input ("anything else
 *  the E cell carried"), so this checks the map's OWN keys rather than indexing it directly:
 *  a plain object also answers to inherited property names like `toString` or `constructor`,
 *  which `?? null` would not catch since they aren't nullish. */
export function endNoteMeaning(note: string): string | null {
  return Object.hasOwn(END_NOTE_MEANINGS, note) ? END_NOTE_MEANINGS[note] : null;
}

/** trackBy for board rows: a gate row has no lcNumber of its own, so it tracks by its
 *  first member's number instead. */
export function rowKey(row: BoardRow): string {
  return isGateRow(row) ? `gate-${row.items[0]?.lcNumber ?? 'x'}` : `${row.lcNumber}-${row.title}`;
}

/** A per-(day, row) key — shared by the outcome popover's open state AND the trend panel's
 *  open state (each keeps its own signal, so opening one never closes the other) — and by the
 *  outcome bubble's id. `rowKey()` alone collides when the same problem is done on two
 *  different days (expanded week view), so the day's own date is folded in too. Whitespace
 *  (`rowKey()` embeds the item's title) is collapsed to a hyphen — required for a valid
 *  element id, and so `aria-describedby`'s id list doesn't split on it. */
export function outcomeKey(item: ScheduleItem, date: string): string {
  return `${date}-${rowKey(item)}`.replace(/\s+/g, '-');
}

export function outcomeBubbleId(item: ScheduleItem, date: string): string {
  return `outcome-${outcomeKey(item, date)}`;
}

export function trendPanelId(item: ScheduleItem, date: string): string {
  return `trend-${outcomeKey(item, date)}`;
}

/** The history button's aria-label — the `title` attribute is the visible tooltip, this
 *  carries the row's number for screen readers, same split as `statusAriaLabel`. */
export function trendAriaLabel(item: ScheduleItem): string {
  return `Comfort history for #${item.lcNumber}`;
}

/** The outcome button's aria-label — "earned 🟢" plus the raw note code when present (e.g.
 *  "earned 🟢 s2"). Deliberately short: the bubble this button describes (wired via
 *  `aria-describedby`) already carries the note's meaning and the next-review date, so a
 *  screen reader announces the label, then the description, each exactly once. Only ever
 *  called once `item.endComfort` is already known truthy (the template's own `@if`). */
export function outcomeAriaLabel(item: ScheduleItem): string {
  const noteText = item.endNote ? ` ${item.endNote}` : '';
  return `earned ${item.endComfort}${noteText}`;
}

/** Selector-strip button label — weekday abbreviation + day-of-month pulled straight out of
 *  the ISO date (no date-parsing library needed for a fixed YYYY-MM-DD shape). */
export function dayButtonLabel(day: ScheduleDay): string {
  const dayOfMonth = day.date.slice(8, 10);
  const weekdayAbbrev = day.weekday.slice(0, 3);
  return `${weekdayAbbrev} ${dayOfMonth}`;
}

/** The status badge's aria-label for a moved row, and the plain (non-link) badge's aria-label
 *  once moved — "Moved to Thu Oct 1" (weekday, month, day of `deferredTo`). Only ever called
 *  once `isMovedItem(item)` is already known true, so `deferredTo` is non-null; the `''`
 *  fallback is defensive, never expected to render. */
export function movedAriaLabel(item: ScheduleItem): string {
  if (!item.deferredTo) return '';
  return `Moved to ${weekdayShort(item.deferredTo)} ${shortMonthDay(item.deferredTo)}`;
}

/** The status badge's aria-label when it's the walkthrough link: "Solution walkthrough for
 *  #N, done|not done". A moved row's badge carries no walkthrough/done meaning, so
 *  `movedAriaLabel` takes over instead. */
export function statusAriaLabel(item: ScheduleItem): string {
  if (isMovedItem(item)) return movedAriaLabel(item);
  return `Solution walkthrough for #${item.lcNumber}, ${item.done ? 'done' : 'not done'}`;
}

/** The status badge's aria-label when it's the GitHub solution-file link — mirrors
 *  `statusAriaLabel`, done-ness (or moved-ness) in place of the walkthrough's. */
export function githubAriaLabel(item: ScheduleItem): string {
  if (isMovedItem(item)) return movedAriaLabel(item);
  return `Solution source for #${item.lcNumber} on GitHub, ${item.done ? 'done' : 'not done'}`;
}

/** The status badge's glyph — `↷` for a moved row (in place of whatever `fallback` this badge
 *  form would otherwise show: `</>`, `✓`/`○`), unchanged otherwise. */
export function statusGlyph(item: ScheduleItem, fallback: string): string {
  return isMovedItem(item) ? MOVED_GLYPH : fallback;
}

/** Pure lookup in `details` by lcNumber for the trend panel: null when details aren't loaded
 *  yet OR nothing matched. A number can carry several method variants, so among matches the
 *  one whose title equals the row's own wins; otherwise the first. */
export function findProblemFor(
  item: ScheduleItem,
  details: readonly ProblemProgress[] | null,
): ProblemProgress | null {
  if (!details || item.lcNumber == null) return null;
  const matches = details.filter((p) => p.lcNumber === item.lcNumber);
  if (!matches.length) return null;
  return matches.find((p) => p.title === item.title) ?? matches[0];
}
