/** A run of a problem statement's lines: one example's block, or the text between blocks. */
export interface StatementSegment {
  readonly text: string;
  /** The N of an `Example N:` block; null for the text between blocks. */
  readonly exampleNumber: number | null;
}

const EXAMPLE_HEADER = /^Example (\d+):\s*$/;
const LINE_BREAK = '\n';

const isBlank = (line: string): boolean => line.trim() === '';
const isIndented = (line: string): boolean => /^\s/.test(line);

/** Index one past the last line of the example block whose header is at `start`: the block runs
 *  over blank and indented lines, minus the trailing blanks, which belong to what follows. */
function exampleBlockEnd(lines: readonly string[], start: number): number {
  let end = start + 1;
  while (end < lines.length && (isBlank(lines[end]) || isIndented(lines[end]))) end++;
  while (end > start + 1 && isBlank(lines[end - 1])) end--;
  return end;
}

/**
 * Cuts a statement into its `Example N:` blocks and the text around them, in order. Every line
 * lands in exactly one segment, so joining the segments' text with a line break gives the
 * statement back.
 */
export function splitStatement(statement: string): readonly StatementSegment[] {
  const lines = statement.split(LINE_BREAK);
  const segments: StatementSegment[] = [];
  let plainStart = 0;
  let index = 0;

  const flushPlain = (end: number): void => {
    if (end > plainStart) {
      segments.push({ text: lines.slice(plainStart, end).join(LINE_BREAK), exampleNumber: null });
    }
  };

  while (index < lines.length) {
    const header = EXAMPLE_HEADER.exec(lines[index]);
    if (!header) {
      index++;
      continue;
    }
    flushPlain(index);
    const end = exampleBlockEnd(lines, index);
    segments.push({
      text: lines.slice(index, end).join(LINE_BREAK),
      exampleNumber: Number(header[1]),
    });
    plainStart = end;
    index = end;
  }
  flushPlain(lines.length);
  return segments;
}
