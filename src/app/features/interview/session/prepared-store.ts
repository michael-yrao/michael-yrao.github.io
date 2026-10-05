import { SignedProblem } from './interview-problem';
import { isSignedProblem } from './session-message';

/**
 * A prepared interview kept in this browser: the interviewer key (packed, so it holds the private half), the
 * problem signed with it, and when it was prepared. There is no expiry; the entry lives until it is removed.
 *
 * An entry's value must never be logged: it holds the private key. Messages here name the key (the session id)
 * only, and caught errors are not passed on, since a parse error can echo part of the text it read.
 */
export interface PreparedEntry {
  readonly packed: string;
  readonly problem: SignedProblem;
  readonly createdAt: number;
}

export const PREPARED_KEY_PREFIX = 'po-interview-prepared:';

function keyFor(sessionId: string): string {
  return `${PREPARED_KEY_PREFIX}${sessionId}`;
}

function isPreparedEntry(value: unknown): value is PreparedEntry {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record['packed'] === 'string' &&
    isSignedProblem(record['problem']) &&
    typeof record['createdAt'] === 'number' &&
    Number.isFinite(record['createdAt'])
  );
}

/** Storage is external input: bad JSON or a wrong shape is logged (without the value) and read as nothing. */
function parseEntry(key: string, raw: string): PreparedEntry | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (isPreparedEntry(value)) {
      return { packed: value.packed, problem: value.problem, createdAt: value.createdAt };
    }
    console.error(`Prepared interview: ${key} has the wrong shape`);
  } catch {
    console.error(`Prepared interview: ${key} is not valid JSON`);
  }
  return null;
}

function readEntry(key: string): PreparedEntry | null {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : parseEntry(key, raw);
  } catch {
    console.error(`Prepared interview: could not read ${key}`);
    return null;
  }
}

/** The prepared entry for `sessionId`, or null when there is none or it is malformed. */
export function loadPrepared(sessionId: string): PreparedEntry | null {
  return readEntry(keyFor(sessionId));
}

/** False when storage refuses the write (full, or blocked). */
export function savePrepared(sessionId: string, entry: PreparedEntry): boolean {
  const key = keyFor(sessionId);
  try {
    localStorage.setItem(key, JSON.stringify(entry));
    return true;
  } catch {
    console.error(`Prepared interview: could not save ${key}`);
    return false;
  }
}

/** Replaces the entry's problem with `signed` when an entry exists and `signed.rev` is higher; otherwise does nothing. */
export function mirrorPreparedProblem(sessionId: string, signed: SignedProblem): void {
  const entry = loadPrepared(sessionId);
  if (entry === null || signed.rev <= entry.problem.rev) {
    return;
  }
  savePrepared(sessionId, { ...entry, problem: signed });
}

export function removePrepared(sessionId: string): void {
  const key = keyFor(sessionId);
  try {
    localStorage.removeItem(key);
  } catch {
    console.error(`Prepared interview: could not remove ${key}`);
  }
}

function preparedKeys(): readonly string[] {
  const keys: string[] = [];
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index);
    if (key !== null && key.startsWith(PREPARED_KEY_PREFIX)) {
      keys.push(key);
    }
  }
  return keys;
}

/** Every well-formed prepared entry with its session id, newest first; malformed entries are skipped. */
export function listPrepared(): readonly (PreparedEntry & { readonly sessionId: string })[] {
  try {
    return preparedKeys()
      .flatMap((key) => {
        const entry = readEntry(key);
        return entry === null ? [] : [{ ...entry, sessionId: key.slice(PREPARED_KEY_PREFIX.length) }];
      })
      .sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    console.error('Prepared interview: could not list the prepared interviews');
    return [];
  }
}
