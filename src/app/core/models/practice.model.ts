export const PRACTICE_SCHEMA_VERSION = 1;

/** How a returned value is compared with the expected one (set per problem by cse-progress). */
export type CompareMode = 'exact' | 'unordered' | 'unordered-nested';

/** How a case drives the class: one method call, an operation sequence on a design class, or
 *  decode(encode(...)) on two methods. Absent means 'method'. */
export type EntryKind = 'method' | 'ops' | 'round-trip';

export interface PracticeEntry {
  readonly className: string;
  readonly method: string;
  readonly kind?: EntryKind;
  /** Method names for a 'round-trip' entry. */
  readonly encode?: string;
  readonly decode?: string;
}

/** What a case is judged on: the return value (default), or an argument after the call (all of
 *  it, or its first k items where k is the integer the call returned). */
export type ResultSpec =
  | { readonly kind: 'return' }
  | { readonly kind: 'arg'; readonly index: number }
  | { readonly kind: 'arg-prefix'; readonly index: number };

/** How a JSON value maps to the node structure a method takes or returns. */
export type Codec =
  | 'list-node'
  | 'list-node-cycle'
  | 'random-list'
  | 'tree-node'
  | 'tree-value'
  | 'graph-node'
  | 'number-inf';

/** One codec (or null for plain JSON) per positional argument, and one for the result. */
export interface TypeSpec {
  readonly args: readonly (Codec | null)[];
  readonly result: Codec | null;
}

export interface PracticeCase {
  /** Positional argument list passed to the entry method. For an 'ops' entry: one argument
   *  list per op. */
  readonly args: readonly unknown[];
  /** Operation names for an 'ops' entry; the first constructs the class. */
  readonly ops?: readonly string[];
  /** Any JSON value, including null. */
  readonly expected: unknown;
  readonly example: boolean;
}

/** Fields every graph figure shares. */
interface GraphFigureBase {
  readonly kind: 'graph';
  readonly directed: boolean;
  /** When 'expected', the edges named by the case's `expected` are drawn as found. */
  readonly highlight?: 'expected';
}

/** Which args of a case hold a graph's edge list, drawn as an example diagram. */
export interface EdgeListFigure extends GraphFigureBase {
  readonly edgesArg: number;
  readonly nodeCountArg: number | null;
  /** Arg holding the node ids in drawing order (named or isolated nodes). */
  readonly nodesArg?: number;
}

/** Which arg of a case holds a square weight matrix (undirected; 0 means no edge). */
export interface MatrixFigure extends GraphFigureBase {
  readonly directed: false;
  readonly matrixArg: number;
}

/** Which arg of a case holds an adjacency list: entry i lists node i's neighbours. */
export interface AdjacencyFigure extends GraphFigureBase {
  readonly adjArg: number;
  readonly oneBased: boolean;
}

export type GraphFigure = EdgeListFigure | MatrixFigure | AdjacencyFigure;

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
  /** Null when the contract has none: the page then shows the static description. */
  readonly statement: string | null;
  readonly stub: string;
  readonly entry: PracticeEntry;
  readonly compare: CompareMode;
  /** Absent or null means the return value is compared. */
  readonly result?: ResultSpec | null;
  /** Absent or null means every argument and the result are plain JSON. */
  readonly types?: TypeSpec | null;
  /** Optional: absent or null when the problem has no example diagram. */
  readonly figure?: PracticeFigure | null;
  readonly cases: readonly PracticeCase[];
}

export interface PracticeData {
  readonly schemaVersion: number;
  readonly generatedAt: string;
  readonly problems: readonly PracticeProblem[];
}
