export const PRACTICE_SCHEMA_VERSION = 1;

/** How a returned value is compared with the expected one (set per problem by cse-progress). */
export type CompareMode = 'exact' | 'unordered' | 'unordered-nested';

export interface PracticeEntry {
  readonly className: string;
  readonly method: string;
}

export interface PracticeCase {
  /** Positional argument list passed to the entry method. */
  readonly args: readonly unknown[];
  /** Any JSON value, including null. */
  readonly expected: unknown;
  readonly example: boolean;
}

/** Which args of a case hold a graph's edge list, drawn as an example diagram. */
export interface GraphFigure {
  readonly kind: 'graph';
  readonly directed: boolean;
  readonly edgesArg: number;
  readonly nodeCountArg: number | null;
}

/** Which arg of a case holds a matrix, drawn as an example diagram. */
export interface GridFigure {
  readonly kind: 'grid';
  readonly gridArg: number;
}

export type PracticeFigure = GraphFigure | GridFigure;

export interface PracticeProblem {
  readonly number: number;
  readonly title: string;
  readonly url: string | null;
  readonly statement: string;
  readonly stub: string;
  readonly entry: PracticeEntry;
  readonly compare: CompareMode;
  /** Optional: absent or null when the problem has no example diagram. */
  readonly figure?: PracticeFigure | null;
  readonly cases: readonly PracticeCase[];
}

export interface PracticeData {
  readonly schemaVersion: number;
  readonly generatedAt: string;
  readonly problems: readonly PracticeProblem[];
}
