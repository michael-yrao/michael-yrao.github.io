import { graphState } from './graph-state';

describe('graphState', () => {
  const nodes = [
    { id: 1, x: 10, y: 20 },
    { id: 2, x: 30, y: 40, label: 'b' },
  ];
  const edges = [{ from: 1, to: 2 }];

  it('applies defaults, honours explicit options, and omits optional fields not passed', () => {
    const plain = graphState(nodes, edges);
    expect(plain, 'defaults: default states, label kept only where given, no optional keys').toEqual({
      type: 'graph',
      nodes: [
        { id: 1, x: 10, y: 20, state: 'default' },
        { id: 2, x: 30, y: 40, label: 'b', state: 'default' },
      ],
      edges: [{ from: 1, to: 2, state: 'default' }],
    });
    expect(Object.keys(plain), 'no key for an optional field').toEqual(['type', 'nodes', 'edges']);

    const custom = graphState(nodes, edges, {
      nodeState: (node, i) => (i === 0 ? 'active' : node.label ? 'found' : 'default'),
      edgeState: () => 'visited',
      hashmap: { 1: 1 },
      hashmapLabel: 'parentMap',
      hashmap2: { 1: 0 },
      hashmap2Label: 'rankMap',
      stackItems: ['[1, 2]'],
      stackLabel: 'edge',
      counters: [{ label: 'components', value: 2 }],
    });
    expect(custom.nodes.map((n) => n.state), 'nodeState overrides the default').toEqual(['active', 'found']);
    expect(custom.edges[0].state, 'edgeState overrides the default').toBe('visited');
    expect(custom.hashmap, 'hashmap').toEqual({ 1: 1 });
    expect(custom.hashmapLabel, 'hashmapLabel').toBe('parentMap');
    expect(custom.hashmap2, 'hashmap2').toEqual({ 1: 0 });
    expect(custom.hashmap2Label, 'hashmap2Label').toBe('rankMap');
    expect(custom.stackItems, 'stackItems').toEqual(['[1, 2]']);
    expect(custom.stackLabel, 'stackLabel').toBe('edge');
    expect(custom.counters, 'counters').toEqual([{ label: 'components', value: 2 }]);
  });
});
