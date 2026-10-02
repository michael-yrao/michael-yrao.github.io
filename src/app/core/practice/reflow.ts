const LINE_BREAK = '\n';
const JOINER = ' ';

/** A line drawn as written: an empty one, or one that starts with whitespace. */
const isVerbatim = (line: string): boolean => line === '' || /^\s/.test(line);

/**
 * Joins hard-wrapped prose so the browser wraps it to the pane's width: a line that is not
 * verbatim and directly follows another such line is appended to it after a single space. Every
 * other line break stays, so blank lines and indented lines keep their layout.
 */
export function reflowProse(text: string): string {
  const lines = text.split(LINE_BREAK);
  return lines
    .reduce<{ out: readonly string[]; previousWasProse: boolean }>(
      ({ out, previousWasProse }, line) => {
        const isProse = !isVerbatim(line);
        if (isProse && previousWasProse) {
          const joined = `${out[out.length - 1].trimEnd()}${JOINER}${line}`;
          return { out: [...out.slice(0, -1), joined], previousWasProse: true };
        }
        return { out: [...out, line], previousWasProse: isProse };
      },
      { out: [], previousWasProse: false },
    )
    .out.join(LINE_BREAK);
}
