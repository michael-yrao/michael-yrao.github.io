import { Technique } from '../../../core/models/progress.model';
import {
  buildTechniqueGraph,
  computeDepths,
  EXPANSION_FAMILY,
  GAP_X,
  GAP_Y,
  LANE_PAD,
  layoutSwimlanes,
  NODE_H,
  NODE_W,
} from './technique-map-layout';

function makeTechnique(overrides: Partial<Technique> = {}): Technique {
  return {
    name: 'Two Pointers',
    family: 'two_pointers',
    tier: 'core',
    started: true,
    minProblems: 3,
    problemCount: 1,
    problems: [11],
    bestComfort: '🟡',
    hasGreen: false,
    thin: true,
    hasVariantGap: false,
    ...overrides,
  };
}

describe('buildTechniqueGraph', () => {
  it('keys nodes by name and builds one edge per valid buildsOn entry', () => {
    const a = makeTechnique({ name: 'A' });
    const b = makeTechnique({ name: 'B', buildsOn: ['A'] });
    const graph = buildTechniqueGraph([a, b]);

    expect(graph.techniques.size).toBe(2);
    expect(graph.edges).toEqual([{ from: 'A', to: 'B' }]);
    expect(graph.droppedEdgeCount).toBe(0);
  });

  it('drops an edge whose prerequisite name is missing, and counts it', () => {
    const b = makeTechnique({ name: 'B', buildsOn: ['Nonexistent', 'AlsoMissing'] });
    const graph = buildTechniqueGraph([b]);

    expect(graph.edges).toEqual([]);
    expect(graph.droppedEdgeCount).toBe(2);
  });

  it('never mutates the input techniques array', () => {
    const a = makeTechnique({ name: 'A' });
    const b = makeTechnique({ name: 'B', buildsOn: ['A'] });
    const input = [a, b];
    const frozen = [...input];

    buildTechniqueGraph(input);

    expect(input).toEqual(frozen);
  });
});

describe('computeDepths', () => {
  it('assigns depths 0, 1, 2 along a 3-chain', () => {
    const a = makeTechnique({ name: 'A' });
    const b = makeTechnique({ name: 'B', buildsOn: ['A'] });
    const c = makeTechnique({ name: 'C', buildsOn: ['B'] });
    const { depths } = computeDepths(buildTechniqueGraph([a, b, c]));

    expect(depths.get('A')).toBe(0);
    expect(depths.get('B')).toBe(1);
    expect(depths.get('C')).toBe(2);
  });

  it('a diamond (A -> B, A -> C, B -> D, C -> D) puts D one past its deepest parent', () => {
    const a = makeTechnique({ name: 'A' });
    const b = makeTechnique({ name: 'B', buildsOn: ['A'] });
    const c = makeTechnique({ name: 'C', buildsOn: ['A'] });
    const d = makeTechnique({ name: 'D', buildsOn: ['B', 'C'] });
    const { depths } = computeDepths(buildTechniqueGraph([a, b, c, d]));

    expect(depths.get('A')).toBe(0);
    expect(depths.get('B')).toBe(1);
    expect(depths.get('C')).toBe(1);
    expect(depths.get('D')).toBe(2);
  });

  it('a missing buildsOn endpoint is dropped rather than affecting depth', () => {
    const a = makeTechnique({ name: 'A', buildsOn: ['Ghost'] });
    const graph = buildTechniqueGraph([a]);
    const { depths } = computeDepths(graph);

    expect(depths.get('A')).toBe(0);
    expect(graph.edges).toEqual([]);
  });

  it('a cycle (A -> B, B -> A) terminates and reports a cycle break instead of hanging', () => {
    const a = makeTechnique({ name: 'A', buildsOn: ['B'] });
    const b = makeTechnique({ name: 'B', buildsOn: ['A'] });
    const { depths, cycleBreakCount } = computeDepths(buildTechniqueGraph([a, b]));

    expect(cycleBreakCount).toBeGreaterThan(0);
    expect(Number.isFinite(depths.get('A'))).toBe(true);
    expect(Number.isFinite(depths.get('B'))).toBe(true);
  });
});

