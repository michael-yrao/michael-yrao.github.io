import { GraphState, GridState } from '../models/algorithm.model';
import { PracticeFigure } from '../models/practice.model';
import { MAX_FIGURE_NODES, MAX_MATRIX_FIGURE_NODES, figureStateFor } from './example-figure';

const GRAPH: PracticeFigure = { kind: 'graph', directed: true, edgesArg: 1, nodeCountArg: 0 };
const GRAPH_NO_COUNT: PracticeFigure = { kind: 'graph', directed: false, edgesArg: 0, nodeCountArg: null };
const GRID: PracticeFigure = { kind: 'grid', gridArg: 0 };

const nodeIds = (state: GraphState | GridState | null): unknown[] =>
  (state as GraphState).nodes.map((n) => n.id);

describe('figureStateFor', () => {
  it('draws the input of a graph or a grid, and nothing when the arguments do not fit', () => {
    const weighted = figureStateFor(GRAPH, [3, [[0, 1, 5], [1, 0, -2], [1, 2]]], null) as GraphState;
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

    expect(nodeIds(figureStateFor(GRAPH, [5, [[0, 1]]], null))).toEqual([0, 1, 2, 3, 4]);
    expect(nodeIds(figureStateFor(GRAPH_NO_COUNT, [[[7, 3], [3, 3]]], null))).toEqual([3, 7]);

    const grid = figureStateFor(GRID, [[[1, 0, 1], ['a', 2, 3]]], null) as GridState;
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
      expect(figureStateFor(figure, args, null), label).toBeNull();
    }

    const args = [3, [[0, 1, 5]]];
    const snapshot = structuredClone(args);
    figureStateFor(GRAPH, args, null);
    expect(args).toEqual(snapshot);
  });
  it('draws matrix, adjacency-list, named and highlighted graphs, and nothing when they do not fit', () => {
    const MATRIX: PracticeFigure = { kind: 'graph', directed: false, matrixArg: 0 };
    const ADJ_1BASED: PracticeFigure = { kind: 'graph', directed: false, adjArg: 0, oneBased: true };
    const NAMED: PracticeFigure = { kind: 'graph', directed: false, edgesArg: 0, nodeCountArg: null };
    const NODES_ARG: PracticeFigure = { kind: 'graph', directed: false, edgesArg: 0, nodeCountArg: null, nodesArg: 1 };
    const HIGHLIGHT: PracticeFigure = { kind: 'graph', directed: false, edgesArg: 0, nodeCountArg: null, highlight: 'expected' };
    const square = (n: number): number[][] => Array.from({ length: n }, () => Array<number>(n).fill(0));
    const summary = (state: GraphState | GridState | null) => {
      const g = state as GraphState;
      return {
        nodes: g.nodes.map((n) => n.id),
        labels: g.nodes.map((n) => n.label),
        edges: g.edges.map((e) => [e.from, e.to, e.label, e.state]),
      };
    };

    const matrix = figureStateFor(MATRIX, [[[7, 2, 0], [2, 9, 3], [0, 3, 0]]], null);
    expect(summary(matrix).nodes).toEqual([0, 1, 2]);
    expect(summary(matrix).edges).toEqual([[0, 1, '2', 'default'], [1, 2, '3', 'default']]);

    const adjacency = figureStateFor(ADJ_1BASED, [[[2, 3], [1], [1]]], null);
    expect(summary(adjacency).nodes).toEqual([1, 2, 3]);
    expect(summary(adjacency).edges).toEqual([[1, 2, undefined, 'default'], [1, 3, undefined, 'default']]);

    const named = figureStateFor(NAMED, [[['b', 'a', 4], ['a', 2]]], null);
    expect(summary(named).nodes).toEqual([2, 'a', 'b']);
    expect(summary(named).labels).toEqual([undefined, 'a', 'b']);
    expect(summary(named).edges[0]).toEqual(['b', 'a', '4', 'default']);

    const listed = figureStateFor(NODES_ARG, [[['b', 'a']], ['z', 'b', 'a']], null);
    expect(summary(listed).nodes).toEqual(['z', 'b', 'a']);

    const highlighted = figureStateFor(HIGHLIGHT, [[[0, 1], [1, 2]]], [[1, 0], [5, 6]]);
    expect(summary(highlighted).edges.map((e) => e[3])).toEqual(['found', 'default']);
    const unhighlighted = figureStateFor(HIGHLIGHT, [[[0, 1], [1, 2]]], 3);
    expect(summary(unhighlighted).edges.map((e) => e[3])).toEqual(['default', 'default']);

    const MATRIX_EXPECTED: PracticeFigure = { kind: 'graph', directed: false, matrixArg: 0, edges: 'expected' };
    const distances = [[0, 1, 1, 2], [1, 0, 2, 3], [1, 2, 0, 3], [2, 3, 3, 0]];
    const fromAnswer = figureStateFor(MATRIX_EXPECTED, [distances], [[0, 1], [0, 2], [0, 3]]);
    expect(summary(fromAnswer).nodes).toEqual([0, 1, 2, 3]);
    expect(summary(fromAnswer).edges).toEqual([[0, 1, '1', 'default'], [0, 2, '1', 'default'], [0, 3, '2', 'default']]);

    const answerMisfits: [string, unknown][] = [
      ['expected not a list of pairs', 5],
      ['pair naming a node outside the matrix', [[0, 4]]],
    ];
    for (const [label, expected] of answerMisfits) {
      expect(figureStateFor(MATRIX_EXPECTED, [distances], expected), label).toBeNull();
    }

    const misfits: [string, PracticeFigure, unknown[]][] = [
      ['matrix over the cap', MATRIX, [square(MAX_MATRIX_FIGURE_NODES + 1)]],
      ['non-square matrix', MATRIX, [[[0, 1], [1, 0], [0, 0]]]],
      ['adjacency neighbour out of range', ADJ_1BASED, [[[2], [0]]]],
      ['edge endpoint missing from nodesArg', NODES_ARG, [[['a', 'c']], ['a', 'b']]],
    ];
    for (const [label, figure, args] of misfits) {
      expect(figureStateFor(figure, args, null), label).toBeNull();
    }
  });
});
