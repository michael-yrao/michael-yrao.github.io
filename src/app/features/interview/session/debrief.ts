/** Level-raiser moves, in the order the coach's reference lists them. */
export const LEVEL_RAISER_MOVES = ['stream', 'scale-out', 'repeated-queries', 'generalize', 'tighten', 'relax', 'productionize'] as const;
export type LevelRaiserMove = (typeof LEVEL_RAISER_MOVES)[number];
export const CHECK_KEYS = ['restated', 'survives', 'tradeoff', 'approach', 'coded'] as const;
export type CheckKey = (typeof CHECK_KEYS)[number];
export type Recognition = 'hit' | 'miss';
export type Verdict = 'pass' | 'partial' | 'fail';
export const NOTES_MAX_LENGTH = 4_000;

export const MOVE_NAMES: Readonly<Record<LevelRaiserMove, string>> = {
  stream: 'Stream / online',
  'scale-out': 'Scale out',
  'repeated-queries': 'Repeated queries',
  generalize: 'Generalize',
  tighten: 'Tighten the bound',
  relax: 'Relax an assumption',
  productionize: 'Productionize',
};

export const CHECK_NAMES: Readonly<Record<CheckKey, string>> = {
  restated: 'Restated the delta',
  survives: 'Named what survives',
  tradeoff: 'Trade-off before code',
  approach: 'Correct approach',
  coded: 'Coded if time',
};

export interface InterviewNotes {
  readonly isCold: boolean;
  readonly recognition: Recognition | null;
  readonly hasTime: boolean;
  readonly hasSpace: boolean;
  readonly move: LevelRaiserMove | null;
  /** Whole minutes after `startedAt` when Thrown was pressed. */
  readonly raiserMinute: number | null;
  readonly checks: Readonly<Record<CheckKey, boolean>>;
  readonly notes: string;
}

export const EMPTY_NOTES: InterviewNotes = {
  isCold: false,
  recognition: null,
  hasTime: false,
  hasSpace: false,
  move: null,
  raiserMinute: null,
  checks: { restated: false, survives: false, tradeoff: false, approach: false, coded: false },
  notes: '',
};

/** What the host sends with `end`. No code in it. */
export interface EndSummary {
  readonly v: 1;
  readonly startedAt: number;
  readonly endedAt: number;
  readonly awayCount: number;
  readonly pasteCount: number;
  readonly notes: InterviewNotes;
}

export interface Debrief {
  readonly sessionId: string;
  readonly role: 'candidate' | 'interviewer';
  readonly title: string;
  /** The site problem it was imported from. */
  readonly source: number | null;
  readonly summary: EndSummary;
  readonly finalCode: string;
  /** This browser's last case run. */
  readonly lastRun: { readonly passed: number; readonly total: number } | null;
}

export interface DebriefSummary {
  readonly sessionId: string;
  readonly title: string;
  readonly role: 'candidate' | 'interviewer';
  readonly endedAt: number;
}

const SUMMARY_VERSION = 1;
const OTHERS_FOR_PASS = 3;
const OTHER_CHECKS: readonly CheckKey[] = CHECK_KEYS.filter((key) => key !== 'approach');
const MS_PER_MINUTE = 60_000;
const MIN_FENCE_LENGTH = 3;
const SUMMARY_KEYS: readonly string[] = ['v', 'startedAt', 'endedAt', 'awayCount', 'pasteCount', 'notes'];
const NOTES_KEYS: readonly string[] = ['isCold', 'recognition', 'hasTime', 'hasSpace', 'move', 'raiserMinute', 'checks', 'notes'];
const RECOGNITIONS: readonly string[] = ['hit', 'miss'];
const PASS_MARK = '✅';
const FAIL_MARK = '❌';

/** The coach's rule: a correct approach plus at least three of the other four is a pass; either alone is partial. */
export function verdictOf(notes: InterviewNotes): Verdict | null {
  if (notes.move === null) {
    return null;
  }
  const hasApproach = notes.checks.approach;
  const hasOthers = OTHER_CHECKS.filter((key) => notes.checks[key]).length >= OTHERS_FOR_PASS;
  if (hasApproach && hasOthers) {
    return 'pass';
  }
  return hasApproach || hasOthers ? 'partial' : 'fail';
}