describe('layoutSwimlanes — lane order', () => {
  it('orders known families per LANE_ORDER, an unknown family after known and before expansion, expansion last', () => {
    const techniques = [
      makeTechnique({ name: 'Heap1', family: 'heap' }),
      makeTechnique({ name: 'Arr1', family: 'arrays_and_hash' }),
      makeTechnique({ name: 'Exp1', family: EXPANSION_FAMILY }),
      makeTechnique({ name: 'Unknown1', family: 'zzz_unknown' }),
      makeTechnique({ name: 'TwoP1', family: 'two_pointers' }),
    ];
    const layout = layoutSwimlanes(buildTechniqueGraph(techniques));

    expect(layout.lanes.map((l) => l.family)).toEqual([
      'arrays_and_hash',
      'two_pointers',
      'heap',
      'zzz_unknown',
      EXPANSION_FAMILY,
    ]);
  });

  it('gives no lane to a family with no visible technique', () => {
    const layout = layoutSwimlanes(buildTechniqueGraph([makeTechnique({ family: 'heap' })]));
    expect(layout.lanes.map((l) => l.family)).toEqual(['heap']);
  });

  it('labels a known family with its curated human name, and falls back to the raw family string for an unknown one', () => {
    const layout = layoutSwimlanes(
      buildTechniqueGraph([
        makeTechnique({ name: 'A', family: 'arrays_and_hash' }),
        makeTechnique({ name: 'B', family: 'zzz_unknown' }),
      ]),
    );

    const labelOf = (family: string) => layout.lanes.find((l) => l.family === family)!.label;
    expect(labelOf('arrays_and_hash')).toBe('Arrays & Hashing');
    expect(labelOf('zzz_unknown')).toBe('zzz_unknown');
  });
});

describe('layoutSwimlanes — column/x', () => {
  it('places a node at column = its depth, x = column * (NODE_W + GAP_X)', () => {
    const a = makeTechnique({ name: 'A', family: 'heap' });
    const b = makeTechnique({ name: 'B', family: 'heap', buildsOn: ['A'] });
    const c = makeTechnique({ name: 'C', family: 'heap', buildsOn: ['B'] });
    const layout = layoutSwimlanes(buildTechniqueGraph([a, b, c]));

    const nodeOf = (name: string) => layout.nodes.find((n) => n.name === name)!;
    expect(nodeOf('A').column).toBe(0);
    expect(nodeOf('A').x).toBe(0);
    expect(nodeOf('B').column).toBe(1);
    expect(nodeOf('B').x).toBe(NODE_W + GAP_X);
    expect(nodeOf('C').column).toBe(2);
    expect(nodeOf('C').x).toBe(2 * (NODE_W + GAP_X));
  });
});

describe('layoutSwimlanes — stacking within a cell', () => {
  it('stacks same-column, same-family nodes name-sorted, sharing x, stepping y by NODE_H + GAP_Y', () => {
    const techniques = ['Charlie', 'Alpha', 'Bravo'].map((name) =>
      makeTechnique({ name, family: 'heap' }),
    );
    const layout = layoutSwimlanes(buildTechniqueGraph(techniques));

    const byName = new Map(layout.nodes.map((n) => [n.name, n]));
    expect(byName.get('Alpha')!.x).toBe(byName.get('Bravo')!.x);
    expect(byName.get('Bravo')!.x).toBe(byName.get('Charlie')!.x);

    const sortedByY = [...layout.nodes].sort((x, y) => x.y - y.y).map((n) => n.name);
    expect(sortedByY).toEqual(['Alpha', 'Bravo', 'Charlie']);
    expect(byName.get('Bravo')!.y - byName.get('Alpha')!.y).toBe(NODE_H + GAP_Y);
    expect(byName.get('Charlie')!.y - byName.get('Bravo')!.y).toBe(NODE_H + GAP_Y);
  });
});

