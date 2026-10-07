import { shuffle } from './shuffle';

const sequence = (values: readonly number[]): (() => number) => {
  let next = 0;
  return () => values[next++];
};

describe('shuffle', () => {
  // Three items, random sequence [0.5, 0]: i=2 -> j=floor(0.5*3)=1 swaps b,c -> [a,c,b];
  // i=1 -> j=floor(0*2)=0 swaps c,a -> [c,a,b].
  const cases: readonly [string, readonly string[], readonly number[], readonly string[]][] = [
    ['empty', [], [], []],
    ['one item', ['a'], [], ['a']],
    ['three items, fixed random sequence', ['a', 'b', 'c'], [0.5, 0], ['c', 'a', 'b']],
  ];

  it.each(cases)('%s', (_name, input, randoms, expected) => {
    const snapshot = [...input];
    const result = shuffle(input, sequence(randoms));

    expect(result).toEqual(expected);
    expect(result).not.toBe(input);
    expect(input).toEqual(snapshot);
  });
});
