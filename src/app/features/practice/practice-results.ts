import { PracticeCase } from '../../core/models/practice.model';
import { CaseResult, CaseVerdict } from '../../core/runner/runner.model';

export const PASS_MARK = '✓';
export const FAIL_MARK = '✗';

const VERDICT_WORDS: Readonly<Partial<Record<CaseVerdict, string>>> = {
  'time-limit': 'Time limit',
  recursion: 'Recursion limit',
  error: 'Error',
};

/** One drawn result row: everything the template prints, already formatted. */
export interface ResultRow {
  readonly index: number;
  readonly isPass: boolean;
  readonly mark: string;
  /** Status word beside the mark; null for a plain pass or fail. */
  readonly word: string | null;
  readonly input: string;
  readonly expected: string;
  /** The `Got` value, whenever the case returned one (a pass included). */
  readonly got: string | null;
  /** The Python error text, only for an error or recursion verdict that carries one. */
  readonly errorMessage: string | null;
  readonly stdout: string;
}

/** `JSON.stringify` that never yields `undefined` (a bare `undefined` has no JSON form). */
function toJson(value: unknown): string {
  return JSON.stringify(value) ?? String(value);
}

/** An argument list as it reads in a call: `1, [2, 3]`. */
function callArgs(args: readonly unknown[]): string {
  return args.map(toJson).join(', ');
}

/** The case's input: one line per op, `name(args)`, for an ops case; else one line per argument. */
function inputText(testCase: PracticeCase): string {
  const { ops, args } = testCase;
  if (!ops) return args.map(toJson).join('\n');
  return ops.map((name, index) => `${name}(${callArgs((args[index] as readonly unknown[]) ?? [])})`).join('\n');
}

function gotText(result: CaseResult): string | null {
  const outcome = result.outcome;
  if (outcome?.status !== 'ok') return null;
  return outcome.hasJson ? toJson(outcome.gotJson) : outcome.gotRepr;
}

function errorText(result: CaseResult): string | null {
  const outcome = result.outcome;
  if (result.verdict === 'fail' || outcome?.status !== 'error') return null;
  return outcome.message;
}

export function toResultRow(result: CaseResult, cases: readonly PracticeCase[]): ResultRow {
  const testCase = cases[result.index];
  const isPass = result.verdict === 'pass';
  return {
    index: result.index,
    isPass,
    mark: isPass ? PASS_MARK : FAIL_MARK,
    word: VERDICT_WORDS[result.verdict] ?? null,
    input: testCase ? inputText(testCase) : '',
    expected: testCase ? toJson(testCase.expected) : '',
    got: gotText(result),
    errorMessage: errorText(result),
    stdout: result.outcome?.stdout ?? '',
  };
}

/** The case to show first: the first failure, else the first case (also 0 for an empty list). */
export function defaultCaseIndex(rows: readonly ResultRow[]): number {
  const firstFailure = rows.findIndex((row) => !row.isPass);
  return firstFailure === -1 ? 0 : firstFailure;
}

export function countPassed(results: readonly CaseResult[]): number {
  return results.filter((result) => result.verdict === 'pass').length;
}
