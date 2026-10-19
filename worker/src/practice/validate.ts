// Pure validation for the /practice routes. No I/O.

import {
  isValidBranch,
  isValidTimestamp,
  OWNER_PATTERN,
  REPO_PATTERN,
} from '../pattern-sense/validate';
import { isRecord, type RepoTarget } from '../github/write-file';

export const MAX_ATTEMPT_BYTES = 64 * 1024;
export const ATTEMPTS_DIR = 'dsa/attempts';

const HEADER_PREFIX = '# po-attempt: ';
const PATH_PATTERN = /^dsa\/attempts\/(\d{8})\/(\d+)_[a-z0-9_]+\.py$/;
const TESTS_PATTERN = /^(\d+)\/(\d+)$/;
const RATINGS: readonly unknown[] = ['clean', 'shaky', 'blank'];
const HEADER_KEYS: readonly string[] = ['complete', 'rating', 'tests', 'complexity', 'savedAt'];
const MAX_LABEL_CHARS = 200;
const MAX_WHY_CHARS = 500;
const COMPLEXITY_LIMITS: readonly (readonly [string, number])[] = [
  ['time', MAX_LABEL_CHARS],
  ['space', MAX_LABEL_CHARS],
  ['whyTime', MAX_WHY_CHARS],
  ['whySpace', MAX_WHY_CHARS],
];
const COMPLEXITY_KEYS: readonly string[] = COMPLEXITY_LIMITS.map(([key]) => key);

export interface AttemptFile {
  readonly owner: string;
  readonly repo: string;
  readonly branch: string;
  readonly path: string;
  readonly content: string;
}

export interface ValidAttempt {
  readonly commitMessage: string;
}

export interface LatestRequest extends RepoTarget {
  readonly number: number;
}

function parseJsonRecord(text: string): Record<string, unknown> | null {
  try {
    const value: unknown = JSON.parse(text);
    return isRecord(value) ? value : null;
  } catch {
    return null;
  }
}

function parseRepoTarget(body: Record<string, unknown>): RepoTarget | null {
  const { owner, repo, branch } = body;
  if (typeof owner !== 'string' || !OWNER_PATTERN.test(owner)) return null;
  if (typeof repo !== 'string' || !REPO_PATTERN.test(repo)) return null;
  if (typeof branch !== 'string' || !isValidBranch(branch)) return null;
  return { owner, repo, branch };
}

/** Parses the /practice/save body; null on bad JSON or any wrong-shaped field. */
export function parseAttemptFile(text: string): AttemptFile | null {
  const body = parseJsonRecord(text);
  const target = body === null ? null : parseRepoTarget(body);
  if (body === null || target === null) return null;
  const { path, content } = body;
  if (typeof path !== 'string' || typeof content !== 'string') return null;
  return { ...target, path, content };
}

/** Parses the /practice/latest body; null on bad JSON or any wrong-shaped field. */
export function parseLatestRequest(text: string): LatestRequest | null {
  const body = parseJsonRecord(text);
  const target = body === null ? null : parseRepoTarget(body);
  if (body === null || target === null) return null;
  const { number } = body;
  if (typeof number !== 'number' || !Number.isSafeInteger(number) || number < 1) return null;
  return { ...target, number };
}

function isCompleteTests(tests: unknown): boolean {
  const match = typeof tests === 'string' ? TESTS_PATTERN.exec(tests) : null;
  if (match === null) return false;
  const [passed, total] = [Number(match[1]), Number(match[2])];
  return passed === total && total >= 1;
}

function isValidTests(tests: unknown): boolean {
  if (tests === null) return true;
  const match = typeof tests === 'string' ? TESTS_PATTERN.exec(tests) : null;
  return match !== null && Number(match[1]) <= Number(match[2]);
}

function hasExactKeys(record: Record<string, unknown>, expected: readonly string[]): boolean {
  const keys = Object.keys(record);
  return keys.length === expected.length && expected.every((key) => keys.includes(key));
}

function isBoundedText(value: unknown, maxChars: number): boolean {
  return typeof value === 'string' && value.trim().length >= 1 && value.length <= maxChars;
}

function isCompleteComplexity(complexity: unknown): boolean {
  if (!isRecord(complexity) || !hasExactKeys(complexity, COMPLEXITY_KEYS)) return false;
  return COMPLEXITY_LIMITS.every(([key, maxChars]) => isBoundedText(complexity[key], maxChars));
}

function isValidHeader(header: Record<string, unknown>): boolean {
  if (!hasExactKeys(header, HEADER_KEYS)) return false;
  const { complete, rating, tests, complexity, savedAt } = header;
  if (typeof complete !== 'boolean') return false;
  if (typeof savedAt !== 'string' || !isValidTimestamp(savedAt)) return false;
  if (rating !== null && !RATINGS.includes(rating)) return false;
  if (!isValidTests(tests)) return false;
  if (!complete) return rating === null && complexity === null;
  return rating !== null && isCompleteTests(tests) && isCompleteComplexity(complexity);
}

function commitMessageFor(path: string, isComplete: boolean): string {
  const [, date, number] = PATH_PATTERN.exec(path) ?? [];
  return `chore(practice): ${number} ${isComplete ? 'complete' : 'attempt'} ${date}`;
}

/** Returns the commit message for a valid attempt, or the 400 error string naming the failure. */
export function validateAttempt(file: AttemptFile): ValidAttempt | { error: string } {
  if (!PATH_PATTERN.test(file.path)) return { error: 'invalid-path' };
  if (new TextEncoder().encode(file.content).length > MAX_ATTEMPT_BYTES)
    return { error: 'attempt-too-large' };

  const firstLine = file.content.split('\n', 1)[0] ?? '';
  if (!firstLine.startsWith(HEADER_PREFIX)) return { error: 'missing-attempt-header' };
  const header = parseJsonRecord(firstLine.slice(HEADER_PREFIX.length));
  if (header === null || !isValidHeader(header)) return { error: 'invalid-attempt-header' };

  return { commitMessage: commitMessageFor(file.path, header['complete'] === true) };
}