describe('layoutSwimlanes — lane geometry', () => {
  it('a lane height is 2*LANE_PAD + stack*NODE_H + (stack-1)*GAP_Y, for stacks of 1 and 3', () => {
    const single = layoutSwimlanes(buildTechniqueGraph([makeTechnique({ family: 'heap' })]));
    expect(single.lanes[0].height).toBe(2 * LANE_PAD + 1 * NODE_H);

    const stackOf3 = ['A', 'B', 'C'].map((name) => makeTechnique({ name, family: 'heap' }));
    const layout3 = layoutSwimlanes(buildTechniqueGraph(stackOf3));
    expect(layout3.lanes[0].height).toBe(2 * LANE_PAD + 3 * NODE_H + 2 * GAP_Y);
  });

  it('a single node in a taller lane is vertically centred within the lane', () => {
    // Depth 0 has one node (Solo); depth 1 has two (B, C, both built on Solo) — so the lane's
    // stack is 2, and Solo (a 1-node cell) should sit centred within that taller lane height.
    const solo = makeTechnique({ name: 'Solo', family: 'heap' });
    const b = makeTechnique({ name: 'B', family: 'heap', buildsOn: ['Solo'] });
    const c = makeTechnique({ name: 'C', family: 'heap', buildsOn: ['Solo'] });
    const layout = layoutSwimlanes(buildTechniqueGraph([solo, b, c]));

    const lane = layout.lanes[0];
    const soloNode = layout.nodes.find((n) => n.name === 'Solo')!;
    const cellHeight = NODE_H;
    expect(soloNode.y).toBe(lane.y + (lane.height - cellHeight) / 2);
  });

  it('the second lane starts where the first lane ends; total height is the sum of lane heights', () => {
    const layout = layoutSwimlanes(
      buildTechniqueGraph([
        makeTechnique({ name: 'A', family: 'arrays_and_hash' }),
        makeTechnique({ name: 'B', family: 'heap' }),
      ]),
    );

    expect(layout.lanes[0].y).toBe(0);
    expect(layout.lanes[1].y).toBe(layout.lanes[0].height);
    expect(layout.height).toBe(layout.lanes[0].height + layout.lanes[1].height);
  });

  it('every node coordinate is an integer', () => {
    const techniques = ['A', 'B', 'C', 'D', 'E'].map((name, i) =>
      makeTechnique({ name, family: i % 2 === 0 ? 'heap' : 'arrays_and_hash' }),
    );
    const layout = layoutSwimlanes(buildTechniqueGraph(techniques));

    for (const node of layout.nodes) {
      expect(Number.isInteger(node.x)).toBe(true);
      expect(Number.isInteger(node.y)).toBe(true);
    }
    for (const lane of layout.lanes) {
      expect(Number.isInteger(lane.y)).toBe(true);
      expect(Number.isInteger(lane.height)).toBe(true);
    }
  });
});

describe('layoutSwimlanes — width/bounds', () => {
  it('width = columnCount * NODE_W + (columnCount-1) * GAP_X', () => {
    const a = makeTechnique({ name: 'A', family: 'heap' });
    const b = makeTechnique({ name: 'B', family: 'heap', buildsOn: ['A'] });
    const layout = layoutSwimlanes(buildTechniqueGraph([a, b]));

    expect(layout.width).toBe(2 * NODE_W + GAP_X);
  });

  it('an empty input yields a zero-size layout with no lanes', () => {
    const layout = layoutSwimlanes(buildTechniqueGraph([]));
    expect(layout).toEqual({ lanes: [], nodes: [], edges: [], width: 0, height: 0, cycleBreakCount: 0 });
  });

  it('every node stays within [0, width] x [0, height]', () => {
    const techniques = [
      makeTechnique({ name: 'A', family: 'arrays_and_hash' }),
      makeTechnique({ name: 'B', family: 'heap', buildsOn: ['A'] }),
      makeTechnique({ name: 'C', family: 'heap', buildsOn: ['A'] }),
      makeTechnique({ name: 'D', family: 'graphs', buildsOn: ['B', 'C'] }),
    ];
    const layout = layoutSwimlanes(buildTechniqueGraph(techniques));

    for (const node of layout.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.x + NODE_W).toBeLessThanOrEqual(layout.width);
      expect(node.y).toBeGreaterThanOrEqual(0);
      expect(node.y + NODE_H).toBeLessThanOrEqual(layout.height);
    }
  });
});

