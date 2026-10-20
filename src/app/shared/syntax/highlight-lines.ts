import { pythonLanguage } from '@codemirror/lang-python';
import { highlightCode } from '@lezer/highlight';
import { pythonHighlighter } from './python-highlighter';

const HTML_ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
};

function escapeHtml(text: string): string {
  return text.replace(/[&<>"]/g, (ch) => HTML_ESCAPES[ch]);
}

/** Highlights a whole Python snippet in one parse; returns one HTML string per source line. */
export function highlightPythonLines(code: string): string[] {
  const lines: string[] = [];
  let current = '';
  const putText = (text: string, classes: string): void => {
    const escaped = escapeHtml(text);
    current += classes ? `<span class="${classes}">${escaped}</span>` : escaped;
  };
  const putBreak = (): void => {
    lines.push(current);
    current = '';
  };
  highlightCode(code, pythonLanguage.parser.parse(code), pythonHighlighter, putText, putBreak);
  lines.push(current);
  return lines;
}
