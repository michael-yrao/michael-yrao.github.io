// Pure logic for the site's hold/defer route: request validation and the text-level edit of
// cse-progress's holds.yml. The block format is a cross-repo contract with the Python engine.

import { dayNumber, LOCAL_DAY_TOLERANCE } from '../onboard/intake';
import { OWNER_PATTERN, REPO_PATTERN } from '../pattern-sense/validate';

// A contract bound like MAX_ATTEMPT_BYTES, not a config key.
export const MAX_HOLD_DAYS = 90;
export const HOLD_WHY = 'site-hold';
export const HOLDS_PATH = 'docs/foundations/dsa/mastery/holds.yml';
export const TRACKER_PATH = 'docs/foundations/dsa/mastery/dsa_progress.md';
export const MAX_TITLE_CODE_POINTS = 200;

const ROW_KEY = '- row:';
const WHY_KEY = '  why:';
const CONTINUATION_PREFIX = '  ';
const LINE_BREAK_PATTERN = /\r?\n/;
// Common prefix of the three review-table headers the Python parser accepts.
const TRACKER_HEADER_PREFIX = '| Difficulty | Problem | Comfort |';
// PyYAML reads U+2028 and U+2029 as line breaks inside a double-quoted scalar and JSON.stringify
// does not escape them, so they are refused along with the control characters.
const LINE_SEPARATOR_CODES = [0x2028, 0x2029];
const TITLE_FORBIDDEN_PATTERN = new RegExp(
  `[\\p{Cc}${String.fromCharCode(...LINE_SEPARATOR_CODES)}]`,
  'u',
);

export interface HoldRequest {
  readonly owner: string;
  readonly repo: string;
  readonly number: number;
  readonly title: string;
  readonly until: string | null;
  readonly today: string;
}

export type HoldCode =
  | 'invalid-request'
  | 'invalid-target'
  | 'invalid-number'
  | 'invalid-title'
  | 'invalid-today'
  | 'invalid-until';

export type HoldParse = { readonly ok: HoldRequest } | { readonly error: HoldCode };

export interface HoldFields {
  readonly row: string;
  readonly until: string;
  readonly since: string;
}

export type HoldEdit =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'unchanged' }
  | { readonly kind: 'owned'; readonly why: string };

function isTitleValid(title: string): boolean {
  if (title === '' || TITLE_FORBIDDEN_PATTERN.test(title)) return false;
  return Array.from(title).length <= MAX_TITLE_CODE_POINTS;
}

function isUntilValid(until: unknown, todayDay: number): boolean {
  if (typeof until !== 'string') return false;
  const untilDay = dayNumber(until);
  if (untilDay === null) return false;
  return untilDay > todayDay && untilDay <= todayDay + MAX_HOLD_DAYS;
}

export function parseHoldRequest(body: unknown, utcTodayIso: string): HoldParse {
  if (typeof body !== 'object' || body === null || Array.isArray(body))
    return { error: 'invalid-request' };
  const { owner, repo, number, title, today, until } = body as Record<string, unknown>;

  if (typeof owner !== 'string' || !OWNER_PATTERN.test(owner)) return { error: 'invalid-target' };
  if (typeof repo !== 'string' || !REPO_PATTERN.test(repo)) return { error: 'invalid-target' };
  if (typeof number !== 'number' || !Number.isSafeInteger(number) || number <= 0)
    return { error: 'invalid-number' };
  if (typeof title !== 'string' || !isTitleValid(title.trim())) return { error: 'invalid-title' };

  const todayDay = typeof today === 'string' ? dayNumber(today) : null;
  const utcDay = dayNumber(utcTodayIso);
  if (typeof today !== 'string' || todayDay === null || utcDay === null)
    return { error: 'invalid-today' };
  if (Math.abs(todayDay - utcDay) > LOCAL_DAY_TOLERANCE) return { error: 'invalid-today' };

  if (until === null) return { ok: { owner, repo, number, title: title.trim(), until: null, today } };
  if (!isUntilValid(until, todayDay)) return { error: 'invalid-until' };
  return { ok: { owner, repo, number, title: title.trim(), until: String(until), today } };
}

