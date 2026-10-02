import { GraphEdge, GraphNode } from '../../../core/models/algorithm.model';

/** Radius of a drawn node. */
export const NODE_RADIUS = 22;
/** Gap between a node's rim and the edge that touches it, so strokes never meet the rim. */
const EDGE_GAP = 3;
/** How far the control point of a curved edge sits off the straight line between its nodes. */
const CURVE_BOW = 26;
/** Distance a label sits off the edge it names. */
const LABEL_OFFSET = 11;
/** How far a self-loop reaches past the node's rim. */
export const LOOP_REACH = 34;
/** Half the angle (radians) between a self-loop's two feet on the rim. */
const LOOP_FOOT_ANGLE = 0.6;
/** Half the angle (radians) between a self-loop's two control points. */
const LOOP_CONTROL_ANGLE = 0.85;
/** Length of the vector used when a direction cannot be derived (two nodes on one spot). */
const UNIT = 1;

export interface Point {
  readonly x: number;
  readonly y: number;
}

export type EdgeShape =
  | { readonly kind: 'line'; readonly x1: number; readonly y1: number; readonly x2: number; readonly y2: number }
  | { readonly kind: 'path'; readonly d: string };

export interface EdgeLayout {
  readonly shape: EdgeShape;
  /** Where the edge's label is centred. */
  readonly label: Point;
}

const ORIGIN: Point = { x: 0, y: 0 };

function scaled(v: Point, factor: number): Point {
  return { x: v.x * factor, y: v.y * factor };
}

function plus(a: Point, b: Point): Point {
  return { x: a.x + b.x, y: a.y + b.y };
}

function unitFrom(from: Point, to: Point): Point {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  return dist === 0 ? { x: 0, y: -UNIT } : { x: dx / dist, y: dy / dist };
}

function rotated(v: Point, angle: number): Point {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: v.x * cos - v.y * sin, y: v.x * sin + v.y * cos };
}

/** The unit normal to the left of the direction from `from` to `to`. */
function leftNormal(from: Point, to: Point): Point {
  const u = unitFrom(from, to);
  return { x: -u.y, y: u.x };
}

function rimPoint(node: Point, toward: Point): Point {
  return plus(node, scaled(unitFrom(node, toward), NODE_RADIUS + EDGE_GAP));
}

function straightLayout(f: Point, t: Point): EdgeLayout {
  const start = rimPoint(f, t);
  const end = rimPoint(t, f);
  const mid = scaled(plus(start, end), 0.5);
  return {
    shape: { kind: 'line', x1: start.x, y1: start.y, x2: end.x, y2: end.y },
    label: plus(mid, scaled(leftNormal(f, t), LABEL_OFFSET)),
  };
}

/** A quadratic curve bowing to the left of f→t, so the reverse edge bows the other way. */
function curvedLayout(f: Point, t: Point): EdgeLayout {
  const mid = scaled(plus(f, t), 0.5);
  const normal = leftNormal(f, t);
  const control = plus(mid, scaled(normal, CURVE_BOW));
  const start = rimPoint(f, control);
  const end = rimPoint(t, control);
  const curveMid = plus(scaled(plus(start, end), 0.25), scaled(control, 0.5));
  return {
    shape: { kind: 'path', d: `M ${start.x} ${start.y} Q ${control.x} ${control.y} ${end.x} ${end.y}` },
    label: plus(curveMid, scaled(normal, LABEL_OFFSET)),
  };
}

/** A small loop leaving the node on the side facing away from `centre`. */
function loopLayout(node: Point, centre: Point): EdgeLayout {
  const outward = unitFrom(centre, node);
  const foot = (angle: number): Point => plus(node, scaled(rotated(outward, angle), NODE_RADIUS));
  const control = (angle: number): Point =>
    plus(node, scaled(rotated(outward, angle), NODE_RADIUS + LOOP_REACH * 1.6));
  const start = foot(-LOOP_FOOT_ANGLE);
  const end = foot(LOOP_FOOT_ANGLE);
  const c1 = control(-LOOP_CONTROL_ANGLE);
  const c2 = control(LOOP_CONTROL_ANGLE);
  return {
    shape: {
      kind: 'path',
      d: `M ${start.x} ${start.y} C ${c1.x} ${c1.y} ${c2.x} ${c2.y} ${end.x} ${end.y}`,
    },
    label: plus(node, scaled(outward, NODE_RADIUS + LOOP_REACH + LABEL_OFFSET)),
  };
}

function centreOf(nodes: readonly GraphNode[]): Point {
  if (nodes.length === 0) return ORIGIN;
  const sum = nodes.reduce((acc, n) => plus(acc, n), ORIGIN);
  return scaled(sum, 1 / nodes.length);
}

const pairKey = (from: string | number, to: string | number): string => `${from}>${to}`;

/** The drawn shape and label position of every edge, in edge order. A pair of edges running
 *  in opposite directions are curved apart; a self-loop is a small loop; the rest are lines. */
export function layoutEdges(nodes: readonly GraphNode[], edges: readonly GraphEdge[]): EdgeLayout[] {
  const byId = new Map(nodes.map((n) => [n.id, n] as const));
  const keys = new Set(edges.map((e) => pairKey(e.from, e.to)));
  const centre = centreOf(nodes);
  return edges.map((edge) => {
    const f = byId.get(edge.from);
    const t = byId.get(edge.to);
    if (!f || !t) return { shape: { kind: 'line', x1: 0, y1: 0, x2: 0, y2: 0 }, label: ORIGIN };
    if (edge.from === edge.to) return loopLayout(f, centre);
    const hasOpposite = keys.has(pairKey(edge.to, edge.from));
    return hasOpposite ? curvedLayout(f, t) : straightLayout(f, t);
  });
}
