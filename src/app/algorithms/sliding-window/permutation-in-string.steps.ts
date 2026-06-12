import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `class Solution:
    def checkInclusion(self, s1: str, s2: str) -> bool:
        # basically we are looking for some form of s1 in s2
        # we can just assume a window of size s1
        # permutation is same as anagram, so we can just do map of frequency
        # so we start with s1FreqMap
        # go through the window of s1 in s2, compare s1FreqMap vs s2FreqMap and return
        # problem is that map comparison is O(n) so this solution is O(n*m) where n is size of s2 and m is size of s1
        # if instead of a map, we use an array of size 26 due to constraint of lowercase English letters
        # we can reduce comparison to O(26) so we get O(n)

        def compareS1andS2() -> bool:
            for i in range(26):
                if s1Array[i] != s2Array[i]:
                    return False
            return True

        s1Array = [0] * 26
        s2Array = [0] * 26

        l = r = 0

        # invalid query if s1 > s2

        if len(s1) > len(s2):
            return False

        # populate s1Array with frequency from s1

        for i in range(len(s1)):
            s1Array[ord(s1[i]) - ord('a')] += 1

        # now we go through s2 with sliding window and increment/decrement from s2Array

        while r < len(s2):
            s2Array[ord(s2[r]) - ord('a')] += 1
            # make sure size of window isn't bigger than size of s1
            # this is never actually going to run to O(len(s1)) since it runs every iteration
            # it will at most be ran 1 iteration each outer iteration
            while r - l + 1 > len(s1):
                s2Array[ord(s2[l]) - ord('a')] -= 1
                l+=1
            # now that we are valid, compare the two arrays
            if compareS1andS2():
                return True
            r+=1
        return False`;

