import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

import { hasFamilyLabel } from '../src/app/core/data/family-labels';

const PATTERN_SENSE_ENV_VAR = 'PATTERN_SENSE_JSON';

interface PatternSenseFamily {
  readonly id: string;
}

/** Family ids of the pattern-sense contract, or a thrown message naming what is wrong. */
function readFamilyIds(path: string | undefined): string[] {
  if (!path) {
    throw new Error(
      `${PATTERN_SENSE_ENV_VAR} is not set — point it at a pattern-sense.json file ` +
        '(e.g. dashboard/pattern-sense.json fetched from cse-progress).',
    );
  }
  const parsed = JSON.parse(readFileSync(path, 'utf-8')) as { families?: PatternSenseFamily[] };
  if (!Array.isArray(parsed.families)) {
    throw new Error(`${PATTERN_SENSE_ENV_VAR} at "${path}" has no families[] array.`);
  }
  return parsed.families.map((family) => family.id);
}

describe('family labels', () => {
  it('has a display label for every family id in pattern-sense.json', () => {
    const ids = readFamilyIds(process.env[PATTERN_SENSE_ENV_VAR]);
    expect(ids.filter((id) => !hasFamilyLabel(id))).toEqual([]);
  });
});
