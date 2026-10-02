import { Codec, CompareMode, EntryKind, PracticeCase, PracticeProblem } from '../models/practice.model';

const COMPARE_MODES: readonly CompareMode[] = ['exact', 'unordered', 'unordered-nested'];
const ENTRY_KINDS: readonly EntryKind[] = ['method', 'ops', 'round-trip'];
const CODECS: readonly Codec[] = [
  'list-node',
  'list-node-cycle',
  'random-list',
  'tree-node',
  'tree-value',
  'graph-node',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** A well-formed entry: names, a known kind when present, and for 'round-trip' the two
 *  method names it chains. */
function isPracticeEntry(value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (typeof value['className'] !== 'string' || typeof value['method'] !== 'string') return false;
  const kind = value['kind'];
  if (kind === undefined) return true;
  if (!ENTRY_KINDS.includes(kind as EntryKind)) return false;
  if (kind !== 'round-trip') return true;
  return typeof value['encode'] === 'string' && typeof value['decode'] === 'string';
}

/** An 'ops' case: operation names, and one argument list per operation. */
function hasOpsShape(value: Record<string, unknown>): boolean {
  const { ops, args } = value;
  if (!Array.isArray(ops) || !ops.every((op) => typeof op === 'string')) return false;
  return Array.isArray(args) && args.length === ops.length && args.every(Array.isArray);
}

function isPracticeCase(value: unknown, isOps: boolean): value is PracticeCase {
  if (!isRecord(value)) return false;
  if (!Array.isArray(value['args'])) return false;
  if (!('expected' in value)) return false; // null is a legal expected value
  if (isOps && !hasOpsShape(value)) return false;
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

/** An absent or null `result` is valid (compare the return); a present one is `return`, or
 *  `arg` / `arg-prefix` with an integer argument index. */
function isValidResult(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (!isRecord(value)) return false;
  if (value['kind'] === 'return') return true;
  if (value['kind'] !== 'arg' && value['kind'] !== 'arg-prefix') return false;
  return isArgIndex(value['index']);
}

function isCodecOrNull(value: unknown): boolean {
  return value === undefined || value === null || CODECS.includes(value as Codec);
}

/** An absent or null `types` is valid (plain JSON); a present one has an `args` array of known
 *  codecs or nulls and a known-codec-or-null `result`. */
function isValidTypes(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (!isRecord(value)) return false;
  const args = value['args'];
  return Array.isArray(args) && args.every(isCodecOrNull) && isCodecOrNull(value['result']);
}

/** Structural guard for one practice problem: number, title, nullable url, nullable statement,
 *  stub, entry {className, method, optional kind/encode/decode}, a known compare mode, optional
 *  `result` and `types`, and every case (`args` array, `expected` present, boolean `example`;
 *  an 'ops' entry's cases also carry `ops`). Pure and Angular-free, like `isShowcaseEntry`. */
export function isPracticeProblem(value: unknown): value is PracticeProblem {
  if (!isRecord(value)) return false;

  if (typeof value['number'] !== 'number') return false;
  if (typeof value['title'] !== 'string') return false;
  if (!isStringOrNull(value['url'])) return false;
  if (!isStringOrNull(value['statement'])) return false;
  if (typeof value['stub'] !== 'string') return false;
  if (!isPracticeEntry(value['entry'])) return false;
  if (!COMPARE_MODES.includes(value['compare'] as CompareMode)) return false;
  if (!isValidFigure(value['figure'])) return false;
  if (!isValidResult(value['result'])) return false;
  if (!isValidTypes(value['types'])) return false;

  const cases = value['cases'];
  const isOps = (value['entry'] as Record<string, unknown>)['kind'] === 'ops';
  return Array.isArray(cases) && cases.every((testCase) => isPracticeCase(testCase, isOps));
}
