// Walkthrough pending — grounded code only. Variant 'set-window' joins cse-progress 3:set-window
// (symbol lengthOfLongestSubstring_20260822); the site renders that attempt verbatim from dashboard/showcase.json.

import { AlgorithmMeta } from '../../core/models/algorithm.model';

export const longestSubstringWithoutRepeatingCharactersMeta: AlgorithmMeta = {
  id: 'longest-substring-without-repeating-characters',
  lcNumber: 3,
  title: 'Longest Substring Without Repeating Characters',
  difficulty: 'Medium',
  category: 'sliding-window',
  tags: ['Sliding Window', 'Hash Set', 'String'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(min(n, alphabet))',
  description:
    'Given a string s, return the length of the longest substring without repeating characters, where a substring is a contiguous non-empty run of characters.',
  examples: [
    { input: 's = "abcabcbb"', output: '3', explanation: '"abc"' },
    { input: 's = "bbbbb"', output: '1', explanation: '"b"' },
    { input: 's = "pwwkew"', output: '3', explanation: '"wke"; "pwke" is a subsequence, not a substring' },
  ],
  constraints: ['0 <= len(s) <= 5*10^4', 's may contain letters, digits, symbols, spaces.'],
  hint: "Track the current window's characters in a set and shrink from the left whenever you'd repeat one — a dynamic (variable-size) sliding window.",
  solutions: [
    {
      label: 'Sliding Window + Set',
      variant: 'set-window',
      generateSteps: () => [],
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(min(n, alphabet))',
    },
  ],
};
