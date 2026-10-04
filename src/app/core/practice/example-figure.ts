import { GraphEdge, GraphNode, GraphState, GridState } from '../models/algorithm.model';
import {
  AdjacencyFigure,
  EdgeListFigure,
  GraphFigure,
  GridFigure,
  MatrixFigure,
  PracticeFigure,
} from '../models/practice.model';

/** A graph with more nodes than this is not drawn: an unreadable picture is worse than none. */
export const MAX_FIGURE_NODES = 12;
/** A weight matrix with more nodes than this is not drawn: its edges would crowd the circle. */
export const MAX_MATRIX_FIGURE_NODES = 6;
/** The circle never shrinks below this radius, so a two-node graph is not a stub. */
const MIN_CIRCLE_RADIUS = 70;
/** Arc length of circle given to each node, so neighbours never touch as the count grows. */
const ARC_PER_NODE = 64;
/** Coordinates are rounded to 1/COORD_PRECISION so equal inputs give equal, tidy numbers. */
const COORD_PRECISION = 100;

type NodeId = number | string;
type EdgeTuple = readonly [NodeId, NodeId, number | undefined];

/** The nodes and edges of a figure, before they are placed and styled. */
interface Topology {
  readonly ids: readonly NodeId[];
  readonly edges: readonly EdgeTuple[];
}

/** A non-negative integer or a non-empty string. */
function isNodeId(value: unknown): value is NodeId {
  if (typeof value === 'string') return value.length > 0;
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value > 0;
}

/** Numbers ascending, then strings ascending. */
function compareNodeIds(a: NodeId, b: NodeId): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  if (typeof a === 'number') return -1;
  if (typeof b === 'number') return 1;
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

/** `[u, v]` or `[u, v, w]`, or null when `value` is neither. */
function parseEdge(value: unknown): EdgeTuple | null {
  if (!Array.isArray(value) || (value.length !== 2 && value.length !== 3)) return null;
  const [u, v, w] = value as unknown[];
  if (!isNodeId(u) || !isNodeId(v)) return null;
  if (w !== undefined && typeof w !== 'number') return null;
  return [u, v, w];
}

function parseEdges(value: unknown): EdgeTuple[] | null {
  if (!Array.isArray(value)) return null;
  const edges = value.map(parseEdge);
  return edges.every((edge): edge is EdgeTuple => edge !== null) ? edges : null;
}

/** The ids listed by `nodesArg` in their given order, or null when it is not a list of
 *  distinct node ids. */
function listedNodeIds(value: unknown): NodeId[] | null {
  if (!Array.isArray(value) || !value.every(isNodeId)) return null;
  return new Set(value).size === value.length ? [...value] : null;
}

/** The nodes listed by `nodesArg`, else `0..n-1` when `nodeCountArg` names a positive integer,
 *  else the distinct edge endpoints (numbers ascending, then strings ascending). An empty list
 *  stands for a node count over the cap. */
function edgeListNodeIds(
  figure: EdgeListFigure,
  args: readonly unknown[],
  edges: readonly EdgeTuple[],
): NodeId[] | null {
  if (figure.nodesArg !== undefined) return listedNodeIds(args[figure.nodesArg]);
  const count = figure.nodeCountArg === null ? undefined : args[figure.nodeCountArg];
  if (isCount(count)) {
    return count > MAX_FIGURE_NODES ? [] : Array.from({ length: count }, (_, i) => i);
  }
  const endpoints = new Set(edges.flatMap(([u, v]) => [u, v]));
  return [...endpoints].sort(compareNodeIds);
}

function edgeListTopology(figure: EdgeListFigure, args: readonly unknown[]): Topology | null {
  const edges = parseEdges(args[figure.edgesArg]);
  if (edges === null) return null;
  const ids = edgeListNodeIds(figure, args, edges);
  if (ids === null) return null;
  const known = new Set(ids);
  if (edges.some(([u, v]) => !known.has(u) || !known.has(v))) return null;
  return { ids, edges };
}

function isNumberRow(row: unknown, width: number): boolean {
  return Array.isArray(row) && row.length === width && row.every((cell) => typeof cell === 'number');
}

/** The upper triangle of a square weight matrix: one undirected edge per nonzero pair. */
function matrixTopology(figure: MatrixFigure, args: readonly unknown[]): Topology | null {
  const matrix = args[figure.matrixArg];
  if (!Array.isArray(matrix) || matrix.length === 0 || matrix.length > MAX_MATRIX_FIGURE_NODES) {
    return null;
  }
  const size = matrix.length;
  if (!matrix.every((row) => isNumberRow(row, size))) return null;
  const edges = (matrix as number[][]).flatMap((row, i) =>
    row.flatMap((weight, j): EdgeTuple[] => (j > i && weight !== 0 ? [[i, j, weight]] : [])),
  );
  return { ids: Array.from({ length: size }, (_, i) => i), edges };
}

