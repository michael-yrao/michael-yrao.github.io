import { TextRun, splitInlineCode } from './inline-code';

const plain = (text: string): TextRun => ({ text, isCode: false });
const code = (text: string): TextRun => ({ text, isCode: true });

describe('splitInlineCode', () => {
  it('turns closed same-line backtick pairs into code runs and leaves the rest literal', () => {
    const rows: [string, string, readonly TextRun[]][] = [
      ['plain text', 'Return all subsets.', [plain('Return all subsets.')]],
      [
        'one span mid-sentence',
        'Given `nums` with duplicates',
        [plain('Given '), code('nums'), plain(' with duplicates')],
      ],
      [
        'two spans on one line',
        'Use `a` and `b`.',
        [plain('Use '), code('a'), plain(' and '), code('b'), plain('.')],
      ],
      [
        'brackets, equals and commas',
        '`edges[i] = [u, v, w]`',
        [code('edges[i] = [u, v, w]')],
      ],
      ['unmatched backtick', 'a ` b', [plain('a ` b')]],
      ['pair split across a newline', 'a `b\nc` d', [plain('a `b\nc` d')]],
      ['empty pair', 'a `` b', [plain('a `` b')]],
      ['empty string', '', []],
    ];
    for (const [label, input, expected] of rows) {
      const runs = splitInlineCode(input);
      expect(runs, label).toEqual(expected);
      const rejoined = runs.map((r) => (r.isCode ? `\`${r.text}\`` : r.text)).join('');
      expect(rejoined, label).toBe(input);
    }
  });
});
