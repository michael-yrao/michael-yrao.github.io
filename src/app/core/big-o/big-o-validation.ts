import { Difficulty } from '../models/algorithm.model';
import { BigOEntry } from '../models/big-o.model';
import { isShowcaseSegment } from '../showcase/showcase-validation';

const DIFFICULTIES: readonly Difficulty[] = ['Easy', 'Medium', 'Hard'];
const OPTION_COUNT = 4;

const ENTRY_STRING_FIELDS: readonly (keyof BigOEntry)[] = [
  'key',
  'category',
  'time',
  'space',
];
const ENTRY_NULLABLE_STRING_FIELDS: readonly (keyof BigOEntry)[] = [
  'file',
  'symbol',
  'variant',
  'title',
  'url',
  'attemptDate',
  'note',
  'whyTime',
  'whySpace',
];

/** The label pool: a non-empty array of strings. */
export function isBigOPool(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.length > 0 && value.every((label) => typeof label === 'string');
}

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

function isStringArray(value: unknown): boolean {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isStringRecord(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.values(value).every((meaning) => typeof meaning === 'string')
  );
}

/** The practice-page fields older payloads lack: each absent or well-formed. */
function hasValidPracticeFields(entry: Partial<BigOEntry>): boolean {
  if (entry.variables !== undefined && !isStringRecord(entry.variables)) return false;
  if (entry.timeChoices !== undefined && !isStringArray(entry.timeChoices)) return false;
  return entry.spaceChoices === undefined || isStringArray(entry.spaceChoices);
}

/** Structural guard for one Big-O trainer entry: string `key`/`category`/`time`/`space`,
 *  number `lcNumber`, the nullable string fields (including `file`/`symbol`, null for a
 *  reference-only entry) each string-or-null, a valid or null `difficulty`, boolean
 *  `isMiss`, `timeOptions`/`spaceOptions` each exactly 4 strings containing the correct
 *  answer, `variables`/`timeChoices`/`spaceChoices` absent or well-formed, and every
 *  segment structurally valid (reusing `isShowcaseSegment`; none is fine). The three
 *  practice fields may be absent on the wire — `normalizeBigOEntry` fills them. Pure and
 *  Angular-free, matching `isShowcaseEntry`'s shape. */
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
  if (!hasValidPracticeFields(entry)) return false;
  if (!Array.isArray(entry.segments)) return false;

  return entry.segments.every(isShowcaseSegment);
}

/** A copy of a validated entry with the practice-page fields defaulted (`{}` / `[]`) when
 *  an older payload omits them, so consumers never branch on undefined. */
export function normalizeBigOEntry(entry: BigOEntry): BigOEntry {
  return {
    ...entry,
    variables: entry.variables ?? {},
    timeChoices: entry.timeChoices ?? [],
    spaceChoices: entry.spaceChoices ?? [],
  };
}
