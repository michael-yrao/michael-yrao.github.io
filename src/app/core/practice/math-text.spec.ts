import { MathRun, splitMath } from './math-text';

const text = (t: string): MathRun => ({ text: t, kind: 'text' });
const sub = (t: string): MathRun => ({ text: t, kind: 'sub' });
const sup = (t: string): MathRun => ({ text: t, kind: 'sup' });

describe('splitMath', () => {
  it('draws one-character subscripts, integer exponents and comparison symbols, and leaves names alone', () => {
    const rows: [string, string, readonly MathRun[]][] = [
      ['one-char subscript', 'from_i', [text('from'), sub('i')]],
      ['multi-char suffix is a name', 'start_node', [text('start_node')]],
      ['exponent', '10^4', [text('10'), sup('4')]],
      ['negative exponent', '2^-2', [text('2'), sup('-2')]],
      ['caret marker art', '^^^^ ^^', [text('^^^^ ^^')]],
      ['<= >= != replaced', 'a <= b >= c != d', [text('a ≤ b ≥ c ≠ d')]],
      ['lone < and >', 'a < b > c', [text('a < b > c')]],
      [
        'mixed line',
        '0 <= from_i, to_i < 10^4',
        [text('0 ≤ from'), sub('i'), text(', to'), sub('i'), text(' < 10'), sup('4')],
      ],
      ['empty string', '', []],
    ];
    for (const [label, input, expected] of rows) {
      expect(splitMath(input), label).toEqual(expected);
    }
  });
});
