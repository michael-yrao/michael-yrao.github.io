import { Technique } from '../../../core/models/progress.model';

/**
 * Pure, Angular-free swimlane layout for the Mastery tab's technique map. `buildTechniqueGraph`
 * turns `techniques[]` (each carrying its own `buildsOn` prerequisite names) into a graph;
 * `computeDepths` assigns every node a prerequisite depth; `layoutSwimlanes` places one
 * horizontal lane per family, techniques within a lane ordered left→right by that depth, and
 * returns ready-to-draw pixel geometry. No layout library — this is the whole algorithm.
 */

/** One prerequisite edge: `from` (the prerequisite) builds toward `to` (the dependent). */
export interface TechniqueEdge {
  readonly from: string;
  readonly to: string;
}

export interface TechniqueGraph {
  /** Every technique, keyed by name. */
  readonly techniques: ReadonlyMap<string, Technique>;
  /** Edges whose endpoints both exist. */
  readonly edges: readonly TechniqueEdge[];
  /** Count of `buildsOn` entries that named a technique not present in `techniques[]` —
   *  dropped rather than crashing, so a partial/older export still renders. */
  readonly droppedEdgeCount: number;
}

/** Builds the graph from a technique list: nodes keyed by name, edges from each technique's
 *  `buildsOn` (missing prerequisite names are dropped and counted, never thrown). Never
 *  mutates `techniques`. */
export function buildTechniqueGraph(techniques: readonly Technique[]): TechniqueGraph {
  const byName = new Map(techniques.map((t) => [t.name, t]));
  const edges: TechniqueEdge[] = [];
  let droppedEdgeCount = 0;

  for (const t of techniques) {
    for (const prereq of t.buildsOn ?? []) {
      if (byName.has(prereq)) {
        edges.push({ from: prereq, to: t.name });
      } else {
        droppedEdgeCount += 1;
      }
    }
  }

  return { techniques: byName, edges, droppedEdgeCount };
}

/** Marks a node whose depth is still being computed on the current DFS path — a parent
 *  pointing back to one of these is a cycle; the guard below treats that edge as contributing
 *  no depth instead of recursing forever. */
const IN_PROGRESS = -1;

export interface DepthResult {
  readonly depths: ReadonlyMap<string, number>;
  readonly cycleBreakCount: number;
}

/** depth(root) = 0; depth(t) = 1 + max(depth(prereq)) over t's valid prerequisites. Memoized
 *  DFS, guarded against a cycle (which `techniques.yml` should never author, but a bad edit
 *  must not hang the page). */
export function computeDepths(graph: TechniqueGraph): DepthResult {
  const parentsByName = new Map<string, string[]>();
  for (const name of graph.techniques.keys()) parentsByName.set(name, []);
  for (const edge of graph.edges) parentsByName.get(edge.to)!.push(edge.from);

  const depths = new Map<string, number>();
  let cycleBreakCount = 0;

  function depthOf(name: string): number {
    const cached = depths.get(name);
    if (cached === IN_PROGRESS) {
      cycleBreakCount += 1;
      return 0; // cycle guard: this back-edge contributes no extra depth
    }
    if (cached !== undefined) return cached;

    depths.set(name, IN_PROGRESS);
    const parents = parentsByName.get(name) ?? [];
    const maxParentDepth = parents.reduce((max, parent) => Math.max(max, depthOf(parent)), -1);
    const depth = maxParentDepth + 1;
    depths.set(name, depth);
    return depth;
  }

  for (const name of graph.techniques.keys()) depthOf(name);
  return { depths, cycleBreakCount };
}

export interface MapNode {
  readonly name: string;
  readonly x: number;
  readonly y: number;
  readonly lane: string;
  readonly column: number;
}

export interface MapEdge {
  readonly from: string;
  readonly to: string;
  /** A cubic Bézier `d` attribute from the source's right-centre to the target's left-centre. */
  readonly path: string;
  readonly crossLane: boolean;
}

export interface SwimLane {
  readonly family: string;
  readonly label: string;
  readonly y: number;
  readonly height: number;
}

export interface SwimlaneLayout {
  readonly lanes: readonly SwimLane[];
  readonly nodes: readonly MapNode[];
  readonly edges: readonly MapEdge[];
  readonly width: number;
  readonly height: number;
  /** Back-edges the cycle guard broke while computing depth (0 for an acyclic graph, which
   *  is the expected shape — `techniques.yml` should never author a cycle). */
  readonly cycleBreakCount: number;
}

export interface SwimlaneOptions {
  readonly hiddenFamilies?: ReadonlySet<string>;
}

export const NODE_W = 120;
export const NODE_H = 36;
export const GAP_X = 20;
export const GAP_Y = 8;
export const LANE_PAD = 10;
export const EXPANSION_FAMILY = 'expansion';

/** Lane display order: known families first (in this curriculum order), then any unknown
 *  family (name-sorted), with `expansion` always last. */
export const LANE_ORDER: readonly string[] = [
  'arrays_and_hash',
  'two_pointers',
  'sliding_window',
  'prefix_sum',
  'binary_search',
  'stack',
  'linked_list',
  'recursion',
  'sorting',
  'intervals',
  'backtracking',
  'trees',
  'tries',
  'heap',
  'graphs',
  'advanced_graphs',
  'dynamic_programming',
  EXPANSION_FAMILY,
];

