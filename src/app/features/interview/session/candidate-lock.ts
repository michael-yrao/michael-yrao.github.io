/** A candidate tab's lock on the problem it is being interviewed on: while it is live, this
 *  browser's own solution view for that problem stays closed. */
export const CANDIDATE_LOCK_KEY = 'po-interview-candidate';

const LOCK_TTL_HOURS = 24;
const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const MS_PER_SECOND = 1_000;
export const CANDIDATE_LOCK_TTL_MS = LOCK_TTL_HOURS * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND;

interface CandidateLock {
  readonly problem: number;
  readonly savedAt: number;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}

function isCandidateLock(value: unknown): value is CandidateLock {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return isPositiveInteger(record['problem']) && typeof record['savedAt'] === 'number' && Number.isFinite(record['savedAt']);
}

/** Storage is external input: bad JSON or a wrong shape is logged and read as nothing. */
function parseLock(raw: string): CandidateLock | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (isCandidateLock(value)) {
      return value;
    }
    console.error(`Candidate lock: ${CANDIDATE_LOCK_KEY} has the wrong shape`, value);
  } catch (err) {
    console.error(`Candidate lock: ${CANDIDATE_LOCK_KEY} is not valid JSON`, err);
  }
  return null;
}

/** Records that this browser is a candidate on `problem`; ignores anything but a positive integer. */
export function writeCandidateLock(problem: number, now: number = Date.now()): void {
  if (!isPositiveInteger(problem)) {
    return;
  }
  const lock: CandidateLock = { problem, savedAt: now };
  try {
    localStorage.setItem(CANDIDATE_LOCK_KEY, JSON.stringify(lock));
  } catch (err) {
    console.error(`Candidate lock: could not save ${CANDIDATE_LOCK_KEY}`, err);
  }
}

export function clearCandidateLock(): void {
  try {
    localStorage.removeItem(CANDIDATE_LOCK_KEY);
  } catch (err) {
    console.error(`Candidate lock: could not clear ${CANDIDATE_LOCK_KEY}`, err);
  }
}

/** The problem of a live, valid lock; null when there is none, it is malformed, or it has expired. */
export function lockedProblem(now: number = Date.now()): number | null {
  try {
    const raw = localStorage.getItem(CANDIDATE_LOCK_KEY);
    if (raw === null) {
      return null;
    }
    const lock = parseLock(raw);
    return lock === null || now - lock.savedAt > CANDIDATE_LOCK_TTL_MS ? null : lock.problem;
  } catch (err) {
    console.error(`Candidate lock: could not read ${CANDIDATE_LOCK_KEY}`, err);
    return null;
  }
}
