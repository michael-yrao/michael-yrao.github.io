const ATTEMPTS_DIR = 'dsa/attempts';
const HEADER_PREFIX = '# po-attempt: ';
const DATE_PAD = 2;
const MONTH_OFFSET = 1;
const NON_NAME_RUN = /[^a-z0-9]+/g;
const EDGE_UNDERSCORES = /^_+|_+$/g;

export type AttemptRating = 'clean' | 'shaky' | 'blank';

/** What a saved attempt records beside the code. `tests` is `"<passed>/<total>"` or null. */
export interface AttemptMeta {
  readonly complete: boolean;
  readonly rating: AttemptRating | null;
  readonly tests: string | null;
}

/** A remote attempt read back: when it was saved and the code without its header line. */
export interface RemoteAttempt {
  readonly savedAt: number;
  readonly code: string;
}

/** The rating choices, in the order they are offered. */
export const RATING_OPTIONS: readonly { readonly rating: AttemptRating; readonly label: string }[] = [
  { rating: 'clean', label: '🟢 Clean — no hints, from a blank page' },
  { rating: 'shaky', label: '🟡 Shaky — needed a nudge or peeked' },
  { rating: 'blank', label: '🔴 Blank — had to look it up' },
];

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
    savedAt: savedAt.toISOString(),
  });
  return `${HEADER_PREFIX}${header}\n${code}`;
}

/** Reads a file built by `buildAttemptFile`; null when the header is missing or malformed. */
export function parseAttemptFile(content: string): RemoteAttempt | null {
  if (!content.startsWith(HEADER_PREFIX)) return null;
  const lineEnd = content.indexOf('\n');
  if (lineEnd === -1) return null;
  try {
    const header: unknown = JSON.parse(content.slice(HEADER_PREFIX.length, lineEnd));
    const stamp = (header as { savedAt?: unknown } | null)?.savedAt;
    const savedAt = typeof stamp === 'string' ? Date.parse(stamp) : Number.NaN;
    return Number.isNaN(savedAt) ? null : { savedAt, code: content.slice(lineEnd + 1) };
  } catch {
    return null; // a header that is not JSON: treated as no remote copy
  }
}
