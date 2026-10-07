import { ArrayState } from '../models/algorithm.model';
import { arrayState } from './array-state';

describe('arrayState', () => {
  it('applies defaults, honours explicit options, and omits optional fields not passed', () => {
    const pointers = [{ index: 1, label: 'l' }];
    const counters = [{ label: 'n', value: 2 }];
    const rows: [string, ArrayState, ArrayState][] = [
      [
        'defaults: every cell default, no pointers, no optional keys',
        arrayState([4, 'b']),
        { type: 'array', cells: [{ value: 4, state: 'default' }, { value: 'b', state: 'default' }], pointers: [] },
      ],
      [
        'cellState and pointers override the defaults',
        arrayState([4, 5], { cellState: (i) => (i === 1 ? 'active' : 'default'), pointers }),
        { type: 'array', cells: [{ value: 4, state: 'default' }, { value: 5, state: 'active' }], pointers },
      ],
      [
        'passed optional fields appear',
        arrayState([4], { hashmap: { a: 1 }, hashmapLabel: 'seen', counters }),
        { type: 'array', cells: [{ value: 4, state: 'default' }], pointers: [], hashmap: { a: 1 }, hashmapLabel: 'seen', counters },
      ],
    ];
    for (const [label, actual, expected] of rows) {
      expect(actual, label).toEqual(expected);
    }
    expect(Object.keys(arrayState([1])), 'no key for an optional field').toEqual(['type', 'cells', 'pointers']);
  });
});
