import { linkedListState } from './linked-list-state';

describe('linkedListState', () => {
  it('applies defaults, honours explicit options, and adds no optional keys', () => {
    const plain = linkedListState([1, 2]);
    expect(plain, 'defaults: n-prefixed ids, chained nextId, default states, no pointers').toEqual({
      type: 'linked-list',
      nodes: [
        { id: 'n0', value: 1, nextId: 'n1', state: 'default' },
        { id: 'n1', value: 2, nextId: null, state: 'default' },
      ],
      pointers: [],
    });
    expect(Object.keys(plain), 'no key for an optional field').toEqual(['type', 'nodes', 'pointers']);

    const pointers = [{ nodeId: 'r1', label: 'head' }];
    const custom = linkedListState([7, 8], {
      idPrefix: 'r',
      nodeState: (i) => (i === 1 ? 'done' : 'default'),
      pointers,
    });
    expect(custom.nodes.map((n) => [n.id, n.nextId, n.state]), 'idPrefix and nodeState override the defaults').toEqual([
      ['r0', 'r1', 'default'],
      ['r1', null, 'done'],
    ]);
    expect(custom.pointers, 'pointers override the default').toBe(pointers);

    const result = linkedListState([3], { idPrefix: 'r' }).nodes;
    expect(linkedListState([1], { result }).result, 'a passed result appears').toBe(result);
  });
});
