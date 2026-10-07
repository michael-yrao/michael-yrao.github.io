import { isRecord } from '../../../core/contracts/is-record';
import type {
  CompareMode,
  PracticeCase,
  PracticeEntry,
  PracticeFigure,
  ResultSpec,
  TypeSpec,
} from '../../../core/models/practice.model';
import {
  COMPARE_MODES,
  isPracticeCase,
  isPracticeEntry,
  isValidFigure,
  isValidResult,
  isValidTypes,
} from '../../../core/practice/practice-validation';

/** The longest problem title the wire accepts. */
export const TITLE_MAX_LENGTH = 120;
/** The longest problem statement the wire accepts. */
export const STATEMENT_MAX_LENGTH = 20_000;
export const STARTER_MAX_LENGTH = 20_000;
export const CASES_MAX = 100;
export const PROBLEM_JSON_MAX_LENGTH = 100_000;

/** An interviewer's problem; the text fields may be empty. */
export interface InterviewProblem {
  readonly title: string;
  readonly statement: string;
  readonly starter: string;
  readonly entry: PracticeEntry | null;
  readonly compare: CompareMode;
  readonly cases: readonly PracticeCase[];
  readonly result: ResultSpec | null;
  readonly types: TypeSpec | null;
  readonly figure: PracticeFigure | null;
  /** The site problem it was imported from. */
  readonly source: number | null;
}

/** A problem's JSON text with its revision and the host's signature over it. */
export interface SignedProblem {
  readonly rev: number;
  readonly json: string;
  readonly signature: string;
}

function isTextWithin(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.length <= max;
}

/** `null`, or a value `isValid` accepts; an absent (undefined) value is neither. */
function isNullOr(value: unknown, isValid: (value: unknown) => boolean): boolean {
  return value === null || (value !== undefined && isValid(value));
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}

function isCompareMode(value: unknown): value is CompareMode {
  return COMPARE_MODES.includes(value as CompareMode);
}

/** Ops and design entries carry `ops` in every case, so the case check depends on the entry's kind. */
function areCasesValid(cases: unknown, entry: unknown): cases is readonly PracticeCase[] {
  if (!Array.isArray(cases) || cases.length > CASES_MAX) {
    return false;
  }
  const isOps = isRecord(entry) && entry['kind'] === 'ops';
  return cases.every((testCase) => isPracticeCase(testCase, isOps));
}

/**
 * A problem from external input (the wire, storage, an import), or null when any field is the wrong shape or
 * over its cap. The result is a new object with the known keys only.
 */
export function parseInterviewProblem(value: unknown): InterviewProblem | null {
  if (!isRecord(value)) {
    return null;
  }
  const { title, statement, starter, entry, compare, cases, result, types, figure, source } = value;
  const isValid =
    isTextWithin(title, TITLE_MAX_LENGTH) &&
    isTextWithin(statement, STATEMENT_MAX_LENGTH) &&
    isTextWithin(starter, STARTER_MAX_LENGTH) &&
    isNullOr(entry, isPracticeEntry) &&
    isCompareMode(compare) &&
    areCasesValid(cases, entry) &&
    isNullOr(result, isValidResult) &&
    isNullOr(types, isValidTypes) &&
    isNullOr(figure, isValidFigure) &&
    (source === null || isPositiveInteger(source));
  if (!isValid) {
    return null;
  }
  const problem = { title, statement, starter, entry, compare, cases, result, types, figure, source } as InterviewProblem;
  return JSON.stringify(problem).length <= PROBLEM_JSON_MAX_LENGTH ? problem : null;
}
