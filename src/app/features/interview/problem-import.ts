import type { AlgorithmMeta, ProblemExample } from '../../core/models/algorithm.model';
import type { PracticeEntry, PracticeProblem } from '../../core/models/practice.model';
import type { InterviewProblem } from './session/interview-problem';

const LINE_BREAK = '\n';
const BLANK_LINE = '\n\n';
/** Indented lines stay verbatim when prose reflows and when example blocks are cut. */
const INDENT = '  ';
const CONSTRAINTS_HEADER = 'Constraints:';
const CONSTRAINT_BULLET = '- ';

/** `PracticeProblem.number` for a problem that was not imported from the site. */
const NO_SOURCE_NUMBER = 0;
/** What the runner is handed when there is no entry; with no entry the page runs free. */
const NO_ENTRY: PracticeEntry = { className: '', method: '' };

const CLASS_HEADER = /^class\s+([A-Za-z_]\w*)/;
const PUBLIC_METHOD = /^\s+def\s+([A-Za-z]\w*)/;
const isTopLevelCode = (line: string): boolean => /^\S/.test(line) && !line.startsWith('#');

const indent = (text: string): string =>
  text
    .split(LINE_BREAK)
    .map((line) => `${INDENT}${line}`)
    .join(LINE_BREAK);

function exampleBlock(example: ProblemExample, index: number): string {
  const lines = [
    `Example ${index + 1}:`,
    indent(`Input: ${example.input}`),
    indent(`Output: ${example.output}`),
    ...(example.explanation ? [indent(`Explanation: ${example.explanation}`)] : []),
  ];
  return lines.join(LINE_BREAK);
}

function constraintsBlock(constraints: readonly string[]): string {
  const bullets = constraints.map((c) => indent(`${CONSTRAINT_BULLET}${c}`));
  return [CONSTRAINTS_HEADER, ...bullets].join(LINE_BREAK);
}

/**
 * The static description a practice page falls back to, as editable statement text: the
 * description, `Example N:` blocks with indented lines, then the constraints. The hint is left out.
 * Empty when there is no description, as the page then shows nothing.
 */
export function statementFromMeta(meta: AlgorithmMeta | null): string {
  if (!meta?.description) return '';
  // Example blocks sit on consecutive lines: a blank line between two would parse as a segment of its own.
  const examples = meta.examples.map(exampleBlock).join(LINE_BREAK);
  const sections = [
    meta.description,
    ...(examples ? [examples] : []),
    ...(meta.constraints.length ? [constraintsBlock(meta.constraints)] : []),
  ];
  return sections.join(BLANK_LINE);
}

/** The first class's name and the lines of its body, up to the next top-level code line. */
function firstClass(starter: string): { className: string; body: readonly string[] } | null {
  const lines = starter.split(LINE_BREAK);
  const start = lines.findIndex((line) => CLASS_HEADER.test(line));
  if (start < 0) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex(isTopLevelCode);
  return {
    className: CLASS_HEADER.exec(lines[start])![1],
    body: end < 0 ? rest : rest.slice(0, end),
  };
}

/** The first class's first method not starting with `_`; the runner only drives a class. */
export function entryFromStarter(starter: string): PracticeEntry | null {
  const parsed = firstClass(starter);
  if (!parsed) return null;
  const method = parsed.body.map((line) => PUBLIC_METHOD.exec(line)).find((m) => m !== null);
  return method ? { className: parsed.className, method: method[1] } : null;
}

/** A site problem as an interview problem, its fields copied so the original is untouched. */
export function importProblem(problem: PracticeProblem, meta: AlgorithmMeta | null): InterviewProblem {
  return {
    title: problem.title,
    statement: problem.statement ?? statementFromMeta(meta),
    starter: problem.stub,
    entry: { ...problem.entry },
    compare: problem.compare,
    cases: problem.cases.map((c) => ({ ...c })),
    result: problem.result ?? null,
    types: problem.types ?? null,
    figure: problem.figure ?? null,
    source: problem.number,
  };
}

/** The problem as the runner and the description take it. */
export function toPracticeProblem(problem: InterviewProblem): PracticeProblem {
  return {
    number: problem.source ?? NO_SOURCE_NUMBER,
    title: problem.title,
    url: null,
    statement: problem.statement,
    stub: problem.starter,
    entry: problem.entry ?? NO_ENTRY,
    compare: problem.compare,
    result: problem.result,
    types: problem.types,
    figure: problem.figure,
    cases: problem.cases,
  };
}
