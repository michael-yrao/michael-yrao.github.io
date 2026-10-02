import { CompareMode, PracticeCase, PracticeProblem } from '../models/practice.model';

const COMPARE_MODES: readonly CompareMode[] = ['exact', 'unordered', 'unordered-nested'];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isPracticeEntry(value: unknown): boolean {
  if (!isRecord(value)) return false;
  return typeof value['className'] === 'string' && typeof value['method'] === 'string';
}

function isPracticeCase(value: unknown): value is PracticeCase {
  if (!isRecord(value)) return false;
  if (!Array.isArray(value['args'])) return false;
  if (!('expected' in value)) return false; // null is a legal expected value
  return typeof value['example'] === 'boolean';
}

function isStringOrNull(value: unknown): boolean {
  return value === null || typeof value === 'string';
}

function isArgIndex(value: unknown): boolean {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

/** An absent or null `figure` is valid (no diagram); a present one must be a well-formed
 *  graph (boolean `directed`, integer `edgesArg`, integer-or-null `nodeCountArg`) or grid
 *  (integer `gridArg`). */
function isValidFigure(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (!isRecord(value)) return false;
  if (value['kind'] === 'grid') return isArgIndex(value['gridArg']);
  if (value['kind'] !== 'graph') return false;
  const nodeCountArg = value['nodeCountArg'];
  return (
    typeof value['directed'] === 'boolean' &&
    isArgIndex(value['edgesArg']) &&
    (nodeCountArg === null || nodeCountArg === undefined || isArgIndex(nodeCountArg))
  );
}

/** Structural guard for one practice problem: number, title, nullable url, statement, stub,
 *  entry {className, method}, a known compare mode, and every case (`args` array, `expected`
 *  present, boolean `example`). Pure and Angular-free, like `isShowcaseEntry`. */
export function isPracticeProblem(value: unknown): value is PracticeProblem {
  if (!isRecord(value)) return false;

  if (typeof value['number'] !== 'number') return false;
  if (typeof value['title'] !== 'string') return false;
  if (!isStringOrNull(value['url'])) return false;
  if (typeof value['statement'] !== 'string') return false;
  if (typeof value['stub'] !== 'string') return false;
  if (!isPracticeEntry(value['entry'])) return false;
  if (!COMPARE_MODES.includes(value['compare'] as CompareMode)) return false;
  if (!isValidFigure(value['figure'])) return false;

  const cases = value['cases'];
  return Array.isArray(cases) && cases.every(isPracticeCase);
}
