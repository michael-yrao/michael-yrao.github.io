import { Technique } from '../../../core/models/progress.model';
import {
  buildTechniqueGraph,
  GAP_X,
  layoutLayeredDag,
  NODE_H,
  NODE_W,
  ROW_H,
} from './technique-tree-layout';

function makeTechnique(overrides: Partial<Technique> = {}): Technique {
  return {
    name: 'Two Pointers',
    family: 'Arrays',
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

describe('layoutLayeredDag — depth', () => {
  it('assigns depths 0, 1, 2 along a 3-chain', () => {
    const a = makeTechnique({ name: 'A' });
    const b = makeTechnique({ name: 'B', buildsOn: ['A'] });
    const c = makeTechnique({ name: 'C', buildsOn: ['B'] });
    const layout = layoutLayeredDag(buildTechniqueGraph([a, b, c]));

    const depthOf = (name: string) => layout.nodes.find((n) => n.name === name)!.depth;
    expect(depthOf('A')).toBe(0);
    expect(depthOf('B')).toBe(1);
    expect(depthOf('C')).toBe(2);
  });

  it('a diamond (A -> B, A -> C, B -> D, C -> D) puts D one past its deepest parent', () => {
    const a = makeTechnique({ name: 'A' });
    const b = makeTechnique({ name: 'B', buildsOn: ['A'] });
    const c = makeTechnique({ name: 'C', buildsOn: ['A'] });
    const d = makeTechnique({ name: 'D', buildsOn: ['B', 'C'] });
    const layout = layoutLayeredDag(buildTechniqueGraph([a, b, c, d]));

    const depthOf = (name: string) => layout.nodes.find((n) => n.name === name)!.depth;
    expect(depthOf('A')).toBe(0);
    expect(depthOf('B')).toBe(1);
    expect(depthOf('C')).toBe(1);
    expect(depthOf('D')).toBe(2);
  });

  it('a missing buildsOn endpoint is dropped rather than affecting depth', () => {
    const a = makeTechnique({ name: 'A', buildsOn: ['Ghost'] });
    const layout = layoutLayeredDag(buildTechniqueGraph([a]));

    expect(layout.nodes.find((n) => n.name === 'A')!.depth).toBe(0);
    expect(layout.edges).toEqual([]);
  });

  it('a cycle (A -> B, B -> A) terminates and reports a cycle break instead of hanging', () => {
    const a = makeTechnique({ name: 'A', buildsOn: ['B'] });
    const b = makeTechnique({ name: 'B', buildsOn: ['A'] });
    const layout = layoutLayeredDag(buildTechniqueGraph([a, b]));

    expect(layout.cycleBreakCount).toBeGreaterThan(0);
    expect(Number.isFinite(layout.nodes.find((n) => n.name === 'A')!.depth)).toBe(true);
    expect(Number.isFinite(layout.nodes.find((n) => n.name === 'B')!.depth)).toBe(true);
  });
});

describe('layoutLayeredDag — barycenter ordering', () => {
  it('the down pass settles each child under its own parent, undoing a misleading name-order seed', () => {
    // Both children share a family, so the initial family/name seed alone would order them
    // "ChildOfZeta" (a alphabetically) before "ChildOfAlpha" (z) — backwards from their real
    // parents (Alpha at x=0, Zeta at x=NODE_W+GAP_X). Each child's row is the deepest one, so
    // the up pass never touches it: the down-pass barycenter is the final answer, and a
    // correct implementation reorders (and repositions) both children under their own single
    // parent instead of leaving them in the misleading seed order.
    const alpha = makeTechnique({ name: 'Alpha', family: 'A' });
    const zeta = makeTechnique({ name: 'Zeta', family: 'Z' });
    const childOfZeta = makeTechnique({ name: 'ChildOfZeta', family: 'M', buildsOn: ['Zeta'] });
    const childOfAlpha = makeTechnique({ name: 'ChildOfAlpha', family: 'M', buildsOn: ['Alpha'] });
    const layout = layoutLayeredDag(buildTechniqueGraph([zeta, alpha, childOfZeta, childOfAlpha]));

    const alphaX = layout.nodes.find((n) => n.name === 'Alpha')!.x;
    const zetaX = layout.nodes.find((n) => n.name === 'Zeta')!.x;
    const childOfAlphaX = layout.nodes.find((n) => n.name === 'ChildOfAlpha')!.x;
    const childOfZetaX = layout.nodes.find((n) => n.name === 'ChildOfZeta')!.x;

    expect(childOfAlphaX).toBe(alphaX);
    expect(childOfZetaX).toBe(zetaX);
  });

  it('the up pass pulls a shared parent toward the mean x of its children', () => {
    // Two children in a row of three (Left/Mid/Right), sharing the same single parent —
    // after the up pass, the parent should sit under the mean of Left and Right's x, not
    // wherever the down pass (which had no parents to sort it by) happened to seed it.
    const parent = makeTechnique({ name: 'Parent', family: 'M' });
    const left = makeTechnique({ name: 'Left', family: 'A', buildsOn: ['Parent'] });
    const right = makeTechnique({ name: 'Right', family: 'Z', buildsOn: ['Parent'] });
    const layout = layoutLayeredDag(buildTechniqueGraph([right, parent, left]));

    const parentX = layout.nodes.find((n) => n.name === 'Parent')!.x;
    const leftX = layout.nodes.find((n) => n.name === 'Left')!.x;
    const rightX = layout.nodes.find((n) => n.name === 'Right')!.x;

    expect(parentX).toBeCloseTo((leftX + rightX) / 2);
  });
});

describe('layoutLayeredDag — geometry', () => {
  it('two unrelated roots keep NODE_W + GAP_X apart, and depth advances by ROW_H', () => {
    // Two unrelated roots (Alpha, Beta — already in name order, so the barycenter passes have
    // no parents/children to reorder by and leave the seeded order alone) at depth 0, plus one
    // child at depth 1: exercises both the per-row spacing and the row height step. (This is
    // NOT a claim that every node sits at index × (NODE_W + GAP_X) in general — a node pulled
    // by a shared parent/child settles at the real barycenter x instead; see the "geometry —
    // bounds" describe block below for that case.)
    const alpha = makeTechnique({ name: 'Alpha' });
    const beta = makeTechnique({ name: 'Beta' });
    const child = makeTechnique({ name: 'Child', buildsOn: ['Alpha'] });
    const layout = layoutLayeredDag(buildTechniqueGraph([alpha, beta, child]));

    const nodeAlpha = layout.nodes.find((n) => n.name === 'Alpha')!;
    const nodeBeta = layout.nodes.find((n) => n.name === 'Beta')!;
    const nodeChild = layout.nodes.find((n) => n.name === 'Child')!;

    expect(nodeAlpha.x).toBe(0);
    expect(nodeAlpha.y).toBe(0);
    expect(nodeBeta.x).toBe(NODE_W + GAP_X);
    expect(nodeBeta.y).toBe(0);
    expect(nodeChild.y).toBe(ROW_H);
  });

  it('draws one edge per valid buildsOn pair, each as an M/C path string', () => {
    const a = makeTechnique({ name: 'A' });
    const b = makeTechnique({ name: 'B', buildsOn: ['A'] });
    const layout = layoutLayeredDag(buildTechniqueGraph([a, b]));

    expect(layout.edges.length).toBe(1);
    expect(layout.edges[0].path).toMatch(/^M .+ C .+/);
  });

  it('a technique with no buildsOn (and nothing pointing at it) is a depth-0 root with no edges', () => {
    const solo = makeTechnique({ name: 'Solo' });
    const layout = layoutLayeredDag(buildTechniqueGraph([solo]));

    expect(layout.nodes).toEqual([{ name: 'Solo', x: 0, y: 0, depth: 0 }]);
    expect(layout.edges).toEqual([]);
  });
});

describe('layoutLayeredDag — geometry: bounds', () => {
  // A second, childless root (RootA, family 'A' — seeded before RootB) sits at x=0; RootB
  // (family 'Z') has 4 children, so the up pass pulls RootB toward their mean x, landing it
  // well right of 0, exactly the "a row's first node isn't at x=0" shape that under- sized
  // `width` (computed from row lengths alone) used to clip.
  function fourChildrenFixture(): Technique[] {
    const rootA = makeTechnique({ name: 'RootA', family: 'A' });
    const rootB = makeTechnique({ name: 'RootB', family: 'Z' });
    const children = ['C1', 'C2', 'C3', 'C4'].map((name) =>
      makeTechnique({ name, family: 'M', buildsOn: ['RootB'] }),
    );
    return [rootA, rootB, ...children];
  }

  it('every node stays within [0, width] and [0, height]', () => {
    const layout = layoutLayeredDag(buildTechniqueGraph(fourChildrenFixture()));

    // The bug this guards against: a barycenter-placed row not starting at x=0 (RootB's
    // children row here) used to extend past a width sized from row length alone.
    const rootBChildrenX = layout.nodes.filter((n) => n.depth === 1).map((n) => n.x);
    expect(Math.min(...rootBChildrenX)).toBeGreaterThan(0);

    for (const node of layout.nodes) {
      expect(node.x).toBeGreaterThanOrEqual(0);
      expect(node.x + NODE_W).toBeLessThanOrEqual(layout.width);
      expect(node.y).toBeGreaterThanOrEqual(0);
      expect(node.y + NODE_H).toBeLessThanOrEqual(layout.height);
    }
  });

  it('within each row, consecutive nodes (sorted by x) are at least NODE_W + GAP_X apart', () => {
    const layout = layoutLayeredDag(buildTechniqueGraph(fourChildrenFixture()));

    const byDepth = new Map<number, number[]>();
    for (const node of layout.nodes) {
      const xs = byDepth.get(node.depth) ?? [];
      xs.push(node.x);
      byDepth.set(node.depth, xs);
    }

    for (const xs of byDepth.values()) {
      const sorted = [...xs].sort((a, b) => a - b);
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i] - sorted[i - 1]).toBeGreaterThanOrEqual(NODE_W + GAP_X);
      }
    }
  });
});
