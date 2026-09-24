// One-Stroke Tour — edge/node rendering geometry only. Not part of the pure
// solver: this is SVG layout math (node-radius pullback, curved parallel
// edges), never touched by the graph algorithm itself.

import { OneStrokeBoard, OneStrokeEdge, OneStrokeNode } from './one-stroke.solver';

export const NODE_RADIUS = 22;
const ARROW_MARGIN = 8;
const CURVE_OFFSET = 20;

export interface EdgeRenderInfo {
  readonly edge: OneStrokeEdge;
  readonly pathD: string;
}

interface Point {
  readonly x: number;
  readonly y: number;
}

export function computeEdgeRenderInfo(board: OneStrokeBoard): EdgeRenderInfo[] {
  const nodeById = new Map<number, OneStrokeNode>(board.nodes.map((n) => [n.id, n]));
  const occurrenceByPair = new Map<string, number>();

  return board.edges.map((edge) => {
    const from = nodeById.get(edge.from) as OneStrokeNode;
    const to = nodeById.get(edge.to) as OneStrokeNode;
    const key = edge.from < edge.to ? `${edge.from}-${edge.to}` : `${edge.to}-${edge.from}`;
    const occurrence = occurrenceByPair.get(key) ?? 0;
    occurrenceByPair.set(key, occurrence + 1);

    const start = pointTowardWithMargin(from, to, NODE_RADIUS);
    const endMargin = NODE_RADIUS + (board.directed ? ARROW_MARGIN : 0);
    const end = pointTowardWithMargin(to, from, endMargin);
    const pathD = occurrence > 0 ? curvedPathD(start, end, CURVE_OFFSET) : `M ${start.x} ${start.y} L ${end.x} ${end.y}`;

    return { edge, pathD };
  });
}

function pointTowardWithMargin(from: Point, to: Point, margin: number): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  return { x: from.x + (dx / dist) * margin, y: from.y + (dy / dist) * margin };
}

function curvedPathD(p1: Point, p2: Point, offset: number): string {
  const midX = (p1.x + p2.x) / 2;
  const midY = (p1.y + p2.y) / 2;
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const controlX = midX + (-dy / len) * offset;
  const controlY = midY + (dx / len) * offset;
  return `M ${p1.x} ${p1.y} Q ${controlX} ${controlY} ${p2.x} ${p2.y}`;
}
