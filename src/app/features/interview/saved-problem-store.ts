import { InterviewProblem, parseInterviewProblem } from './session/interview-problem';

/**
 * Problems an interviewer saved in this browser, one entry per problem under `po-interview-problem:<id>`. They never
 * leave the browser. Messages here name the key only, and caught errors are not passed on, since a parse error can
 * echo part of the text it read.
 */
export interface SavedProblem {
  readonly problem: InterviewProblem;
  readonly createdAt: number;
  readonly updatedAt: number;
}

/** What a list of saved problems shows for one. */
export interface SavedProblemSummary {
  readonly id: string;
  readonly title: string;
  readonly updatedAt: number;
}

export const SAVED_PROBLEM_KEY_PREFIX = 'po-interview-problem:';

function keyFor(id: string): string {
  return `${SAVED_PROBLEM_KEY_PREFIX}${id}`;
}

function isTimestamp(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Storage is external input: bad JSON or a wrong shape is logged (without the value) and read as nothing. */
function parseSaved(key: string, raw: string): SavedProblem | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value === 'object' && value !== null) {
      const record = value as Record<string, unknown>;
      const problem = parseInterviewProblem(record['problem']);
      if (problem !== null && isTimestamp(record['createdAt']) && isTimestamp(record['updatedAt'])) {
        return { problem, createdAt: record['createdAt'], updatedAt: record['updatedAt'] };
      }
    }
    console.error(`Saved problem: ${key} has the wrong shape`);
  } catch {
    console.error(`Saved problem: ${key} is not valid JSON`);
  }
  return null;
}

function readSaved(key: string): SavedProblem | null {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? null : parseSaved(key, raw);
  } catch {
    console.error(`Saved problem: could not read ${key}`);
    return null;
  }
}

function writeSaved(key: string, saved: SavedProblem): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(saved));
    return true;
  } catch {
    console.error(`Saved problem: could not save ${key}`);
    return false;
  }
}

/** The saved problem `id`, or null when there is none or it is malformed. */
export function loadSavedProblem(id: string): SavedProblem | null {
  return readSaved(keyFor(id));
}

/** Saves `problem` as a new saved problem: its id, or null when storage refuses the write (full, or blocked). */
export function createSavedProblem(problem: InterviewProblem, now: number): string | null {
  const id = crypto.randomUUID();
  return writeSaved(keyFor(id), { problem, createdAt: now, updatedAt: now }) ? id : null;
}

/** Replaces the problem of saved problem `id`, keeping `createdAt`; false for an unknown id or a refused write. */
export function updateSavedProblem(id: string, problem: InterviewProblem, now: number): boolean {
  const key = keyFor(id);
  const saved = readSaved(key);
  return saved !== null && writeSaved(key, { problem, createdAt: saved.createdAt, updatedAt: now });
}

export function removeSavedProblem(id: string): void {
  const key = keyFor(id);
  try {
    localStorage.removeItem(key);
  } catch {
    console.error(`Saved problem: could not remove ${key}`);
  }
}

function savedProblemKeys(): readonly string[] {
  const keys: string[] = [];
  for (let index = 0; index < localStorage.length; index++) {
    const key = localStorage.key(index);
    if (key !== null && key.startsWith(SAVED_PROBLEM_KEY_PREFIX)) {
      keys.push(key);
    }
  }
  return keys;
}

/** Every well-formed saved problem, newest `updatedAt` first; malformed entries are skipped. */
export function listSavedProblems(): readonly SavedProblemSummary[] {
  try {
    return savedProblemKeys()
      .flatMap((key) => {
        const saved = readSaved(key);
        return saved === null ? [] : [{ id: key.slice(SAVED_PROBLEM_KEY_PREFIX.length), title: saved.problem.title, updatedAt: saved.updatedAt }];
      })
      .sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    console.error('Saved problem: could not list the saved problems');
    return [];
  }
}
