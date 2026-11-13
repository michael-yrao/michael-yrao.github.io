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

/** Today's local date as YYYY-MM-DD. */
export function todayLocal(now: Date = new Date()): string {
  const pad = (value: number): string => String(value).padStart(DATE_PART_WIDTH, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
