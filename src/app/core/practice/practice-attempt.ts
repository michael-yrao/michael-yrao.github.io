import type { Comfort } from '../models/progress.model';

const ATTEMPTS_DIR = 'dsa/attempts';
const HEADER_PREFIX = '# po-attempt: ';
const DATE_PAD = 2;
const MONTH_OFFSET = 1;
const NON_NAME_RUN = /[^a-z0-9]+/g;
const EDGE_UNDERSCORES = /^_+|_+$/g;
const ATTEMPT_NUMBER_PREFIX = /^(\d+)_/;
const ISO_DAY_SEPARATOR = /-/g;

export type AttemptRating = 'clean' | 'shaky' | 'blank';

/** The learner's stated bounds with a why for each; null on an in-progress save. */
export interface AttemptComplexity {
  readonly time: string;
  readonly space: string;
  readonly whyTime: string;
  readonly whySpace: string;
}

/** The technique the owner picked before the editor opened, and when (ISO). */
export interface AttemptRecognition {
  readonly picked: string;
  readonly at: string;
}

/** What a saved attempt records beside the code. `tests` is `"<passed>/<total>"` or null. */
export interface AttemptMeta {
  readonly complete: boolean;
  readonly rating: AttemptRating | null;
  readonly tests: string | null;
  readonly complexity: AttemptComplexity | null;
  readonly recognition?: AttemptRecognition | null;
}

/** A remote attempt read back: when it was saved, whether it is a finished rep, and the code
 *  without its header line. */
export interface RemoteAttempt {
  readonly savedAt: number;
  readonly complete: boolean;
  readonly rating: AttemptRating | null;
  readonly recognition: AttemptRecognition | null;
  readonly code: string;
}

/** The rating choices, in the order they are offered. */
export const RATING_OPTIONS: readonly {
  readonly rating: AttemptRating;
  readonly comfort: Comfort;
  readonly label: string;
}[] = [
  { rating: 'clean', comfort: '🟢', label: 'Clean — no hints, from a blank page' },
  { rating: 'shaky', comfort: '🟡', label: 'Shaky — needed a nudge or peeked' },
  { rating: 'blank', comfort: '🔴', label: 'Blank — had to look it up' },
];

const RATINGS: readonly AttemptRating[] = RATING_OPTIONS.map((option) => option.rating);

function padded(value: number): string {
  return String(value).padStart(DATE_PAD, '0');
}

/** `261`, `Graph Valid Tree`, 2026-10-18 local → `dsa/attempts/20261018/261_graph_valid_tree.py`. */
export function attemptPath(date: Date, number: number, title: string): string {
  const day = `${date.getFullYear()}${padded(date.getMonth() + MONTH_OFFSET)}${padded(date.getDate())}`;
  const name = title.toLowerCase().replace(NON_NAME_RUN, '_').replace(EDGE_UNDERSCORES, '');
  return `${ATTEMPTS_DIR}/${day}/${number}_${name}.py`;
}

/** The header line, a newline, then the editor code verbatim. */
export function buildAttemptFile(meta: AttemptMeta, savedAt: Date, code: string): string {
  const header = JSON.stringify({
    complete: meta.complete,
    rating: meta.rating,
    tests: meta.tests,
    complexity: meta.complexity,
    savedAt: savedAt.toISOString(),
    ...(meta.recognition ? { recognition: meta.recognition } : {}),
  });
  return `${HEADER_PREFIX}${header}\n${code}`;
}

/** Reads a file built by `buildAttemptFile`; null when the header is missing or malformed. */
export function parseAttemptFile(content: string): RemoteAttempt | null {
  if (!content.startsWith(HEADER_PREFIX)) return null;
  const lineEnd = content.indexOf('\n');
  if (lineEnd === -1) return null;
  try {
    const header = JSON.parse(content.slice(HEADER_PREFIX.length, lineEnd)) as HeaderFields | null;
    const savedAt = typeof header?.savedAt === 'string' ? Date.parse(header.savedAt) : Number.NaN;
    if (Number.isNaN(savedAt)) return null;
    return {
      savedAt,
      complete: header?.complete === true,
      rating: RATINGS.find((rating) => rating === header?.rating) ?? null,
      recognition: recognitionFrom(header?.recognition),
      code: content.slice(lineEnd + 1),
    };
  } catch {
    return null; // a header that is not JSON: treated as no remote copy
  }
}

/** The raw header fields as parsed, each unchecked until `parseAttemptFile` narrows it. */
interface HeaderFields {
  readonly savedAt?: unknown;
  readonly complete?: unknown;
  readonly rating?: unknown;
  readonly recognition?: unknown;
}

function recognitionFrom(value: unknown): AttemptRecognition | null {
  if (typeof value !== 'object' || value === null) return null;
  const { picked, at } = value as { picked?: unknown; at?: unknown };
  return typeof picked === 'string' && typeof at === 'string' ? { picked, at } : null;
}

/** `261_graph_valid_tree.py` → 261; null when the name has no leading number. */
export function attemptNumberFromPath(name: string): number | null {
  const match = ATTEMPT_NUMBER_PREFIX.exec(name);
  return match ? Number(match[1]) : null;
}

/** `2026-10-19` → `dsa/attempts/20261019`, the folder a day's attempts are saved in. */
export function attemptDayDir(isoDate: string): string {
  return `${ATTEMPTS_DIR}/${isoDate.replace(ISO_DAY_SEPARATOR, '')}`;
}
