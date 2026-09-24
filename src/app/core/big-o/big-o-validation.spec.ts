import { isBigOEntry } from './big-o-validation';
import { BigOEntry } from '../models/big-o.model';

function validEntry(): BigOEntry {
  return {
    key: '1216:cache',
    lcNumber: 1216,
    variant: 'cache',
    title: 'Valid Palindrome III',
    url: 'https://leetcode.com/problems/valid-palindrome-iii/',
    file: 'dsa/leetcode/1d_dynamic_programming/1216_valid_palindrome_iii.py',
    symbol: 'kPalindromeDP',
    attemptDate: '2026-09-01',
    difficulty: 'Medium',
    category: '1d_dynamic_programming',
    isMiss: false,
    note: 'per query',
    time: 'O(n²)',
    space: 'O(n²)',
    whyTime: 'The DP table has n² cells, each filled in O(1).',
    whySpace: 'The memo table holds n² entries.',
    timeOptions: ['O(n)', 'O(n log n)', 'O(n²)', 'O(n³)'],
    spaceOptions: ['O(1)', 'O(n)', 'O(n²)', 'O(n³)'],
    segments: [
      {
        kind: 'container',
        symbol: 'Solution',
        startLine: 1,
        endLine: 1,
        lines: ['class Solution:'],
      },
      {
        kind: 'attempt',
        symbol: 'kPalindromeDP',
        startLine: 2,
        endLine: 3,
        lines: ['    def kPalindromeDP(self, s, k):', '        return True'],
      },
    ],
  };
}

describe('isBigOEntry', () => {
  it('accepts a well-formed entry', () => {
    expect(isBigOEntry(validEntry())).toBe(true);
  });

  it('accepts null variant, title, url, attemptDate, note, whyTime, whySpace, and difficulty', () => {
    expect(
      isBigOEntry({
        ...validEntry(),
        variant: null,
        title: null,
        url: null,
        attemptDate: null,
        note: null,
        whyTime: null,
        whySpace: null,
        difficulty: null,
      }),
    ).toBe(true);
  });

  it('rejects a non-string, non-null title', () => {
    expect(isBigOEntry({ ...validEntry(), title: 42 })).toBe(false);
  });

  it('rejects a non-object', () => {
    expect(isBigOEntry(null)).toBe(false);
    expect(isBigOEntry('1216:cache')).toBe(false);
  });

  it('rejects a missing/wrong-typed required string field', () => {
    const { key: _key, ...withoutKey } = validEntry();
    expect(isBigOEntry(withoutKey)).toBe(false);
    expect(isBigOEntry({ ...validEntry(), lcNumber: '1216' })).toBe(false);
  });

  it('rejects an invalid difficulty', () => {
    expect(isBigOEntry({ ...validEntry(), difficulty: 'Expert' })).toBe(false);
  });

  it('rejects a non-boolean isMiss', () => {
    expect(isBigOEntry({ ...validEntry(), isMiss: 'yes' })).toBe(false);
  });

  it('rejects timeOptions with fewer than 4 entries', () => {
    expect(isBigOEntry({ ...validEntry(), timeOptions: ['O(n)', 'O(n²)'] })).toBe(false);
  });

  it('rejects timeOptions that do not include the correct time', () => {
    const entry = validEntry();
    expect(
      isBigOEntry({ ...entry, timeOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'] }),
    ).toBe(false);
  });

  it('rejects spaceOptions that do not include the correct space', () => {
    const entry = validEntry();
    expect(
      isBigOEntry({ ...entry, spaceOptions: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'] }),
    ).toBe(false);
  });

  it('rejects when segments is missing or not an array', () => {
    expect(isBigOEntry({ ...validEntry(), segments: undefined })).toBe(false);
    expect(isBigOEntry({ ...validEntry(), segments: 'not-an-array' })).toBe(false);
  });

  it('rejects a segment whose lines length does not match its line range', () => {
    const entry = validEntry();
    const badSegment = { ...entry.segments[1], endLine: entry.segments[1].endLine + 1 };
    expect(isBigOEntry({ ...entry, segments: [entry.segments[0], badSegment] })).toBe(false);
  });

  it('rejects an unknown segment kind', () => {
    const entry = validEntry();
    const badSegment = { ...entry.segments[0], kind: 'bogus' };
    expect(isBigOEntry({ ...entry, segments: [badSegment] })).toBe(false);
  });
});
