import { attemptNumberFromPath, parseAttemptFile } from '../practice/practice-attempt';
import type { RepoRef } from './github-file.service';

/** localStorage key for the provisional reps whose save has not been confirmed. */
export const PROVISIONAL_STORAGE_KEY = 'po-provisional-reps';

/** A passing run kept until its provisional save lands: where it goes, what it holds, and when it passed. */
export interface ProvisionalRecord {
  readonly ref: RepoRef;
  readonly path: string;
  readonly content: string;
  /** ISO timestamp of the passing run. */
  readonly date: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value !== '';
}

function isRepoRef(value: unknown): value is RepoRef {
  return isRecord(value) && isNonEmptyString(value['owner']) && isNonEmptyString(value['repo']) && isNonEmptyString(value['branch']);
}

/** A record is kept only when its path names a problem and its content is a provisional attempt file. */
function parseRecord(value: unknown): ProvisionalRecord | null {
  if (!isRecord(value)) return null;
  const { ref, path, content, date } = value;
  if (!isRepoRef(ref) || !isNonEmptyString(path) || !isNonEmptyString(content) || !isNonEmptyString(date)) return null;
  if (attemptNumberFromPath(path.split('/').pop() ?? '') === null) return null;
  const attempt = parseAttemptFile(content);
  if (attempt === null || !attempt.complete || attempt.rating !== null) return null;
  return { ref: { owner: ref.owner, repo: ref.repo, branch: ref.branch }, path, content, date };
}

function readRaw(): unknown[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(PROVISIONAL_STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return []; // unreadable or blocked storage: no records
  }
}

function write(records: readonly ProvisionalRecord[]): void {
  try {
    localStorage.setItem(PROVISIONAL_STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.error('Provisional rep: could not write the fallback record', err);
  }
}

/** The stored records; a malformed one is dropped, and the cleaned list is written back. */
export function loadRecords(): readonly ProvisionalRecord[] {
  const raw = readRaw();
  const records = raw.map(parseRecord).filter((record): record is ProvisionalRecord => record !== null);
  if (records.length !== raw.length) write(records);
  return records;
}

/** Stores `record`, replacing any earlier record for the same path. */
export function addRecord(record: ProvisionalRecord): void {
  write([...loadRecords().filter((existing) => existing.path !== record.path), record]);
}

/** Drops the record for `path`; nothing is written when there is none. */
export function removeRecord(path: string): void {
  const records = loadRecords();
  if (!records.some((record) => record.path === path)) return;
  write(records.filter((record) => record.path !== path));
}
