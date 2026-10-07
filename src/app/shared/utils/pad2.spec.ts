import { pad2 } from './pad2';

describe('pad2', () => {
  it.each([
    [0, '00'],
    [7, '07'],
    [12, '12'],
    [123, '123'],
  ])('pads %i to %s', (value, expected) => {
    expect(pad2(value)).toBe(expected);
  });
});
