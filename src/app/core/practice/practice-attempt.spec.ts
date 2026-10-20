import { buildAttemptFile, parseAttemptFile } from './practice-attempt';

const SAVED_AT = new Date('2026-10-19T10:00:00.000Z');
const CODE = 'def solve():\n    pass\n';

function withHeader(header: Record<string, unknown>): string {
  return `# po-attempt: ${JSON.stringify({ ...header, savedAt: SAVED_AT.toISOString() })}\n${CODE}`;
}

describe('attempt file recognition round trip', () => {
  const PICK = { picked: 'Two Pointers', at: '2026-10-20T10:00:00.000Z' };
  const cases = [
    { name: 'with a pick', recognition: PICK, expected: PICK, hasKey: true },
    { name: 'without a pick', recognition: null, expected: null, hasKey: false },
  ];

  for (const { name, recognition, expected, hasKey } of cases) {
    it(name, () => {
      const meta = { complete: false, rating: null, tests: null, complexity: null, recognition };
      const content = buildAttemptFile(meta, SAVED_AT, CODE);
      expect(parseAttemptFile(content)?.recognition).toEqual(expected);
      expect(content.split('\n', 1)[0].includes('"recognition"')).toBe(hasKey);
    });
  }
});

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
