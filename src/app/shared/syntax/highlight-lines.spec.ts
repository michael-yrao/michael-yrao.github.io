import { highlightPythonLines } from './highlight-lines';

describe('highlightPythonLines', () => {
  const cases: { name: string; code: string; check: (lines: string[]) => void }[] = [
    {
      name: 'def keyword and definition name',
      code: 'def dfs(node):',
      check: (lines) => {
        expect(lines[0]).toContain('class="tok-keyword">def<');
        expect(lines[0]).toContain('class="tok-definition">dfs<');
      },
    },
    {
      name: 'a multi-line string keeps its colour on every line',
      code: '"""doc\nstring"""',
      check: (lines) => {
        expect(lines.length).toBe(2);
        expect(lines[0]).toContain('tok-string');
        expect(lines[1]).toContain('tok-string');
      },
    },
    {
      name: 'calls, attribute calls and plain variables',
      code: 'len(x)\nadj.append(x)',
      check: (lines) => {
        expect(lines[0]).toContain('tok-function">len<');
        expect(lines[1]).toContain('tok-function">append<');
        expect(lines[1]).toContain('tok-variableName">adj<');
      },
    },
    {
      name: 'escapes < and &',
      code: 'a < b and "x&y"',
      check: (lines) => {
        expect(lines[0]).toContain('&lt;');
        expect(lines[0]).toContain('&amp;');
        expect(lines[0].replace(/<\/?span[^>]*>/g, '')).not.toContain('<');
      },
    },
    {
      name: 'blank lines stay in place',
      code: 'a\n\nb',
      check: (lines) => {
        expect(lines.length).toBe(3);
        expect(lines[1]).toBe('');
      },
    },
    {
      name: 'empty input is one empty line',
      code: '',
      check: (lines) => expect(lines).toEqual(['']),
    },
    {
      name: 'class name',
      code: 'class Solution:',
      check: (lines) => expect(lines[0]).toContain('tok-className">Solution<'),
    },
    {
      name: 'update operator',
      code: 'x += 1',
      check: (lines) => expect(lines[0]).toContain('tok-operator'),
    },
  ];

  it('highlights each case', () => {
    for (const c of cases) {
      c.check(highlightPythonLines(c.code));
    }
  });
});
