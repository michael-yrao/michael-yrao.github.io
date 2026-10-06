import { Debrief, DebriefSummary, parseEndSummary } from './debrief';

export const DEBRIEF_KEY_PREFIX = 'po-interview-debrief:';
/** The newest this many debriefs are kept; saving another drops the oldest. */
export const DEBRIEFS_MAX = 20;

function keyFor(sessionId: string): string {
  return `${DEBRIEF_KEY_PREFIX}${sessionId}`;
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function parseLastRun(value: unknown): Debrief['lastRun'] | undefined {
  if (value === null) {
    return null;
  }
  if (typeof value !== 'object') {
    return undefined;
  }
  const { passed, total } = value as Record<string, unknown>;
  return isCount(passed) && isCount(total) ? { passed, total } : undefined;
}

/** A freshly built debrief, or null when `value` is not one. Storage is external input. */
function parseDebrief(value: unknown): Debrief | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const { sessionId, role, title, source, finalCode } = record;
  const summary = parseEndSummary(record['summary']);
  const lastRun = parseLastRun(record['lastRun']);
  const isSourceValid = source === null || isCount(source);
  const isValid =
    typeof sessionId === 'string' &&
    (role === 'candidate' || role === 'interviewer') &&
    typeof title === 'string' &&
    typeof finalCode === 'string' &&
    isSourceValid &&
    summary !== null &&
    lastRun !== undefined;
  return isValid ? { sessionId, role, title, source, summary, finalCode, lastRun } : null;
}

/** Reads and validates one key; bad JSON or a wrong shape is logged by key and kind only, and read as nothing. */
function readEntry(key: string): Debrief | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) {
      return null;
    }
    const debrief = parseDebrief(JSON.parse(raw));
    if (debrief === null) {
      console.error(`Interview debrief: ${key} has the wrong shape`);
    }
    return debrief;
  } catch {
    console.error(`Interview debrief: could not read ${key}`);
    return null;
  }
}

function debriefKeys(): readonly string[] {
  const keys: string[] = [];
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index);
    if (key !== null && key.startsWith(DEBRIEF_KEY_PREFIX)) {
      keys.push(key);
    }
  }
  return keys;
}

function summaryOf(debrief: Debrief): DebriefSummary {
  return { sessionId: debrief.sessionId, title: debrief.title, role: debrief.role, endedAt: debrief.summary.endedAt };
}

/** Newest first. Malformed entries are skipped. */
export function listDebriefs(): readonly DebriefSummary[] {
  try {
    return debriefKeys()
      .map((key) => readEntry(key))
      .filter((debrief): debrief is Debrief => debrief !== null)
      .map(summaryOf)
      .sort((a, b) => b.endedAt - a.endedAt);
  } catch {
    console.error('Interview debrief: could not list the saved debriefs');
    return [];
  }
}

export function loadDebrief(sessionId: string): Debrief | null {
  return readEntry(keyFor(sessionId));
}

export function removeDebrief(sessionId: string): void {
  const key = keyFor(sessionId);
  try {
    localStorage.removeItem(key);
  } catch {
    console.error(`Interview debrief: could not remove ${key}`);
  }
}

/** Saves `debrief`, then drops the oldest beyond `DEBRIEFS_MAX`. False when storage refused the write. */
export function saveDebrief(debrief: Debrief): boolean {
  const key = keyFor(debrief.sessionId);
  try {
    localStorage.setItem(key, JSON.stringify(debrief));
  } catch {
    console.error(`Interview debrief: could not save ${key}`);
    return false;
  }
  listDebriefs()
    .slice(DEBRIEFS_MAX)
    .forEach((old) => removeDebrief(old.sessionId));
  return true;
}
