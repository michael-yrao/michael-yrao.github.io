import { CustomProblem, isCustomProblem } from './session-message';

/** A role's saved session, so a reloaded tab can resume it. */
export interface StoredSession {
  readonly problem: number;
  readonly doc: string;
  /** The session revision of `doc`. */
  readonly rev: number;
  readonly savedAt: number;
  /** The interviewer's own problem, when the session has one. */
  readonly custom?: CustomProblem;
}

export type StoredRole = 'interviewer' | 'candidate';

export const SESSION_KEY_PREFIX = 'po-interview-session:';

const SESSION_TTL_DAYS = 7;
const HOURS_PER_DAY = 24;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const MS_PER_SECOND = 1_000;
export const SESSION_TTL_MS = SESSION_TTL_DAYS * HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND;

/** `po-interview-session:<role>:<peerId>`, so one session's two roles never collide. */
function keyFor(role: StoredRole, peerId: string): string {
  return `${SESSION_KEY_PREFIX}${role}:${peerId}`;
}

function isStoredSession(value: unknown): value is StoredSession {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record['problem'] === 'number' &&
    Number.isInteger(record['problem']) &&
    record['problem'] >= 0 &&
    typeof record['doc'] === 'string' &&
    typeof record['rev'] === 'number' &&
    Number.isInteger(record['rev']) &&
    record['rev'] >= 0 &&
    typeof record['savedAt'] === 'number' &&
    Number.isFinite(record['savedAt']) &&
    (record['custom'] === undefined || isCustomProblem(record['custom']))
  );
}

/** Storage is external input: bad JSON or a wrong shape is logged and read as nothing. */
function parseEntry(key: string, raw: string): StoredSession | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (isStoredSession(value)) {
      return value;
    }
    console.error(`Interview session: ${key} has the wrong shape`, value);
  } catch (err) {
    console.error(`Interview session: ${key} is not valid JSON`, err);
  }
  return null;
}

function isExpired(entry: StoredSession, now: number): boolean {
  return now - entry.savedAt > SESSION_TTL_MS;
}

/** The saved `role` session for `peerId`, or null when there is none, it is malformed, or it has expired. */
export function loadSession(role: StoredRole, peerId: string, now: number = Date.now()): StoredSession | null {
  const key = keyFor(role, peerId);
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      return null;
    }
    const entry = parseEntry(key, raw);
    return entry === null || isExpired(entry, now) ? null : entry;
  } catch (err) {
    console.error(`Interview session: could not read ${key}`, err);
    return null;
  }
}

export function saveSession(
  role: StoredRole,
  peerId: string,
  problem: number,
  doc: string,
  rev: number,
  custom: CustomProblem | null = null,
  now: number = Date.now(),
): void {
  const key = keyFor(role, peerId);
  const entry: StoredSession = { problem, doc, rev, savedAt: now, ...(custom === null ? {} : { custom }) };
  try {
    localStorage.setItem(key, JSON.stringify(entry));
  } catch (err) {
    console.error(`Interview session: could not save ${key}`, err);
  }
}

export function clearSession(role: StoredRole, peerId: string): void {
  const key = keyFor(role, peerId);
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.error(`Interview session: could not clear ${key}`, err);
  }
}

/** Removes saved sessions older than `SESSION_TTL_MS`; touches only keys with this feature's prefix. */
export function pruneExpiredSessions(now: number = Date.now()): void {
  try {
    const sessionKeys: string[] = [];
    for (let index = 0; index < localStorage.length; index++) {
      const key = localStorage.key(index);
      if (key !== null && key.startsWith(SESSION_KEY_PREFIX)) {
        sessionKeys.push(key);
      }
    }
    // Collected first: removing while iterating shifts the indices.
    const expiredKeys = sessionKeys.filter((key) => {
      const raw = localStorage.getItem(key);
      const entry = raw === null ? null : parseEntry(key, raw);
      return entry !== null && isExpired(entry, now);
    });
    expiredKeys.forEach((key) => localStorage.removeItem(key));
  } catch (err) {
    console.error('Interview session: could not prune expired sessions', err);
  }
}
