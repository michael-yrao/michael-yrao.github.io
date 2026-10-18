import { isRecord } from '../contracts/is-record';
import {
  PATTERN_SENSE_SCHEMA_VERSION,
  PatternSenseData,
  PatternSenseFamily,
} from '../models/pattern-sense.model';

const WEEK_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const VOCAB_HASH_PATTERN = /^[0-9a-f]{6}$/;
const PROBLEM_STRING_FIELDS = ['prompt', 'family', 'technique', 'cue'] as const;

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isFamily(value: unknown): value is PatternSenseFamily {
  if (!isRecord(value)) return false;
  return (
    isNonEmptyString(value['id']) &&
    isStringArray(value['techniques']) &&
    value['techniques'].length > 0
  );
}

function areFamiliesValid(families: unknown): families is readonly PatternSenseFamily[] {
  return Array.isArray(families) && families.every(isFamily);
}

/** A problem whose fields are all present and whose family/technique exist in `families`. */
function isProblemIn(families: readonly PatternSenseFamily[], value: unknown): boolean {
  if (!isRecord(value)) return false;
  if (typeof value['lcNumber'] !== 'number') return false;
  if (!PROBLEM_STRING_FIELDS.every((field) => isNonEmptyString(value[field]))) return false;
  if (!isStringArray(value['constraints'])) return false;

  const family = families.find((f) => f.id === value['family']);
  return family !== undefined && family.techniques.includes(value['technique'] as string);
}

/** Structural guard for the weekly Pattern Sense contract: schema version, a `YYYY-MM-DD`
 *  or null week (null only with no problems), a 6-lowercase-hex `vocabHash`, well-formed
 *  families, and every problem complete with its family in `families` and its technique in
 *  that family. Pure and Angular-free, matching `isBigOEntry`'s shape. */
export function isPatternSenseData(value: unknown): value is PatternSenseData {
  if (!isRecord(value)) return false;
  if (value['schemaVersion'] !== PATTERN_SENSE_SCHEMA_VERSION) return false;
  if (typeof value['generatedAt'] !== 'string') return false;

  const week = value['week'];
  if (week !== null && !(typeof week === 'string' && WEEK_PATTERN.test(week))) return false;

  const hash = value['vocabHash'];
  if (typeof hash !== 'string' || !VOCAB_HASH_PATTERN.test(hash)) return false;

  const families = value['families'];
  const problems = value['problems'];
  if (!areFamiliesValid(families) || !Array.isArray(problems)) return false;
  if (week === null && problems.length > 0) return false;

  return problems.every((problem) => isProblemIn(families, problem));
}
