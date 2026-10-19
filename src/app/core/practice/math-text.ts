/** A stretch of statement text drawn math-style: plain, a subscript, or a superscript. */
export interface MathRun {
  readonly text: string;
  readonly kind: 'text' | 'sub' | 'sup';
}

/** After a letter: `_`, exactly one letter or digit, then a word boundary (`from_i`, not `start_node`)
 *  — or after a digit: `^` and an optionally negative integer (`10^4`, `2^-2`). The lookbehinds keep
 *  the base out of the match, so the base stays in the surrounding text. */
const SCRIPT = /(?<=[A-Za-z])_([A-Za-z0-9])\b|(?<=\d)\^(-?\d+)/g;

const OPERATOR_SYMBOLS: readonly (readonly [RegExp, string])[] = [
  [/<=/g, '≤'],
  [/>=/g, '≥'],
  [/!=/g, '≠'],
];

function symbolize(text: string): string {
  return OPERATOR_SYMBOLS.reduce((acc, [pattern, symbol]) => acc.replace(pattern, symbol), text);
}

function textRun(text: string): readonly MathRun[] {
  return text === '' ? [] : [{ text: symbolize(text), kind: 'text' }];
}

/** Cuts text into plain, subscript and superscript runs in order, with `<=`, `>=` and `!=` in the
 *  plain runs drawn as ≤ ≥ ≠. The `_` and `^` markers are dropped. No run is empty. */
export function splitMath(text: string): readonly MathRun[] {
  const scripts = Array.from(text.matchAll(SCRIPT));
  const runs = scripts.flatMap((match, i) => {
    const previousEnd = i === 0 ? 0 : scripts[i - 1].index + scripts[i - 1][0].length;
    const isSub = match[1] !== undefined;
    const script: MathRun = { text: isSub ? match[1] : match[2], kind: isSub ? 'sub' : 'sup' };
    return [...textRun(text.slice(previousEnd, match.index)), script];
  });
  const lastScript = scripts[scripts.length - 1];
  const tailStart = lastScript ? lastScript.index + lastScript[0].length : 0;
  return [...runs, ...textRun(text.slice(tailStart))];
}
