import { contractVersionProblem } from './contract-version';

const EXPECTED = 2;
const LABEL = 'progress';
const NO_VERSION =
  "That repo's progress data has no schema version; this viewer speaks v2. Regenerate it with a current cse-coach.";

describe('contractVersionProblem', () => {
  const cases: { name: string; payload: unknown; expected: string | null }[] = [
    { name: 'equal version', payload: { schemaVersion: 2 }, expected: null },
    {
      name: 'newer version',
      payload: { schemaVersion: 3 },
      expected: "That repo's progress data is schema v3; this viewer speaks v2. Update the site.",
    },
    {
      name: 'older version',
      payload: { schemaVersion: 1 },
      expected:
        "That repo's progress data is schema v1; this viewer speaks v2. Regenerate it with a current cse-coach.",
    },
    { name: 'missing version', payload: {}, expected: NO_VERSION },
    { name: 'non-number version', payload: { schemaVersion: '1' }, expected: NO_VERSION },
  ];

  it.each(cases)('$name', ({ payload, expected }) => {
    expect(contractVersionProblem(payload, EXPECTED, LABEL)).toBe(expected);
  });
});
