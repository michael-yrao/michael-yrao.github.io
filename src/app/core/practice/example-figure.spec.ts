import { GraphState, GridState } from '../models/algorithm.model';
import { PracticeFigure } from '../models/practice.model';
import { MAX_FIGURE_NODES, figureStateFor } from './example-figure';

const GRAPH: PracticeFigure = { kind: 'graph', directed: true, edgesArg: 1, nodeCountArg: 0 };
const GRAPH_NO_COUNT: PracticeFigure = { kind: 'graph', directed: false, edgesArg: 0, nodeCountArg: null };
const GRID: PracticeFigure = { kind: 'grid', gridArg: 0 };

const nodeIds = (state: GraphState | GridState | null): unknown[] =>
  (state as GraphState).nodes.map((n) => n.id);

describe('figureStateFor', () => {
  it('draws the input of a graph or a grid, and nothing when the arguments do not fit', () => {
    const weighted = figureStateFor(GRAPH, [3, [[0, 1, 5], [1, 0, -2], [1, 2]]]) as GraphState;
    expect(weighted.directed).toBe(true);
    expect(weighted.nodes.map((n) => n.id)).toEqual([0, 1, 2]);
    expect(weighted.nodes.every((n) => n.state === 'default')).toBe(true);
    expect(weighted.edges).toEqual([
      { from: 0, to: 1, state: 'default', label: '5' },
      { from: 1, to: 0, state: 'default', label: '-2' },
      { from: 1, to: 2, state: 'default' },
    ]);
    // First node at the top of the circle.
    expect(weighted.nodes[0].x).toBeCloseTo(0);
    expect(weighted.nodes[0].y).toBeLessThan(0);

    expect(nodeIds(figureStateFor(GRAPH, [5, [[0, 1]]]))).toEqual([0, 1, 2, 3, 4]);
    expect(nodeIds(figureStateFor(GRAPH_NO_COUNT, [[[7, 3], [3, 3]]]))).toEqual([3, 7]);

    const grid = figureStateFor(GRID, [[[1, 0, 1], ['a', 2, 3]]]) as GridState;
    expect(grid.grid.map((row) => row.map((cell) => cell.label))).toEqual([['1', '0', '1'], ['a', '2', '3']]);
    expect(grid.grid[0][0].state).toBe('empty');

    const misfits: [string, PracticeFigure, unknown[]][] = [
      ['edge list not an array', GRAPH, [3, 'x']],
      ['edge with a non-integer endpoint', GRAPH, [3, [[0, 1.5]]]],
      ['endpoint outside the node count', GRAPH, [2, [[0, 5]]]],
      ['ragged matrix', GRID, [[[1, 2], [3]]]],
      ['graph above the node cap', GRAPH, [MAX_FIGURE_NODES + 1, []]],
    ];
    for (const [label, figure, args] of misfits) {
      expect(figureStateFor(figure, args), label).toBeNull();
    }

    const args = [3, [[0, 1, 5]]];
    const snapshot = structuredClone(args);
    figureStateFor(GRAPH, args);
    expect(args).toEqual(snapshot);
  });
});
