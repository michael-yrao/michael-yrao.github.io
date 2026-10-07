import { treeState } from './tree-state';

describe('treeState', () => {
  const nodes = [
    { id: 'n0', value: 4, leftId: 'n1', rightId: null },
    { id: 'n1', value: 2, leftId: null, rightId: null },
  ];

  it('defaults node states and adds no optional keys', () => {
    const plain = treeState(nodes);
    expect(plain, 'defaults: every node default').toEqual({
      type: 'tree',
      nodes: [
        { id: 'n0', value: 4, leftId: 'n1', rightId: null, state: 'default' },
        { id: 'n1', value: 2, leftId: null, rightId: null, state: 'default' },
      ],
    });
    expect(Object.keys(plain), 'no key for an optional field').toEqual(['type', 'nodes']);
  });

  it('explicit nodeState overrides the default', () => {
    const state = treeState(nodes, { nodeState: (node) => (node.id === 'n1' ? 'active' : 'default') });
    expect(
      state.nodes.map((node) => node.state),
      'n1 takes the mapped state, n0 stays default',
    ).toEqual(['default', 'active']);
  });

  it('emits pointers and counters only when passed', () => {
    const pointers = [{ nodeId: 'n0', label: 'here' }];
    const counters = [{ label: 'depth', value: 1 }];
    const full = treeState(nodes, { pointers, counters });
    expect(full.pointers, 'passed pointers are kept').toEqual(pointers);
    expect(full.counters, 'passed counters are kept').toEqual(counters);
    expect(Object.keys(treeState(nodes, { pointers: [] })), 'an empty pointers array is still emitted').toEqual(['type', 'nodes', 'pointers']);
  });
});
