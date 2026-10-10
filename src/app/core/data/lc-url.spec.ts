import { externalJudgeUrlFor } from './lc-url';

const LEETCODE_URL = 'https://leetcode.com/problems/letter-combinations-of-a-phone-number/';
const NEETCODE_URL = 'https://neetcode.io/problems/letter-combinations-of-a-phone-number';
const SITE_URL = 'https://progressiveoverflow.com/practice/9003';
const LC_NUMBER = 17;

describe('externalJudgeUrlFor', () => {
  const cases: readonly [string, string | null, number | null, string | null][] = [
    ['LeetCode url', LEETCODE_URL, LC_NUMBER, LEETCODE_URL],
    ['NeetCode url', NEETCODE_URL, LC_NUMBER, NEETCODE_URL],
    ['the site\'s own url', SITE_URL, null, null],
    ['no url, a number', null, LC_NUMBER, `https://leetcode.com/problemset/?search=${LC_NUMBER}`],
    ['no url, no number', null, null, null],
  ];

  it.each(cases)('%s', (_name, url, lcNumber, expected) => {
    expect(externalJudgeUrlFor(url, lcNumber)).toBe(expected);
  });
});