/** Each pair once, whichever of its two ends listed it. */
function dedupePairs(edges: readonly EdgeTuple[]): EdgeTuple[] {
  const seen = new Set<string>();
  return edges.filter(([u, v]) => {
    const key = JSON.stringify([u, v].sort(compareNodeIds));
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** Entry i lists node i's neighbours; every id is one higher when `oneBased`. */
function adjacencyTopology(figure: AdjacencyFigure, args: readonly unknown[]): Topology | null {
  const lists = args[figure.adjArg];
  if (!Array.isArray(lists) || lists.length === 0 || lists.length > MAX_FIGURE_NODES) return null;
  const offset = figure.oneBased ? 1 : 0;
  const ids = lists.map((_, i) => i + offset);
  const known = new Set<unknown>(ids);
  if (!lists.every((list) => Array.isArray(list) && list.every((n) => known.has(n)))) return null;
  const arcs = (lists as number[][]).flatMap((list, i): EdgeTuple[] =>
    list.map((n): EdgeTuple => [i + offset, n, undefined]),
  );
  return { ids, edges: figure.directed ? arcs : dedupePairs(arcs) };
}

function topologyFor(figure: GraphFigure, args: readonly unknown[]): Topology | null {
  if ('edgesArg' in figure) return edgeListTopology(figure, args);
  if ('matrixArg' in figure) return matrixTopology(figure, args);
  return adjacencyTopology(figure, args);
}

function roundCoord(value: number): number {
  return Math.round(value * COORD_PRECISION) / COORD_PRECISION;
}

/** Nodes evenly on a circle, the first at the top and the rest clockwise. A named node is
 *  labelled with its name. */
function placeOnCircle(ids: readonly NodeId[]): GraphNode[] {
  const radius = Math.max(MIN_CIRCLE_RADIUS, (ids.length * ARC_PER_NODE) / (2 * Math.PI));
  return ids.map((id, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / ids.length;
    return {
      id,
      x: roundCoord(radius * Math.cos(angle)),
      y: roundCoord(radius * Math.sin(angle)),
      state: 'default',
      ...(typeof id === 'string' ? { label: id } : {}),
    };
  });
}

/** The `[from, to]` pairs of an `expected` that is a list of lists, each led by two node ids;
 *  null for any other shape. */
function expectedPairs(expected: unknown): (readonly [NodeId, NodeId])[] | null {
  if (!Array.isArray(expected)) return null;
  const isPair = (item: unknown): item is [NodeId, NodeId, ...unknown[]] =>
    Array.isArray(item) && isNodeId(item[0]) && isNodeId(item[1]);
  return expected.every(isPair) ? expected.map(([u, v]) => [u, v] as const) : null;
}

const pairKey = (from: NodeId, to: NodeId): string => JSON.stringify([from, to]);

/** Marks as found each drawn edge that `expected` names (either order when undirected); with an
 *  `expected` of any other shape no edge is marked. */
function highlighted(edges: readonly GraphEdge[], directed: boolean, expected: unknown): GraphEdge[] {
  const pairs = expectedPairs(expected);
  if (pairs === null) return [...edges];
  const named = new Set(
    pairs.flatMap(([u, v]) => (directed ? [pairKey(u, v)] : [pairKey(u, v), pairKey(v, u)])),
  );
  return edges.map((edge) =>
    named.has(pairKey(edge.from as NodeId, edge.to as NodeId)) ? { ...edge, state: 'found' } : edge,
  );
}

function graphStateFor(
  figure: GraphFigure,
  args: readonly unknown[],
  expected: unknown,
): GraphState | null {
  const topology = topologyFor(figure, args);
  if (topology === null || topology.ids.length === 0 || topology.ids.length > MAX_FIGURE_NODES) {
    return null;
  }
  const drawn: GraphEdge[] = topology.edges.map(([from, to, weight]) => ({
    from,
    to,
    state: 'default',
    ...(weight === undefined ? {} : { label: String(weight) }),
  }));
  const edges = figure.highlight === 'expected' ? highlighted(drawn, figure.directed, expected) : drawn;
  return { type: 'graph', nodes: placeOnCircle(topology.ids), edges, directed: figure.directed };
}

function isCellValue(value: unknown): value is string | number {
  return typeof value === 'string' || typeof value === 'number';
}

function gridStateFor(figure: GridFigure, args: readonly unknown[]): GridState | null {
  const matrix = args[figure.gridArg];
  if (!Array.isArray(matrix) || matrix.length === 0) return null;
  const width = Array.isArray(matrix[0]) ? matrix[0].length : 0;
  const isRectangular = matrix.every(
    (row) => Array.isArray(row) && row.length === width && row.every(isCellValue),
  );
  if (width === 0 || !isRectangular) return null;
  const grid = (matrix as (string | number)[][]).map((row) =>
    row.map((value) => ({ state: 'empty' as const, label: String(value) })),
  );
  return { type: 'grid', grid };
}

/** The picture of one example case's input, or null when its arguments do not fit the figure.
 *  Pure: `args` and `expected` are only read; `expected` marks edges when the figure highlights it. */
export function figureStateFor(
  figure: PracticeFigure,
  args: readonly unknown[],
  expected: unknown,
): GraphState | GridState | null {
  return figure.kind === 'graph'
    ? graphStateFor(figure, args, expected)
    : gridStateFor(figure, args);
}
