import { isRecord } from '../contracts/is-record';
import { ProgressData, ProgressSummary } from '../models/progress.model';

/** Object-valued fields every summary and full contract must carry; checked one level deep. */
const REQUIRED_RECORD_FIELDS: readonly (keyof ProgressSummary)[] = ['totals', 'pipeline', 'streak'];

/** Array-valued fields every summary must carry. */
const REQUIRED_ARRAY_FIELDS: readonly (keyof ProgressSummary)[] = ['badges'];

/** Structural guard for a progress summary body: a numeric `schemaVersion` plus the
 *  `totals`/`pipeline`/`streak` objects and the `badges` array the landing reads
 *  unconditionally. Optional sub-objects are not walked. Pure and Angular-free. */
export function isProgressSummary(value: unknown): value is ProgressSummary {
  if (!isRecord(value)) return false;
  if (typeof value['schemaVersion'] !== 'number') return false;
  if (!REQUIRED_RECORD_FIELDS.every((field) => isRecord(value[field]))) return false;
  return REQUIRED_ARRAY_FIELDS.every((field) => Array.isArray(value[field]));
}

/** A full progress body: everything a summary carries, plus the `problems[]` array. */
export function isProgressFull(value: unknown): value is ProgressData {
  if (!isProgressSummary(value)) return false;
  return Array.isArray((value as { problems?: unknown }).problems);
}
