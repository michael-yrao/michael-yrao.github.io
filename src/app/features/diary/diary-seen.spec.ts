import { isEngaged, nextSeenBatch } from './diary-seen';

describe('isEngaged', () => {
  it.each([
    { name: 'neither', ratio: false, center: false, expected: false },
    { name: 'ratio only', ratio: true, center: false, expected: true },
    { name: 'center only', ratio: false, center: true, expected: true },
    { name: 'both', ratio: true, center: true, expected: true },
  ])('$name', ({ ratio, center, expected }) => {
    expect(isEngaged(ratio, center)).toBe(expected);
  });
});

describe('nextSeenBatch', () => {
  it.each([
    { name: 'sends the full set when it grew', sent: ['a'], seen: ['a', 'b'], expected: ['a', 'b'] },
    { name: 'sends the full set when nothing was sent yet', sent: [], seen: ['a'], expected: ['a'] },
    { name: 'sends nothing when the set has not grown', sent: ['a', 'b'], seen: ['a', 'b'], expected: null },
    { name: 'sends nothing when nothing was seen', sent: [], seen: [], expected: null },
  ])('$name', ({ sent, seen, expected }) => {
    expect(nextSeenBatch(new Set(sent), new Set(seen))).toEqual(expected);
  });
});
