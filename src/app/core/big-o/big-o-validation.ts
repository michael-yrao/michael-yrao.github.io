import { Difficulty } from '../models/algorithm.model';
import { BigOEntry } from '../models/big-o.model';
import { isShowcaseSegment } from '../showcase/showcase-validation';

const DIFFICULTIES: readonly Difficulty[] = ['Easy', 'Medium', 'Hard'];
const OPTION_COUNT = 4;

const ENTRY_STRING_FIELDS: readonly (keyof BigOEntry)[] = [
  'key',
  'file',
  'symbol',
  'category',
  'time',
  'space',
];
const ENTRY_NULLABLE_STRING_FIELDS: readonly (keyof BigOEntry)[] = [
  'variant',
  'title',
  'url',
  'attemptDate',
  'note',
  'whyTime',
  'whySpace',
];

function isStringOrNull(v: unknown): boolean {
  return v === null || typeof v === 'string';
}

function hasValidStringFields(entry: Partial<BigOEntry>): boolean {
  return ENTRY_STRING_FIELDS.every((field) => typeof entry[field] === 'string');
}

function hasValidNullableFields(entry: Partial<BigOEntry>): boolean {
  return ENTRY_NULLABLE_STRING_FIELDS.every((field) => isStringOrNull(entry[field]));
}

function isDifficultyOrNull(value: unknown): boolean {
  return value === null || DIFFICULTIES.includes(value as Difficulty);
}

/** Exactly `OPTION_COUNT` string options that always include the correct answer — the
 *  invariant `export_bigo.py`'s `options_for` guarantees on the cse-progress side. */
function isOptionSet(options: unknown, answer: unknown): boolean {
  if (!Array.isArray(options) || options.length !== OPTION_COUNT) return false;
  if (!options.every((opt): opt is string => typeof opt === 'string')) return false;
  return typeof answer === 'string' && options.includes(answer);
}

/** Structural guard for one Big-O trainer entry: string `key`/`file`/`symbol`/`category`/
 *  `time`/`space`, number `lcNumber`, the nullable string fields each string-or-null, a valid
 *  or null `difficulty`, boolean `isMiss`, `timeOptions`/`spaceOptions` each exactly 4 strings
 *  containing the correct answer, and every segment structurally valid (reusing
 *  `isShowcaseSegment`). Pure and Angular-free, matching `isShowcaseEntry`'s shape. */
export function isBigOEntry(value: unknown): value is BigOEntry {
  if (typeof value !== 'object' || value === null) return false;
  const entry = value as Partial<BigOEntry>;

  if (!hasValidStringFields(entry)) return false;
  if (typeof entry.lcNumber !== 'number') return false;
  if (!hasValidNullableFields(entry)) return false;
  if (!isDifficultyOrNull(entry.difficulty)) return false;
  if (typeof entry.isMiss !== 'boolean') return false;
  if (!isOptionSet(entry.timeOptions, entry.time)) return false;
  if (!isOptionSet(entry.spaceOptions, entry.space)) return false;
  if (!Array.isArray(entry.segments)) return false;

  return entry.segments.every(isShowcaseSegment);
}
