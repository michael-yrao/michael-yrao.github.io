import { splitStatement } from './statement-segments';

const INTRO = 'Find the tree.\n';
const EXAMPLE_1 = 'Example 1:\n    Input:  n = 4\n            edges = [[0,1,1]]\n    Output: 3';
const EXAMPLE_2 = 'Example 2:\n    Input:  n = 2\n    Output: 0';
const REST = 'Constraints:\n    n >= 1';

const SHAPE = `${INTRO}\n${EXAMPLE_1}\n\n${EXAMPLE_2}\n\n${REST}`;
const ENDS_ON_EXAMPLE = `${INTRO}\n${EXAMPLE_2}`;

type Row = [string, string, readonly [string, number | null][]];

describe('splitStatement', () => {
  it('cuts a statement into example blocks and the text around them without losing a line', () => {
    const rows: Row[] = [
      [
        'intro, two examples, constraints',
        SHAPE,
        [
          [INTRO, null],
          [EXAMPLE_1, 1],
          ['', null],
          [EXAMPLE_2, 2],
          [`\n${REST}`, null],
        ],
      ],
      ['no example header', 'Return all subsets.\nIn any order.', [['Return all subsets.\nIn any order.', null]]],
      [
        'example block is the last thing',
        ENDS_ON_EXAMPLE,
        [
          [INTRO, null],
          [EXAMPLE_2, 2],
        ],
      ],
    ];
    for (const [label, statement, expected] of rows) {
      const segments = splitStatement(statement);
      expect(
        segments.map((s) => [s.text, s.exampleNumber]),
        label,
      ).toEqual(expected);
      expect(segments.map((s) => s.text).join('\n'), label).toBe(statement);
    }
  });
});
