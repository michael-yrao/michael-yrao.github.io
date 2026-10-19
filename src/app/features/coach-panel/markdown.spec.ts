import { renderMarkdown } from './markdown';

interface Row {
  readonly name: string;
  readonly source: string;
  readonly check: (html: string, root: HTMLElement) => void;
}

const ROWS: readonly Row[] = [
  {
    name: '<script> is stripped',
    source: 'hi <script>alert(1)</script> there',
    check: (html) => expect(html).not.toContain('<script'),
  },
  {
    name: 'on* handlers are stripped',
    source: '<img src="x" onerror="alert(1)">',
    check: (html) => expect(html).not.toContain('onerror'),
  },
  {
    name: 'a javascript: href is stripped',
    source: '[click](javascript:alert(1))',
    check: (html) => expect(html).not.toContain('javascript:'),
  },
  {
    name: 'style attributes are stripped',
    source: '<p style="position:fixed">x</p>',
    check: (html) => expect(html).not.toContain('style='),
  },
  {
    name: 'a fenced python block is highlighted',
    source: '```python\ndef f():\n    return 1\n```',
    check: (_, root) => expect(root.querySelector('pre code.hljs .hljs-keyword')).toBeTruthy(),
  },
  {
    name: 'an internal link keeps no target; an external one opens a new tab safely',
    source: '[in](/practice/1) [out](https://example.com)',
    check: (_, root) => {
      const [internal, external] = Array.from(root.querySelectorAll('a'));
      expect(internal.getAttribute('target')).toBeNull();
      expect([external.getAttribute('target'), external.getAttribute('rel')]).toEqual(['_blank', 'noopener']);
    },
  },
];

describe('renderMarkdown', () => {
  it.each(ROWS)('$name', ({ source, check }) => {
    const html = renderMarkdown(source);
    const root = document.createElement('div');
    root.innerHTML = html;
    check(html, root);
  });
});