describe('layoutSwimlanes — edges', () => {
  it('classifies an edge crossLane by whether its endpoints share a family', () => {
    const a = makeTechnique({ name: 'A', family: 'heap' });
    const b = makeTechnique({ name: 'B', family: 'heap', buildsOn: ['A'] });
    const c = makeTechnique({ name: 'C', family: 'graphs', buildsOn: ['A'] });
    const layout = layoutSwimlanes(buildTechniqueGraph([a, b, c]));

    const edgeTo = (name: string) => layout.edges.find((e) => e.to === name)!;
    expect(edgeTo('B').crossLane).toBe(false);
    expect(edgeTo('C').crossLane).toBe(true);
  });

  it('every edge path is an M/C string whose endpoints match the from/to node geometry', () => {
    const a = makeTechnique({ name: 'A', family: 'heap' });
    const b = makeTechnique({ name: 'B', family: 'heap', buildsOn: ['A'] });
    const layout = layoutSwimlanes(buildTechniqueGraph([a, b]));

    const nodeA = layout.nodes.find((n) => n.name === 'A')!;
    const nodeB = layout.nodes.find((n) => n.name === 'B')!;
    const edge = layout.edges[0];

    const match = edge.path.match(/^M ([\d.]+) ([\d.]+) C .+, .+, ([\d.]+) ([\d.]+)$/);
    expect(match).not.toBeNull();
    const [, x1, y1, x2, y2] = match!.map(Number) as unknown as [never, number, number, number, number];
    expect(x1).toBe(nodeA.x + NODE_W);
    expect(y1).toBe(nodeA.y + NODE_H / 2);
    expect(x2).toBe(nodeB.x);
    expect(y2).toBe(nodeB.y + NODE_H / 2);
  });

  it('on an acyclic graph, every edge points strictly rightward (to.x > from.x)', () => {
    const techniques = [
      makeTechnique({ name: 'A', family: 'arrays_and_hash' }),
      makeTechnique({ name: 'B', family: 'heap', buildsOn: ['A'] }),
      makeTechnique({ name: 'C', family: 'graphs', buildsOn: ['B'] }),
    ];
    const layout = layoutSwimlanes(buildTechniqueGraph(techniques));
    const nodeByName = new Map(layout.nodes.map((n) => [n.name, n]));

    for (const edge of layout.edges) {
      expect(nodeByName.get(edge.to)!.x).toBeGreaterThan(nodeByName.get(edge.from)!.x);
    }
  });

  it('omits an edge touching a hidden node', () => {
    const techniques = [
      makeTechnique({ name: 'A', family: 'heap' }),
      makeTechnique({ name: 'B', family: EXPANSION_FAMILY, buildsOn: ['A'] }),
    ];
    const layout = layoutSwimlanes(buildTechniqueGraph(techniques), {
      hiddenFamilies: new Set([EXPANSION_FAMILY]),
    });
    expect(layout.edges).toEqual([]);
  });
});

describe('layoutSwimlanes — hiddenFamilies', () => {
  it('hides a family’s nodes, lane, and edges while leaving visible columns unchanged', () => {
    const techniques = [
      makeTechnique({ name: 'A', family: 'arrays_and_hash' }),
      makeTechnique({ name: 'B', family: 'heap', buildsOn: ['A'] }),
      makeTechnique({ name: 'Exp', family: EXPANSION_FAMILY, buildsOn: ['B'] }),
    ];
    const graph = buildTechniqueGraph(techniques);

    const full = layoutSwimlanes(graph);
    const collapsed = layoutSwimlanes(graph, { hiddenFamilies: new Set([EXPANSION_FAMILY]) });

    expect(collapsed.lanes.map((l) => l.family)).toEqual(['arrays_and_hash', 'heap']);
    expect(collapsed.nodes.some((n) => n.name === 'Exp')).toBe(false);
    expect(collapsed.edges.some((e) => e.to === 'Exp')).toBe(false);

    // Depths are computed on the full graph before hiding, so A/B's columns don't shift when
    // the expansion lane (which sat at a deeper column) is toggled off.
    const fullNodeA = full.nodes.find((n) => n.name === 'A')!;
    const fullNodeB = full.nodes.find((n) => n.name === 'B')!;
    const collapsedNodeA = collapsed.nodes.find((n) => n.name === 'A')!;
    const collapsedNodeB = collapsed.nodes.find((n) => n.name === 'B')!;
    expect(collapsedNodeA.x).toBe(fullNodeA.x);
    expect(collapsedNodeB.x).toBe(fullNodeB.x);
  });

  it('hiding every family yields a zero-size layout with no lanes', () => {
    const graph = buildTechniqueGraph([makeTechnique({ name: 'A', family: 'heap' })]);
    const layout = layoutSwimlanes(graph, { hiddenFamilies: new Set(['heap']) });
    expect(layout).toEqual({ lanes: [], nodes: [], edges: [], width: 0, height: 0, cycleBreakCount: 0 });
  });
});

describe('layoutSwimlanes — purity', () => {
  it('never mutates the graph or the options passed in', () => {
    const techniques = [
      makeTechnique({ name: 'A', family: 'heap' }),
      makeTechnique({ name: 'B', family: 'heap', buildsOn: ['A'] }),
    ];
    const graph = buildTechniqueGraph(techniques);
    const frozenEdges = [...graph.edges];
    const hiddenFamilies = new Set(['heap']);
    const frozenHidden = new Set(hiddenFamilies);

    layoutSwimlanes(graph, { hiddenFamilies });

    expect(graph.edges).toEqual(frozenEdges);
    expect(hiddenFamilies).toEqual(frozenHidden);
  });
});