function generateSteps(): Step[] {
  const s1 = 'ab';
  const s2 = 'eidbaooo';
  const winSize = s1.length;
  const steps: Step[] = [];

  // Build s1 freq array
  const s1Freq = new Array(26).fill(0);
  for (const ch of s1) s1Freq[ch.charCodeAt(0) - 97]++;

  const s1FreqDisplay: Record<string, number> = {};
  for (const ch of s1) s1FreqDisplay[ch] = (s1FreqDisplay[ch] ?? 0) + 1;

  const snap = (l: number, r: number, found: boolean) =>
    s2.split('').map((ch, i) => ({
      value: ch,
      state:
        found && i >= l && i <= r
          ? ('found' as const)
          : i >= l && i <= r
          ? ('window' as const)
          : i < l
          ? ('eliminated' as const)
          : ('default' as const),
    }));

  const windowFreq = (l: number, r: number): Record<string, number> => {
    const freq: Record<string, number> = {};
    for (let i = l; i <= r; i++) {
      const ch = s2[i];
      freq[ch] = (freq[ch] ?? 0) + 1;
    }
    return freq;
  };

  const matchesS1 = (l: number, r: number): boolean => {
    const wf = windowFreq(l, r);
    for (const ch of s1) {
      if ((wf[ch] ?? 0) !== s1Freq[ch.charCodeAt(0) - 97]) return false;
    }
    // also check no extra chars
    for (const ch of Object.keys(wf)) {
      if (!s1FreqDisplay[ch]) return false;
    }
    return true;
  };

  steps.push({
    explanation:
      `Check if s2="eidbaooo" contains a permutation of s1="ab". A permutation has the same character frequencies. Strategy: use a fixed-size sliding window of size ${winSize} (= len(s1)), comparing frequency arrays at each position. Using 26-char arrays instead of maps brings window comparison to O(26) = O(1).`,
    highlightLine: 1,
    state: {
      type: 'array',
      cells: s2.split('').map(ch => ({ value: ch, state: 'default' as const })),
      pointers: [],
      hashmap: s1FreqDisplay,
    },
    variables: [
      { name: 's1', value: s1 },
      { name: 's2', value: s2 },
      { name: 'window size', value: winSize },
    ],
  });

  steps.push({
    explanation:
      `Build s1Freq: count each character of s1. s1Freq = {${Object.entries(s1FreqDisplay).map(([k, v]) => `'${k}':${v}`).join(', ')}}. This is our target frequency to match.`,
    highlightLine: 30,
    state: {
      type: 'array',
      cells: s2.split('').map(ch => ({ value: ch, state: 'default' as const })),
      pointers: [],
      hashmap: s1FreqDisplay,
    },
    variables: [{ name: 's1Freq', value: JSON.stringify(s1FreqDisplay) }],
  });

  let l = 0;

  for (let r = 0; r < s2.length; r++) {
    const winLen = r - l + 1;

    // Shrink if over size
    if (winLen > winSize) {
      l++;
    }

    const actualWinLen = r - l + 1;
    const wf = windowFreq(l, r);
    const isMatch = actualWinLen === winSize && matchesS1(l, r);

    const wfDisplay: Record<string, number> = {};
    for (let i = l; i <= r; i++) {
      const ch = s2[i];
      wfDisplay[ch] = (wfDisplay[ch] ?? 0) + 1;
    }

    steps.push({
      explanation: isMatch
        ? `Window [${l}..${r}] = "${s2.slice(l, r + 1)}". s2Freq = {${Object.entries(wfDisplay).map(([k, v]) => `'${k}':${v}`).join(', ')}} matches s1Freq! Permutation found — return True.`
        : `Window [${l}..${r}] = "${s2.slice(l, r + 1)}" (size ${actualWinLen}). s2Freq = {${Object.entries(wfDisplay).map(([k, v]) => `'${k}':${v}`).join(', ')}} ≠ s1Freq. Slide window right.`,
      highlightLine: isMatch ? 42 : 34,
      state: {
        type: 'array',
        cells: snap(l, r, isMatch),
        pointers: [
          { index: l, label: 'l' },
          { index: r, label: 'r' },
        ],
        hashmap: wfDisplay,
      },
      variables: [
        { name: 'l', value: l },
        { name: 'r', value: r },
        { name: 'window', value: s2.slice(l, r + 1) },
        { name: 'match?', value: isMatch ? 'YES' : 'no', highlight: isMatch },
      ],
    });

    if (isMatch) return steps;
  }

  steps.push({
    explanation: 'Exhausted s2 without finding a match. Return False.',
    highlightLine: 44,
    state: {
      type: 'array',
      cells: s2.split('').map(ch => ({ value: ch, state: 'eliminated' as const })),
      pointers: [],
    },
    variables: [{ name: 'return', value: 'False', highlight: true }],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Fixed-Size Sliding Window + Freq Array',
  pythonCode: PYTHON_CODE,
  generateSteps,
};

export const permutationInStringMeta: AlgorithmMeta = {
  id: 'permutation-in-string',
  lcNumber: 567,
  title: 'Permutation in String',
  difficulty: 'Medium',
  category: 'sliding-window',
  tags: ['Hash Map', 'Sliding Window', 'Two Pointers'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(1)',
  description:
    'Given two strings s1 and s2, return true if s2 contains a permutation of s1, or false otherwise. In other words, return true if one of s1\'s permutations is a substring of s2.',
  examples: [
    {
      input: 's1 = "ab", s2 = "eidbaooo"',
      output: 'true',
      explanation: 's2 contains one permutation of s1 ("ba" at index 3).',
    },
    {
      input: 's1 = "ab", s2 = "eidboaoo"',
      output: 'false',
    },
  ] as ProblemExample[],
  constraints: [
    '1 ≤ s1.length, s2.length ≤ 10⁴',
    's1 and s2 consist of lowercase English letters.',
  ],
  hint: 'A permutation has the same character frequencies. Use a fixed-size sliding window of length len(s1) over s2 and compare frequency arrays at each position. Replace the hash map with a 26-element array indexed by ord(c) - ord(\'a\') to make each comparison O(1).',
  solutions: [solution],
};
