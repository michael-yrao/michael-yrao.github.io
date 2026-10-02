/** A stretch of statement text: plain, or the inside of a backtick-marked code span. */
export interface TextRun {
  readonly text: string;
  readonly isCode: boolean;
}

/** A backtick, one or more non-backtick non-newline characters, a closing backtick. */
const CODE_SPAN = /`([^`\n]+)`/g;

function plainRun(text: string): readonly TextRun[] {
  return text === '' ? [] : [{ text, isCode: false }];
}

/** Cuts text into plain and code runs in order. A backtick with no closing partner on its line,
 *  or an empty pair, stays literal in a plain run. Re-wrapping code runs in backticks and joining
 *  gives back the input. */
export function splitInlineCode(text: string): readonly TextRun[] {
  const spans = Array.from(text.matchAll(CODE_SPAN));
  const runs = spans.flatMap((span, i) => {
    const previousEnd = i === 0 ? 0 : spans[i - 1].index + spans[i - 1][0].length;
    return [...plainRun(text.slice(previousEnd, span.index)), { text: span[1], isCode: true }];
  });
  const lastSpan = spans[spans.length - 1];
  const tailStart = lastSpan ? lastSpan.index + lastSpan[0].length : 0;
  return [...runs, ...plainRun(text.slice(tailStart))];
}
