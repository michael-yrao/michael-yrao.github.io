import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

import { computeGroundedness } from '../src/app/core/showcase/groundedness';
import { isShowcaseEntry } from '../src/app/core/showcase/showcase-validation';
import { ALL_ALGORITHMS } from '../src/app/core/data/algorithms.data';
import {
  SHOWCASE_SCHEMA_VERSION,
  ShowcaseData,
  ShowcaseEntry,
} from '../src/app/core/models/showcase.model';

const SHOWCASE_JSON_ENV_VAR = 'SHOWCASE_JSON';

/** Reads the path SHOWCASE_JSON points at, or throws a message naming exactly what's wrong —
 *  this check runs unattended in CI, so a vague stack trace isn't good enough. */
function readShowcaseFile(path: string | undefined): string {
  if (!path) {
    throw new Error(
      `${SHOWCASE_JSON_ENV_VAR} is not set — point it at a showcase.json file ` +
        '(e.g. dashboard/showcase.json fetched from cse-progress).',
    );
  }
  try {
    return readFileSync(path, 'utf-8');
  } catch (err) {
    throw new Error(
      `Could not read ${SHOWCASE_JSON_ENV_VAR} at "${path}": ${(err as Error).message}`,
    );
  }
}

/** Names the first structurally-invalid entry by its own `key` (falling back to its array
 *  index, when even the key didn't parse) — mirrors `ShowcaseService`'s `malformedEntryMessage`
 *  so the CI boundary and the runtime service report a malformed contract the same way.
 *  Reuses `isShowcaseEntry` (the shared pure guard) rather than re-deriving the same checks. */
function firstInvalidEntryLabel(entries: readonly unknown[]): string | null {
  const badIndex = entries.findIndex((entry) => !isShowcaseEntry(entry));
  if (badIndex === -1) return null;
  const bad = entries[badIndex] as Partial<ShowcaseEntry> | null;
  const key = bad && typeof bad === 'object' && typeof bad.key === 'string' ? bad.key : null;
  return key ?? `index ${badIndex}`;
}

/** Parses and validates the contract's shape/version/entries at the boundary, before anything
 *  else trusts it. Validation lives here rather than in `computeGroundedness`, which is pure
 *  and assumes a well-formed `ShowcaseData`. */
function parseShowcaseData(raw: string, path: string): ShowcaseData {
  let data: ShowcaseData;
  try {
    data = JSON.parse(raw) as ShowcaseData;
  } catch (err) {
    throw new Error(
      `${SHOWCASE_JSON_ENV_VAR} at "${path}" is not valid JSON: ${(err as Error).message}`,
    );
  }
  if (data.schemaVersion !== SHOWCASE_SCHEMA_VERSION) {
    throw new Error(
      `${SHOWCASE_JSON_ENV_VAR} at "${path}" has schemaVersion ${data.schemaVersion}; ` +
        `this checker speaks v${SHOWCASE_SCHEMA_VERSION}.`,
    );
  }
  if (!Array.isArray(data.entries)) {
    throw new Error(`${SHOWCASE_JSON_ENV_VAR} at "${path}" has no entries[] array.`);
  }
  const invalidLabel = firstInvalidEntryLabel(data.entries);
  if (invalidLabel !== null) {
    throw new Error(
      `${SHOWCASE_JSON_ENV_VAR} at "${path}" has a malformed entry (${invalidLabel}).`,
    );
  }
  return data;
}

function loadShowcaseData(): ShowcaseData {
  const path = process.env[SHOWCASE_JSON_ENV_VAR];
  return parseShowcaseData(readShowcaseFile(path), path ?? '');
}

describe('groundedness', () => {
  it('every migrated variant is grounded in the fetched showcase contract', () => {
    const data = loadShowcaseData();
    const report = computeGroundedness(ALL_ALGORITHMS, data);

    for (const failure of report.failures) {
      console.error(`✗ ${failure.key}: ${failure.reason}`);
    }
    console.log(
      `grounded ${report.grounded} / total ${report.total}, legacy ${report.legacy}, ` +
        `failures ${report.failures.length}, ratio ${report.ratio}`,
    );

    // Post-cutover (plan B8/D): every steps file carries a `variant` id and has a published
    // showcase entry, so a legacy (unmigrated) variant is no longer expected — it's a failure.
    expect(report.failures).toEqual([]);
    expect(report.legacy).toBe(0);
    expect(report.ratio).toBe(1);
  });
});
