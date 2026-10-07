import { CATEGORY_LABELS } from '../models/algorithm.model';
import { ALGORITHM_INDEX } from './algorithms.index';

// Counts come from `node scripts/gen-registry.mjs` ("123 entries, 28 without visualization"):
// 28 entries are stubs whose every generateSteps is literally `() => []`.
const EXPECTED_ENTRIES = 123;
const EXPECTED_STUBS = 28;

const categoryIds = Object.keys(CATEGORY_LABELS);

describe('ALGORITHM_INDEX', () => {
  it.each([
    ['has the expected entry count', ALGORITHM_INDEX.length, EXPECTED_ENTRIES],
    ['has unique ids', new Set(ALGORITHM_INDEX.map((e) => e.id)).size, ALGORITHM_INDEX.length],
    [
      'has unique lcNumbers',
      new Set(ALGORITHM_INDEX.map((e) => e.lcNumber)).size,
      ALGORITHM_INDEX.length,
    ],
    [
      'has only known categories (count of unknown)',
      ALGORITHM_INDEX.filter((e) => !categoryIds.includes(e.category)).length,
      0,
    ],
    [
      'flags exactly the stub entries as not visualized',
      ALGORITHM_INDEX.filter((e) => !e.hasVisualization).length,
      EXPECTED_STUBS,
    ],
  ])('%s', (_name, actual, expected) => {
    expect(actual).toBe(expected);
  });
});
