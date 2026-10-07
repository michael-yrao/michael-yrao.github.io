import { isRecord } from '../contracts/is-record';
import { Codec, CompareMode, EntryKind, PracticeCase, PracticeProblem } from '../models/practice.model';

export const COMPARE_MODES: readonly CompareMode[] = ['exact', 'unordered', 'unordered-nested'];
const ENTRY_KINDS: readonly EntryKind[] = ['method', 'ops', 'round-trip'];
const CODECS: readonly Codec[] = [
  'list-node',
  'list-node-cycle',
  'random-list',
  'tree-node',
  'tree-value',
  'graph-node',
  'number-inf',
];
/** Codecs that only decode a result; they can't build an argument. */
const RESULT_ONLY_CODECS: readonly Codec[] = ['number-inf'];

/** A well-formed entry: names, a known kind when present, and for 'round-trip' the two
 *  method names it chains. */
export function isPracticeEntry(value: unknown): boolean {
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

export function isPracticeCase(value: unknown, isOps: boolean): value is PracticeCase {
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

const EDGE_SOURCE_KEYS = ['edgesArg', 'matrixArg', 'adjArg'] as const;

function isAbsentOrArgIndex(value: unknown): boolean {
  return value === undefined || isArgIndex(value);
}

/** A graph figure has exactly one edge source (`edgesArg`, `matrixArg` or `adjArg`, an integer
 *  argument index), a boolean `directed`, and only the optional keys that source allows:
 *  `nodeCountArg` (integer or null) and `nodesArg` with `edgesArg`, boolean `oneBased` with
 *  `adjArg`; `highlight` is only 'expected'. */
function isValidGraphFigure(value: Record<string, unknown>): boolean {
  if (typeof value['directed'] !== 'boolean') return false;
  if (value['highlight'] !== undefined && value['highlight'] !== 'expected') return false;
  const sources = EDGE_SOURCE_KEYS.filter((key) => value[key] !== undefined);
  if (sources.length !== 1 || !isArgIndex(value[sources[0]])) return false;
  if (sources[0] === 'matrixArg' && value['directed'] !== false) return false;
  const isEdgeList = sources[0] === 'edgesArg';
  const nodeCountArg = value['nodeCountArg'];
  const hasEdgeListKeys = (nodeCountArg !== undefined && nodeCountArg !== null) || value['nodesArg'] !== undefined;
  if (!isEdgeList && hasEdgeListKeys) return false;
  if (sources[0] !== 'adjArg' && value['oneBased'] !== undefined) return false;
  const oneBased = value['oneBased'];
  return (
    (nodeCountArg === null || isAbsentOrArgIndex(nodeCountArg)) &&
    isAbsentOrArgIndex(value['nodesArg']) &&
    (oneBased === undefined || typeof oneBased === 'boolean')
  );
}

/** An absent or null `figure` is valid (no diagram); a present one must be a well-formed
 *  graph (see `isValidGraphFigure`) or grid (integer `gridArg`). */
export function isValidFigure(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (!isRecord(value)) return false;
  if (value['kind'] === 'grid') return isArgIndex(value['gridArg']);
  return value['kind'] === 'graph' && isValidGraphFigure(value);
}

/** An absent or null `result` is valid (compare the return); a present one is `return`, or
 *  `arg` / `arg-prefix` with an integer argument index. */
export function isValidResult(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (!isRecord(value)) return false;
  if (value['kind'] === 'return') return true;
  if (value['kind'] !== 'arg' && value['kind'] !== 'arg-prefix') return false;
  return isArgIndex(value['index']);
}

function isCodecOrNull(value: unknown): boolean {
  return value === undefined || value === null || CODECS.includes(value as Codec);
}

function isArgCodecOrNull(value: unknown): boolean {
  return isCodecOrNull(value) && !RESULT_ONLY_CODECS.includes(value as Codec);
}

/** An absent or null `types` is valid (plain JSON); a present one has an `args` array of known
 *  codecs or nulls and a known-codec-or-null `result`. */
export function isValidTypes(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (!isRecord(value)) return false;
  const args = value['args'];
  return Array.isArray(args) && args.every(isArgCodecOrNull) && isCodecOrNull(value['result']);
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
