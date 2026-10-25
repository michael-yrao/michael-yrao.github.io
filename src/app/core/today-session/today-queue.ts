import type { ScheduleDay, ScheduleItem } from '../models/progress.model';

/** The run-through kept across a page leave: which day, the frozen order, and where the learner is in it. */
export interface TodaySession {
  readonly date: string;
  readonly order: readonly number[];
  readonly index: number;
  /** Problems finished in this run-through, a subset of `order`. */
  readonly completed: readonly number[];
}

const QUEUED_KINDS: ReadonlySet<string> = new Set(['rep', 'new', 'probe']);
const DEFAULT_KIND = 'rep';

function isQueued(item: ScheduleItem, practiceNumbers: ReadonlySet<number>): item is ScheduleItem & { lcNumber: number } {
  if (item.lcNumber == null || item.deferredTo) return false;
  if (!QUEUED_KINDS.has(item.kind ?? DEFAULT_KIND)) return false;
  return practiceNumbers.has(item.lcNumber);
}

/** The day's runnable problems in schedule order, first occurrence only. A done item stays in. */
export function buildQueue(day: ScheduleDay | undefined, practiceNumbers: ReadonlySet<number>): number[] {
  if (!day) return [];
  const numbers = day.items.filter((item) => isQueued(item, practiceNumbers)).map((item) => item.lcNumber as number);
  return Array.from(new Set(numbers));
}

/** First undone number at or after `fromIndex`, else the first undone before it, else null. */
export function nextUndone(order: readonly number[], isDone: (n: number) => boolean, fromIndex: number): number | null {
  const after = order.slice(fromIndex).find((n) => !isDone(n));
  if (after !== undefined) return after;
  const before = order.slice(0, fromIndex).find((n) => !isDone(n));
  return before ?? null;
}

function isTodaySessionShape(value: unknown): value is { date: string; order: number[]; index: number; completed: number[] } {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const { date, order, index, completed } = value as Record<string, unknown>;
  if (typeof date !== 'string' || !Array.isArray(order) || !order.every(Number.isInteger)) return false;
  if (!Array.isArray(completed) || !completed.every((n) => order.includes(n))) return false;
  return Number.isInteger(index) && (index as number) >= 0 && (index as number) < order.length;
}

/** Parses a stored session; null for no value, another day's session, or a malformed one. */
export function readSession(raw: string | null, today: string): TodaySession | null {
  if (raw === null) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    console.error('today-session: stored session is not valid JSON', error);
    return null;
  }
  if (!isTodaySessionShape(parsed) || parsed.date !== today) return null;
  return { date: parsed.date, order: [...parsed.order], index: parsed.index, completed: [...parsed.completed] };
}
