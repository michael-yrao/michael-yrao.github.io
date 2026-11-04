import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

import { loadAllAlgorithms } from '../src/app/core/data/algorithms.index';
import { metaDrift } from '../src/app/core/data/meta-drift';
import { PracticeData, PracticeProblem } from '../src/app/core/models/practice.model';
import { isPracticeProblem } from '../src/app/core/practice/practice-validation';

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

describe('meta', () => {
  it('every steps meta matches practice.json on title and difficulty', async () => {
    const drifts = metaDrift(await loadAllAlgorithms(), loadPracticeProblems());
    for (const drift of drifts) {
      console.error(`✗ ${drift.lcNumber} ${drift.field}: site "${drift.site}" vs owner "${drift.owner}"`);
    }
    expect(drifts).toEqual([]);
  });
});
