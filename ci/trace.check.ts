import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

import { loadAllAlgorithms } from '../src/app/core/data/algorithms.index';
import { PracticeData, PracticeProblem } from '../src/app/core/models/practice.model';
import { isPracticeProblem } from '../src/app/core/practice/practice-validation';
import { Trace, traceMismatch } from './trace-drift';

const PRACTICE_JSON_ENV_VAR = 'PRACTICE_JSON';

/** Reads and validates the fetched practice.json, throwing a message naming what is wrong. */
function loadPracticeProblems(): readonly PracticeProblem[] {
  const path = process.env[PRACTICE_JSON_ENV_VAR];
  if (!path) {
    throw new Error(`${PRACTICE_JSON_ENV_VAR} is not set — point it at a fetched practice.json.`);
  }
  let data: PracticeData;
  try {
    data = JSON.parse(readFileSync(path, 'utf-8')) as PracticeData;
  } catch (err) {
    throw new Error(`Could not read ${PRACTICE_JSON_ENV_VAR} at "${path}": ${(err as Error).message}`);
  }
  if (!Array.isArray(data.problems)) {
    throw new Error(`${PRACTICE_JSON_ENV_VAR} at "${path}" has no problems[] array.`);
  }
  const badIndex = data.problems.findIndex((problem) => !isPracticeProblem(problem));
  if (badIndex !== -1) {
    throw new Error(`${PRACTICE_JSON_ENV_VAR} at "${path}" has a malformed problem (index ${badIndex}).`);
  }
  return data.problems;
}

const problemOf = (overrides: Partial<PracticeProblem>): PracticeProblem => ({
  number: 1,
  title: 'T',
  url: null,
  statement: null,
  stub: '',
  entry: { className: 'Solution', method: 'f' },
  compare: 'exact',
  cases: [{ args: [[1, 2], 3], expected: [0, 1], example: true }],
  ...overrides,
});

describe('traceMismatch', () => {
  const trace: Trace = { args: [[1, 2], 3], expected: [0, 1] };
  it.each([
    ['found', trace, problemOf({}), null],
    [
      'args mismatch',
      { ...trace, args: [[1, 2], 4] },
      problemOf({}),
      'args are not a case of the practice spec',
    ],
    [
      'expected mismatch under an unordered compare mode',
      { ...trace, expected: [0, 2] },
      problemOf({ compare: 'unordered' }),
      'expected differs from the spec case with these args',
    ],
    [
      'ops problem exempt',
      { args: [['x']], expected: 'y' },
      problemOf({ entry: { className: 'C', method: 'm', kind: 'ops' } }),
      null,
    ],
  ])('%s', (_name, input, problem, expected) => {
    expect(traceMismatch(input, problem)).toBe(expected);
  });
});

describe('trace', () => {
  it('every traced variant is a case of its practice spec', async () => {
    const problems = loadPracticeProblems();
    const failures: string[] = [];
    for (const meta of await loadAllAlgorithms()) {
      const problem = problems.find((p) => p.number === meta.lcNumber);
      for (const variant of meta.solutions) {
        if (variant.trace === undefined) continue;
        const reason = problem
          ? traceMismatch(variant.trace, problem)
          : 'no practice problem for this lc';
        if (reason !== null) {
          failures.push(
            `lc ${meta.lcNumber} ${variant.variant}: ${reason}; args ${JSON.stringify(variant.trace.args)}`,
          );
        }
      }
    }
    for (const failure of failures) console.error(`✗ ${failure}`);
    expect(failures).toEqual([]);
  });
});