const FAMILY_LABEL: ReadonlyMap<string, string> = new Map([
  ['arrays_and_hash', 'Arrays & Hashing'],
  ['two_pointers', 'Two Pointers'],
  ['sliding_window', 'Sliding Window'],
  ['prefix_sum', 'Prefix Sum'],
  ['binary_search', 'Binary Search'],
  ['stack', 'Stack'],
  ['linked_list', 'Linked List'],
  ['recursion', 'Recursion'],
  ['sorting', 'Sorting'],
  ['intervals', 'Intervals'],
  ['backtracking', 'Backtracking'],
  ['trees', 'Trees'],
  ['tries', 'Tries'],
  ['heap', 'Heap'],
  ['graphs', 'Graphs'],
  ['advanced_graphs', 'Advanced Graphs'],
  ['dynamic_programming', 'Dynamic Programming'],
  [EXPANSION_FAMILY, 'Expansion (tier 1–3)'],
]);

/** A family's display label — the curated name when known, else the raw family string
 *  (never blank), so an unrecognized family still reads as something in the lane column. */
export function labelFor(family: string): string {
  return FAMILY_LABEL.get(family) ?? family;
}

/** x = column × (NODE_W + GAP_X) — every node at a given depth shares this column x. */
function colX(column: number): number {
  return column * (NODE_W + GAP_X);
}

/** Orders the families actually present (excluding any hidden): known `LANE_ORDER` families
 *  in curriculum order, then unknown families name-sorted, with `expansion` (if present and
 *  visible) always last. Never mutates `presentFamilies`. */
function orderedLanes(presentFamilies: ReadonlySet<string>): string[] {
  const known = LANE_ORDER.filter((f) => f !== EXPANSION_FAMILY && presentFamilies.has(f));
  const unknown = [...presentFamilies]
    .filter((f) => f !== EXPANSION_FAMILY && !LANE_ORDER.includes(f))
    .sort((a, b) => a.localeCompare(b));
  const expansion = presentFamilies.has(EXPANSION_FAMILY) ? [EXPANSION_FAMILY] : [];
  return [...known, ...unknown, ...expansion];
}

/** Lays out a technique graph as a swimlane diagram: one horizontal lane per family, depth
 *  (computed on the FULL graph, before any hiding) picks each node's column, and nodes within
 *  a family/depth cell stack vertically, name-sorted. Depths never change when `hiddenFamilies`
 *  changes — only which nodes/lanes/edges are omitted — so toggling never moves a visible node.
 *  Pure: never mutates `graph` or `opts`. */
export function layoutSwimlanes(graph: TechniqueGraph, opts: SwimlaneOptions = {}): SwimlaneLayout {
  const hiddenFamilies = opts.hiddenFamilies ?? new Set<string>();
  const { depths, cycleBreakCount } = computeDepths(graph);

  const visibleNames = [...graph.techniques.keys()].filter(
    (name) => !hiddenFamilies.has(graph.techniques.get(name)!.family),
  );

  if (visibleNames.length === 0) {
    return { lanes: [], nodes: [], edges: [], width: 0, height: 0, cycleBreakCount };
  }

  const presentFamilies = new Set(visibleNames.map((name) => graph.techniques.get(name)!.family));
  const laneFamilies = orderedLanes(presentFamilies);

  // family -> depth -> names, name-sorted within each cell.
  const cellsByFamily = new Map<string, Map<number, string[]>>();
  for (const family of laneFamilies) cellsByFamily.set(family, new Map());
  for (const name of visibleNames) {
    const family = graph.techniques.get(name)!.family;
    const depth = depths.get(name)!;
    const byDepth = cellsByFamily.get(family)!;
    const cell = byDepth.get(depth);
    if (cell) {
      cell.push(name);
    } else {
      byDepth.set(depth, [name]);
    }
  }
  for (const byDepth of cellsByFamily.values()) {
    for (const [depth, names] of byDepth) {
      byDepth.set(depth, [...names].sort((a, b) => a.localeCompare(b)));
    }
  }

  const maxVisibleDepth = Math.max(...visibleNames.map((name) => depths.get(name)!));
  const columnCount = maxVisibleDepth + 1;

  const lanes: SwimLane[] = [];
  const nodes: MapNode[] = [];
  let runningY = 0;

  for (const family of laneFamilies) {
    const byDepth = cellsByFamily.get(family)!;
    const stack = Math.max(1, ...[...byDepth.values()].map((names) => names.length));
    const height = 2 * LANE_PAD + stack * NODE_H + (stack - 1) * GAP_Y;
    const y = runningY;

    lanes.push({ family, label: labelFor(family), y, height });

    for (const [depth, names] of byDepth) {
      const cellHeight = names.length * NODE_H + (names.length - 1) * GAP_Y;
      const top = y + (height - cellHeight) / 2;
      names.forEach((name, index) => {
        nodes.push({
          name,
          x: colX(depth),
          y: top + index * (NODE_H + GAP_Y),
          lane: family,
          column: depth,
        });
      });
    }

    runningY += height;
  }

  const nodeByName = new Map(nodes.map((n) => [n.name, n]));
  const familyByName = new Map(visibleNames.map((name) => [name, graph.techniques.get(name)!.family]));

  const edges: MapEdge[] = graph.edges
    .filter((e) => nodeByName.has(e.from) && nodeByName.has(e.to))
    .map((e) => {
      const from = nodeByName.get(e.from)!;
      const to = nodeByName.get(e.to)!;
      const x1 = from.x + NODE_W;
      const y1 = from.y + NODE_H / 2;
      const x2 = to.x;
      const y2 = to.y + NODE_H / 2;
      const dx = Math.max(GAP_X, (x2 - x1) / 2);
      const path = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
      return { from: e.from, to: e.to, path, crossLane: familyByName.get(e.from) !== familyByName.get(e.to) };
    });

  const width = columnCount * NODE_W + (columnCount - 1) * GAP_X;
  const height = runningY;

  return { lanes, nodes, edges, width, height, cycleBreakCount };
}
