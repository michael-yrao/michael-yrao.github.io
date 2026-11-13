import { DiaryEntry } from './diary-contract';

const HEADING_MARKER = '## ';
const PARAGRAPH_BREAK = /\n\s*\n/;
const DATE_PART_WIDTH = 2;

const LIST_MARKER = '- ';
const LINE_BREAK = '\n';
// `**bold**` first, then `*italic*`; the text inside must not start or end with a space.
const INLINE_MARKUP = /\*\*(\S(?:[^*]*\S)?)\*\*|\*(\S(?:[^*]*\S)?)\*/g;
const BOLD_GROUP = 1;
const ITALIC_GROUP = 2;

/** A run of text with one style; always rendered as a text node. */
export interface DiarySpan { text: string; isBold: boolean; isItalic: boolean }

export type DiaryBlock =
  | { kind: 'heading' | 'paragraph'; spans: DiarySpan[] }
  | { kind: 'list'; items: DiarySpan[][] };

/** The spans of one line of text; a `*` or `**` with no closing partner stays literal. */
function spansOf(text: string): DiarySpan[] {
  const spans: DiarySpan[] = [];
  let cursor = 0;
  for (const match of text.matchAll(INLINE_MARKUP)) {
    if (match.index > cursor) spans.push({ text: text.slice(cursor, match.index), isBold: false, isItalic: false });
    const isBold = match[BOLD_GROUP] !== undefined;
    spans.push({ text: match[isBold ? BOLD_GROUP : ITALIC_GROUP], isBold, isItalic: !isBold });
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) spans.push({ text: text.slice(cursor), isBold: false, isItalic: false });
  return spans;
}

function blockOf(paragraph: string): DiaryBlock {
  if (paragraph.startsWith(HEADING_MARKER)) {
    return { kind: 'heading', spans: spansOf(paragraph.slice(HEADING_MARKER.length).trim()) };
  }
  const lines = paragraph.split(LINE_BREAK).map((line) => line.trim());
  if (lines.every((line) => line.startsWith(LIST_MARKER))) {
    return { kind: 'list', items: lines.map((line) => spansOf(line.slice(LIST_MARKER.length).trim())) };
  }
  return { kind: 'paragraph', spans: spansOf(paragraph) };
}

/**
 * Splits a body on blank lines. A `## ` paragraph is a heading, a paragraph whose every line starts
 * with `- ` is a list, anything else is a paragraph; `**bold**` and `*italic*` become styled spans.
 */
export function blocksOf(body: string): DiaryBlock[] {
  return body
    .split(PARAGRAPH_BREAK)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== '')
    .map(blockOf);
}

/**
 * The list with `entry` put in place of its older copy, newest date first (the saved one leads its date).
 * `replacesId` is the id the entry had before the save; a rename gives it a new id.
 */
export function placeEntry(list: readonly DiaryEntry[], entry: DiaryEntry, replacesId: string = entry.id): DiaryEntry[] {
  const others = list.filter((existing) => existing.id !== replacesId && existing.id !== entry.id);
  return [entry, ...others].sort((a, b) => b.date.localeCompare(a.date));
}

/** The entries either side of the open one; `entries` is newest first, so previous is the older (next index). */
export function neighborsOf(
  entries: readonly DiaryEntry[],
  id: string,
): { previous: DiaryEntry | null; next: DiaryEntry | null } {
  const index = entries.findIndex((entry) => entry.id === id);
  if (index === -1) return { previous: null, next: null };
  return { previous: entries[index + 1] ?? null, next: entries[index - 1] ?? null };
}

const SWIPE_MIN_DISTANCE_PX = 60;
const SWIPE_HORIZONTAL_DOMINANCE = 2;
// iOS Safari's back gesture starts here, so a swipe from the edge is not a page turn.
const SWIPE_EDGE_ZONE_PX = 24;

export interface TouchPoint { x: number; y: number }

/** The page a horizontal swipe turns to: left is the next entry, right the previous; null when it is not a page turn. */
export function swipeDirection(start: TouchPoint, end: TouchPoint, viewportWidth: number): 'previous' | 'next' | null {
  if (start.x < SWIPE_EDGE_ZONE_PX || start.x > viewportWidth - SWIPE_EDGE_ZONE_PX) return null;
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (Math.abs(dx) < SWIPE_MIN_DISTANCE_PX || Math.abs(dx) <= SWIPE_HORIZONTAL_DOMINANCE * Math.abs(dy)) return null;
  return dx < 0 ? 'next' : 'previous';
}

/** Today's local date as YYYY-MM-DD. */
export function todayLocal(now: Date = new Date()): string {
  const pad = (value: number): string => String(value).padStart(DATE_PART_WIDTH, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
