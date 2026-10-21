import { matchesAnyText, matchesNumberOrTitle, normaliseQuery } from './text-search';

describe('normaliseQuery', () => {
  it.each([
    { query: ' #12 ', expected: '12' },
    { query: 'Two SUM', expected: 'two sum' },
    { query: '  ', expected: '' },
  ])('$query -> $expected', ({ query, expected }) => {
    expect(normaliseQuery(query)).toBe(expected);
  });
});

describe('matchesNumberOrTitle', () => {
  it.each([
    { number: 1, title: 'Two Sum', needle: '1', expected: true },
    { number: 10, title: 'X', needle: '1', expected: true },
    { number: 21, title: 'X', needle: '1', expected: false },
    { number: 1, title: 'Two Sum', needle: 'o s', expected: true },
    { number: 1, title: 'Two Sum', needle: 'three', expected: false },
    { number: 1, title: 'Two Sum', needle: '', expected: true },
  ])('($number, $title, "$needle") -> $expected', ({ number, title, needle, expected }) => {
    expect(matchesNumberOrTitle(number, title, needle)).toBe(expected);
  });
});

describe('matchesAnyText', () => {
  it.each([
    { name: 'hit in the second field', fields: ['alpha', 'Beta Gamma'], needle: 'gamma', expected: true },
    { name: 'miss', fields: ['alpha', 'beta'], needle: 'zeta', expected: false },
    { name: 'empty needle', fields: ['alpha'], needle: '', expected: true },
  ])('$name', ({ fields, needle, expected }) => {
    expect(matchesAnyText(fields, needle)).toBe(expected);
  });
});