/** The tracker row text for a problem, or null when no tracker row is linked with exactly that text. */
export function trackerRow(trackerText: string, number: number, title: string): string | null {
  const row = `${number}. ${title}`;
  const link = `[${row}](`;
  return trackerTableLines(trackerText).some((line) => line.includes(link)) ? row : null;
}

/** The lines of the review table: the contiguous `|` lines after the first tracker header. */
function trackerTableLines(trackerText: string): string[] {
  const lines = trackerText.split(LINE_BREAK_PATTERN);
  const header = lines.findIndex((line) => line.trim().startsWith(TRACKER_HEADER_PREFIX));
  if (header < 0) return [];
  const rest = lines.slice(header + 1);
  const length = rest.findIndex((line) => !line.trim().startsWith('|'));
  return length < 0 ? rest : rest.slice(0, length);
}

interface Entry {
  readonly start: number;
  readonly end: number;
  readonly why: string;
}

function unquote(raw: string): string {
  const text = raw.trim();
  if (text.startsWith('"') && text.endsWith('"') && text.length >= 2) {
    try {
      const parsed: unknown = JSON.parse(text);
      return typeof parsed === 'string' ? parsed.trim() : text;
    } catch {
      return text;
    }
  }
  if (text.startsWith("'") && text.endsWith("'") && text.length >= 2)
    return text.slice(1, -1).replaceAll("''", "'").trim();
  return text;
}

function entryEnd(lines: readonly string[], start: number): number {
  let end = start + 1;
  while (end < lines.length && (lines[end] ?? '').startsWith(CONTINUATION_PREFIX)) end += 1;
  return end;
}

function entryWhy(lines: readonly string[]): string {
  const line = lines.find((candidate) => candidate.startsWith(WHY_KEY));
  return line === undefined ? '' : unquote(line.slice(WHY_KEY.length));
}

function findEntry(lines: readonly string[], row: string): Entry | null {
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    if (!line.startsWith(ROW_KEY)) continue;
    if (unquote(line.slice(ROW_KEY.length)) !== row.trim()) continue;
    const end = entryEnd(lines, index);
    return { start: index, end, why: entryWhy(lines.slice(index, end)) };
  }
  return null;
}

function blockLines(hold: HoldFields): string[] {
  return [
    `${ROW_KEY} ${JSON.stringify(hold.row)}`,
    `  until: ${hold.until}`,
    `  since: ${hold.since}`,
    `${WHY_KEY} ${HOLD_WHY}`,
  ];
}

function splitText(yamlText: string): { lines: string[]; eol: string } {
  return { lines: yamlText.split(LINE_BREAK_PATTERN), eol: yamlText.includes('\r\n') ? '\r\n' : '\n' };
}

function textEdit(lines: readonly string[], eol: string): HoldEdit {
  return { kind: 'text', text: lines.join(eol) };
}

/** Sets the row's hold: appended when absent, replaced when the site owns it, refused otherwise. */
export function upsertHold(yamlText: string | null, hold: HoldFields): HoldEdit {
  const { lines, eol } = splitText(yamlText ?? '');
  const entry = findEntry(lines, hold.row);
  if (entry !== null && entry.why !== HOLD_WHY) return { kind: 'owned', why: entry.why };
  if (entry !== null)
    return textEdit([...lines.slice(0, entry.start), ...blockLines(hold), ...lines.slice(entry.end)], eol);

  const body = lines.at(-1) === '' ? lines.slice(0, -1) : lines;
  return textEdit([...body, ...blockLines(hold), ''], eol);
}

/** Removes the site's own hold on the row; nothing to do when there is none. */
export function removeHold(yamlText: string | null, row: string): HoldEdit {
  if (yamlText === null) return { kind: 'unchanged' };
  const { lines, eol } = splitText(yamlText);
  const entry = findEntry(lines, row);
  if (entry === null) return { kind: 'unchanged' };
  if (entry.why !== HOLD_WHY) return { kind: 'owned', why: entry.why };
  return textEdit([...lines.slice(0, entry.start), ...lines.slice(entry.end)], eol);
}
