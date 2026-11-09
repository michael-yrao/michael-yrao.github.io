import { DiaryEntry } from './diary-contract';

const HEADING_MARKER = '## ';
const PARAGRAPH_BREAK = /\n\s*\n/;
const DATE_PART_WIDTH = 2;

export interface DiaryBlock { text: string; isHeading: boolean }

/** Splits a body on blank lines; a paragraph that starts with `## ` is a heading (marker stripped). */
export function blocksOf(body: string): DiaryBlock[] {
  return body
    .split(PARAGRAPH_BREAK)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== '')
    .map((paragraph) =>
      paragraph.startsWith(HEADING_MARKER)
        ? { text: paragraph.slice(HEADING_MARKER.length).trim(), isHeading: true }
        : { text: paragraph, isHeading: false },
    );
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
