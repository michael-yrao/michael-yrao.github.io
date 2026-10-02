import { reflowProse } from './reflow';

describe('reflowProse', () => {
  it('joins consecutive prose lines and leaves blank and indented lines as written', () => {
    const rows: [string, string, string][] = [
      ['two wrapped prose lines join', 'a b\nc d', 'a b c d'],
      ['a blank line separates paragraphs', 'a b\nc d\n\ne', 'a b c d\n\ne'],
      ['indented lines are untouched', '  - x\n  - y', '  - x\n  - y'],
      [
        'a header followed by indented lines is untouched',
        'Note:\n  - x\n  - y',
        'Note:\n  - x\n  - y',
      ],
      [
        'a prose line after an indented line starts a new line',
        'Note:\n  - x\n  - y\nz',
        'Note:\n  - x\n  - y\nz',
      ],
      ['trailing spaces before a join are trimmed', 'a b  \nc', 'a b c'],
      ['empty string', '', ''],
    ];
    for (const [label, input, expected] of rows) {
      expect(reflowProse(input), label).toBe(expected);
    }
  });
});
