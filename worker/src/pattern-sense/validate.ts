// Pure validation for the /save route. No I/O.

export const MAX_BODY_CHARS = 16 * 1024;
export const MAX_CODE_CHARS = 4096;
const MAX_BRANCH_CHARS = 255;
const MONDAY_UTC_DAY = 1;
const SCHEMA_VERSION = 1;
const CODE_TAG = 'PS1';
const RESULTS_DIR = 'dashboard/pattern_sense_results';

const OWNER_PATTERN = /^[A-Za-z0-9-]{1,39}$/;
const REPO_PATTERN = /^[A-Za-z0-9._-]{1,100}$/;
const WEEK_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const VOCABULARY_PATTERN = /^[0-9a-f]{6}$/;
const ISO_UTC_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?Z$/;
const CONTROL_CHARS_PATTERN = /[\u0000-\u001f\u007f]/;
const WHITESPACE_PATTERN = /\s/;

const RESULT_KEYS: readonly string[] = [
  'schemaVersion',
  'week',
  'vocabulary',
  'code',
  'submittedAt',
];

export interface SaveRequest {
  readonly owner: string;
  readonly repo: string;
  readonly branch: string;
  readonly path: string;
  readonly results: unknown;
}

export interface Results {
  readonly schemaVersion: 1;
  readonly week: string;
  readonly vocabulary: string;
  readonly code: string;
  readonly submittedAt: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function isValidBranch(branch: string): boolean {
  if (branch.length === 0 || branch.length > MAX_BRANCH_CHARS) return false;
  if (WHITESPACE_PATTERN.test(branch) || CONTROL_CHARS_PATTERN.test(branch)) return false;
  return !branch.includes('..');
}

/** Parses the /save body; null on oversize, bad JSON, or any wrong-shaped field. */
export function parseSaveRequest(text: string): SaveRequest | null {
  if (text.length > MAX_BODY_CHARS) return null;
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return null;
  }
  if (!isRecord(body)) return null;

  const { owner, repo, branch, path, results } = body;
  if (typeof owner !== 'string' || !OWNER_PATTERN.test(owner)) return null;
  if (typeof repo !== 'string' || !REPO_PATTERN.test(repo)) return null;
  if (typeof branch !== 'string' || !isValidBranch(branch)) return null;
  if (typeof path !== 'string' || results === undefined) return null;
  return { owner, repo, branch, path, results };
}

function isRealMonday(week: string): boolean {
  if (!WEEK_PATTERN.test(week)) return false;
  const date = new Date(`${week}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return false;
  if (date.toISOString().slice(0, 10) !== week) return false;
  return date.getUTCDay() === MONDAY_UTC_DAY;
}

function isValidCode(code: string, week: string, vocabulary: string): boolean {
  if (code.length > MAX_CODE_CHARS || CONTROL_CHARS_PATTERN.test(code)) return false;
  return code.startsWith(`${CODE_TAG} ${week} ${vocabulary} `);
}

function isValidTimestamp(value: string): boolean {
  return ISO_UTC_PATTERN.test(value) && Number.isFinite(Date.parse(value));
}

function hasExactKeys(value: Record<string, unknown>): boolean {
  const keys = Object.keys(value);
  return keys.length === RESULT_KEYS.length && RESULT_KEYS.every((key) => keys.includes(key));
}

export function parseResults(value: unknown): Results | null {
  if (!isRecord(value) || !hasExactKeys(value)) return null;
  const { schemaVersion, week, vocabulary, code, submittedAt } = value;
  if (schemaVersion !== SCHEMA_VERSION) return null;
  if (typeof week !== 'string' || !isRealMonday(week)) return null;
  if (typeof vocabulary !== 'string' || !VOCABULARY_PATTERN.test(vocabulary)) return null;
  if (typeof code !== 'string' || !isValidCode(code, week, vocabulary)) return null;
  if (typeof submittedAt !== 'string' || !isValidTimestamp(submittedAt)) return null;
  return { schemaVersion: SCHEMA_VERSION, week, vocabulary, code, submittedAt };
}

export function expectedPath(week: string): string {
  return `${RESULTS_DIR}/${week.replaceAll('-', '')}.json`;
}
