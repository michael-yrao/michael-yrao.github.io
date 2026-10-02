import { GraphEdge, GraphNode, GraphState, GridState } from '../models/algorithm.model';
import { GraphFigure, GridFigure, PracticeFigure } from '../models/practice.model';

/** A graph with more nodes than this is not drawn: an unreadable picture is worse than none. */
export const MAX_FIGURE_NODES = 12;
/** The circle never shrinks below this radius, so a two-node graph is not a stub. */
const MIN_CIRCLE_RADIUS = 70;
/** Arc length of circle given to each node, so neighbours never touch as the count grows. */
const ARC_PER_NODE = 64;
/** Coordinates are rounded to 1/COORD_PRECISION so equal inputs give equal, tidy numbers. */
const COORD_PRECISION = 100;

type EdgeTuple = readonly [number, number, number | undefined];

function isNodeId(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
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

/** Node ids `0..n-1` when `nodeCountArg` names a positive integer, else the sorted distinct
 *  edge endpoints. */
function nodeIds(figure: GraphFigure, args: readonly unknown[], edges: readonly EdgeTuple[]): number[] {
  const count = figure.nodeCountArg === null ? undefined : args[figure.nodeCountArg];
  if (typeof count === 'number' && Number.isInteger(count) && count > 0) {
    return count > MAX_FIGURE_NODES ? [] : Array.from({ length: count }, (_, i) => i);
  }
  const endpoints = new Set(edges.flatMap(([u, v]) => [u, v]));
  return [...endpoints].sort((a, b) => a - b);
}

function roundCoord(value: number): number {
  return Math.round(value * COORD_PRECISION) / COORD_PRECISION;
}

/** Nodes evenly on a circle, the first at the top and the rest clockwise. */
function placeOnCircle(ids: readonly number[]): GraphNode[] {
  const radius = Math.max(MIN_CIRCLE_RADIUS, (ids.length * ARC_PER_NODE) / (2 * Math.PI));
  return ids.map((id, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / ids.length;
    return {
      id,
      x: roundCoord(radius * Math.cos(angle)),
      y: roundCoord(radius * Math.sin(angle)),
      state: 'default',
    };
  });
}

function graphStateFor(figure: GraphFigure, args: readonly unknown[]): GraphState | null {
  const edges = parseEdges(args[figure.edgesArg]);
  if (edges === null) return null;
  const ids = nodeIds(figure, args, edges);
  if (ids.length === 0 || ids.length > MAX_FIGURE_NODES) return null;
  const known = new Set(ids);
  if (edges.some(([u, v]) => !known.has(u) || !known.has(v))) return null;

  const drawnEdges: GraphEdge[] = edges.map(([from, to, weight]) => ({
    from,
    to,
    state: 'default',
    ...(weight === undefined ? {} : { label: String(weight) }),
  }));
  return { type: 'graph', nodes: placeOnCircle(ids), edges: drawnEdges, directed: figure.directed };
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
 *  Pure: `args` is only read. */
export function figureStateFor(
  figure: PracticeFigure,
  args: readonly unknown[],
): GraphState | GridState | null {
  return figure.kind === 'graph' ? graphStateFor(figure, args) : gridStateFor(figure, args);
}
