import { attemptPath, buildAttemptFile, parseAttemptFile } from './practice-attempt';

describe('attemptPath session-date folder', () => {
  const cases: { name: string; now: Date; folder: string }[] = [
    { name: '04:59 is still yesterday', now: new Date(2026, 9, 18, 4, 59), folder: '20261017' },
    { name: '05:00 is today', now: new Date(2026, 9, 18, 5, 0), folder: '20261018' },
    { name: '00:00 on the 1st is the last day of the previous month', now: new Date(2026, 10, 1, 0, 0), folder: '20261031' },
  ];

  for (const { name, now, folder } of cases) {
    it(name, () => {
      expect(attemptPath(now, 261, 'Graph Valid Tree')).toBe(`dsa/attempts/${folder}/261_graph_valid_tree.py`);
    });
  }
});

const SAVED_AT = new Date('2026-10-19T10:00:00.000Z');
const CODE = 'def solve():\n    pass\n';

function withHeader(header: Record<string, unknown>): string {
  return `# po-attempt: ${JSON.stringify({ ...header, savedAt: SAVED_AT.toISOString() })}\n${CODE}`;
}

describe('parseAttemptFile', () => {
  const cases: { name: string; content: string; expected: { complete: boolean; rating: string | null } | null }[] = [
    {
      name: 'complete true keeps the rating',
      content: buildAttemptFile({ complete: true, rating: 'clean', tests: '3/3', complexity: null }, SAVED_AT, CODE),
      expected: { complete: true, rating: 'clean' },
    },
    {
      name: 'complete false',
      content: buildAttemptFile({ complete: false, rating: null, tests: null, complexity: null }, SAVED_AT, CODE),
      expected: { complete: false, rating: null },
    },
    {
      name: 'complete key missing',
      content: withHeader({ rating: 'shaky' }),
      expected: { complete: false, rating: 'shaky' },
    },
    { name: 'header that is not JSON', content: '# po-attempt: {nope\nx = 1\n', expected: null },
  ];

  for (const { name, content, expected } of cases) {
    it(name, () => {
      const parsed = parseAttemptFile(content);
      if (expected === null) {
        expect(parsed).toBeNull();
        return;
      }
      expect(parsed?.complete).toBe(expected.complete);
      expect(parsed?.rating).toBe(expected.rating);
      expect(parsed?.code).toBe(CODE);
    });
  }
});