// ---- validation of external input ----

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function hasExactKeys(record: Record<string, unknown>, keys: readonly string[]): boolean {
  const own = Object.keys(record);
  return own.length === keys.length && keys.every((key) => Object.hasOwn(record, key));
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function parseChecks(value: unknown): Readonly<Record<CheckKey, boolean>> | null {
  const record = asRecord(value);
  if (record === null || !hasExactKeys(record, CHECK_KEYS)) {
    return null;
  }
  if (!CHECK_KEYS.every((key) => typeof record[key] === 'boolean')) {
    return null;
  }
  return {
    restated: record['restated'] === true,
    survives: record['survives'] === true,
    tradeoff: record['tradeoff'] === true,
    approach: record['approach'] === true,
    coded: record['coded'] === true,
  };
}

/** A freshly built notes object, or null when `value` is not exactly the notes shape. */
export function parseNotes(value: unknown): InterviewNotes | null {
  const record = asRecord(value);
  if (record === null || !hasExactKeys(record, NOTES_KEYS)) {
    return null;
  }
  const { isCold, recognition, hasTime, hasSpace, move, raiserMinute, notes } = record;
  const checks = parseChecks(record['checks']);
  const isRecognitionValid = recognition === null || (typeof recognition === 'string' && RECOGNITIONS.includes(recognition));
  const isMoveValid = move === null || (typeof move === 'string' && (LEVEL_RAISER_MOVES as readonly string[]).includes(move));
  const isMinuteValid = raiserMinute === null || isCount(raiserMinute);
  const areFlagsValid = typeof isCold === 'boolean' && typeof hasTime === 'boolean' && typeof hasSpace === 'boolean';
  if (checks === null || !isRecognitionValid || !isMoveValid || !isMinuteValid || !areFlagsValid) {
    return null;
  }
  if (typeof notes !== 'string' || notes.length > NOTES_MAX_LENGTH) {
    return null;
  }
  return {
    isCold,
    recognition: recognition as Recognition | null,
    hasTime,
    hasSpace,
    move: move as LevelRaiserMove | null,
    raiserMinute: raiserMinute as number | null,
    checks,
    notes,
  };
}

/** The summary the host sent, rebuilt field by field; null when anything is off. External input. */
export function parseEndSummary(value: unknown): EndSummary | null {
  const record = asRecord(value);
  if (record === null || !hasExactKeys(record, SUMMARY_KEYS) || record['v'] !== SUMMARY_VERSION) {
    return null;
  }
  const { startedAt, endedAt, awayCount, pasteCount } = record;
  if (!isCount(startedAt) || !isCount(endedAt) || !isCount(awayCount) || !isCount(pasteCount) || startedAt > endedAt) {
    return null;
  }
  const notes = parseNotes(record['notes']);
  return notes === null ? null : { v: SUMMARY_VERSION, startedAt, endedAt, awayCount, pasteCount, notes };
}

// ---- Markdown export ----

/** Lowercase, every run of characters other than a-z0-9 becomes one `_`, trimmed of `_` at both ends. */
function slugOf(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/** `YYYYMMDD` in the viewer's local time zone. */
function localDateStamp(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}`;
}

/** Whole minutes between the two timestamps, rounded to the nearest minute. */
function minutesBetween(startedAt: number, endedAt: number): number {
  return Math.round((endedAt - startedAt) / MS_PER_MINUTE);
}

/** A field line that ends at its colon when the value is empty, with no trailing space. */
function field(label: string, value: string): string {
  return value === '' ? `${label}:` : `${label}: ${value}`;
}

function mark(isOn: boolean): string {
  return isOn ? PASS_MARK : FAIL_MARK;
}

/** A fence one backtick longer than the longest backtick run in `code`, at least three. */
function fenceFor(code: string): string {
  const longestRun = (code.match(/`+/g) ?? []).reduce((longest, run) => Math.max(longest, run.length), 0);
  return '`'.repeat(Math.max(MIN_FENCE_LENGTH, longestRun + 1));
}

function openBullets(notes: string): readonly string[] {
  const lines = notes
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line !== '');
  return lines.length === 0 ? ['-'] : lines.map((line) => `- ${line}`);
}

function checklistRows(notes: InterviewNotes): readonly string[] {
  return CHECK_KEYS.map((key) => `| ${CHECK_NAMES[key]} | ${mark(notes.checks[key])} | |`);
}

/** The coach's `mock_debrief_template.md` shape, filled where the page knows and empty where it does not. */
export function debriefMarkdown(debrief: Debrief): string {
  const { summary, title, source, finalCode } = debrief;
  const { notes } = summary;
  const problem = source === null ? title : `#${source} ${title}`;
  const slug = slugOf(title);
  const verdict = verdictOf(notes);
  const fence = fenceFor(finalCode);
  const lines = [
    `# Mock debrief — ${localDateStamp(summary.endedAt)}${slug === '' ? '' : ` ${slug}`}`,
    '',
    '| | |',
    '|---|---|',
    `| **Problem** | ${problem} |`,
    `| **Cold?** | ${notes.isCold ? 'yes' : 'no'} |`,
    `| **Time** | ${minutesBetween(summary.startedAt, summary.endedAt)} min |`,
    '| **Base rating** | |',
    '',
    '## Clarify',
    '',
    '- Questions asked:',
    '- Constraints pinned:',
    '',
    '## Base — what came out',
    '',
    '- Approach:',
    field('- Recognition call', notes.recognition ?? ''),
    `- Complexity stated: time ${mark(notes.hasTime)} · space ${mark(notes.hasSpace)}`,
    '',
    '## Level raiser',
    '',
    field('- Move', notes.move === null ? '' : MOVE_NAMES[notes.move]),
    field('- Thrown at ~minute', notes.raiserMinute === null ? '' : String(notes.raiserMinute)),
    '- The delta:',
    '- What happened:',
    '',
    '| Checklist | | Evidence |',
    '|---|---|---|',
    ...checklistRows(notes),
    '',
    field('Verdict', verdict ?? ''),
    '',
    '## ❓ Open',
    '',
    ...openBullets(notes.notes),
    '',
    '## Follow-ups',
    '',
    '- Ledger entries:',
    '- Tracker row:',
    '',
    '## Final code',
    '',
    `${fence}python`,
    finalCode,
    fence,
    '',
  ];
  return lines.join('\n');
}
