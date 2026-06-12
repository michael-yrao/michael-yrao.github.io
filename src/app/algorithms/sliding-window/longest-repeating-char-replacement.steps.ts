import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `class Solution:
    def characterReplacement(self, s: str, k: int) -> int:
        # longest substring is a two pointer / sliding window problem
        # length of substring is based on length of highest frequency value in the substring
        # frequency, so we can do either an array of size 26 since we know it's only uppercase letters
        # or we can do a map to account for all characters and ignore that constraint
        # So one thing to note is that a max length of current substring possible
        # is map.get(maxfreqChar) + k so if (r - l) > map.get(maxfreqChar) + k, we need to shift l
        # so how do we know maxfreqChar in our current substring in constant time
        # in sliding window, we have l and r
        # i want to use r to loop through the string and add freq
        # i want l to keep track of lower bound of the window

        longestSubstringLength = 0
        l = r = 0
        freqMap = {}

        def maxFreqCharInMap() -> int:
            maxChar = maxFreq = 0
            for char, freq in freqMap.items():
                if freq > maxFreq:
                    maxChar = char
                maxFreq = max(maxFreq,freq)
            return maxChar

        while r < len(s):
            freqMap[s[r]] = freqMap.get(s[r],0) + 1
            maxFreqChar = maxFreqCharInMap()
            # If we are out of bounds, remove frequency from s[l] until we are in bound
            # We do have to keep in mind maxFreqChar in map will change as we decrement s[l]
            while (r - l + 1) > freqMap.get(maxFreqChar,0) + k:
                freqMap[s[l]] = freqMap.get(s[l],0) - 1
                l+=1
                maxFreqChar = maxFreqCharInMap()
            # now we know r - l is valid
            longestSubstringLength = max(longestSubstringLength, r - l + 1)
            r+=1
        return longestSubstringLength`;

function generateSteps(): Step[] {
  const s = 'AABABBA';
  const k = 1;
  const steps: Step[] = [];
  let l = 0;
  let maxLen = 0;
  const freqMap: Record<string, number> = {};

  const getMaxFreq = (map: Record<string, number>) =>
    Object.values(map).reduce((a, b) => Math.max(a, b), 0);

  const snapCells = (curL: number, curR: number, done: boolean, bestL: number, bestR: number) =>
    s.split('').map((ch, i) => ({
      value: ch,
      state: done
        ? i >= bestL && i <= bestR
          ? ('found' as const)
          : ('eliminated' as const)
        : i === curR
        ? ('active' as const)
        : i >= curL && i < curR
        ? ('window' as const)
        : i < curL
        ? ('eliminated' as const)
        : ('default' as const),
    }));

  steps.push({
    explanation:
      'Longest Repeating Character Replacement on "AABABBA", k=1. Sliding window: the window [l..r] is valid if (window_size − max_freq_char_count) ≤ k, meaning we need at most k replacements to make the entire window uniform. Expand r; shrink l when invalid.',
    highlightLine: 11,
    state: {
      type: 'array',
      cells: s.split('').map(ch => ({ value: ch, state: 'default' as const })),
      pointers: [],
    },
    variables: [{ name: 's', value: s }, { name: 'k', value: k }],
  });

  steps.push({
    explanation: 'Initialize l=0, r=0, freqMap={}, maxLen=0.',
    highlightLine: 12,
    state: {
      type: 'array',
      cells: s.split('').map(ch => ({ value: ch, state: 'default' as const })),
      pointers: [{ index: 0, label: 'l=r' }],
      hashmap: {},
      counters: [{ label: 'maxLen', value: 0 }, { label: 'maxFreq', value: 0 }],
    },
    variables: [{ name: 'l', value: 0 }, { name: 'r', value: 0 }, { name: 'maxLen', value: 0 }],
  });

  let bestL = 0;
  let bestR = 0;

  for (let r = 0; r < s.length; r++) {
    const ch = s[r];
    freqMap[ch] = (freqMap[ch] ?? 0) + 1;
    let maxFreq = getMaxFreq(freqMap);
    const windowSize = r - l + 1;

    steps.push({
      explanation: `r=${r} ('${ch}'): add to freqMap. freqMap=${JSON.stringify(freqMap)}. Window size=${windowSize}, maxFreq=${maxFreq}. replacements needed = ${windowSize} − ${maxFreq} = ${windowSize - maxFreq}. k=${k}. Window ${windowSize - maxFreq <= k ? 'VALID' : 'INVALID'}.`,
      highlightLine: 24,
      state: {
        type: 'array',
        cells: snapCells(l, r, false, bestL, bestR),
        pointers: [{ index: l, label: 'l' }, { index: r, label: 'r' }],
        hashmap: { ...freqMap },
        counters: [{ label: 'maxLen', value: maxLen }, { label: 'maxFreq', value: maxFreq }],
      },
      variables: [
        { name: 'r', value: r },
        { name: `freqMap['${ch}']`, value: freqMap[ch], highlight: true },
        { name: 'windowSize', value: windowSize },
        { name: 'replacements', value: windowSize - maxFreq },
      ],
    });

    while (windowSize > maxFreq + k) {
      // window is invalid; will update windowSize via pointer
      const shrinkCh = s[l];
      freqMap[shrinkCh] = (freqMap[shrinkCh] ?? 1) - 1;
      if (freqMap[shrinkCh] === 0) delete freqMap[shrinkCh];
      l++;
      maxFreq = getMaxFreq(freqMap);
      const newWindowSize = r - l + 1;

      steps.push({
        explanation: `Window invalid (size ${r - l + 2} > maxFreq ${maxFreq} + k ${k}). Shrink: remove s[${l - 1}]='${shrinkCh}', l→${l}. New window size=${newWindowSize}, maxFreq=${maxFreq}. Replacements needed = ${newWindowSize - maxFreq}.`,
        highlightLine: 29,
        state: {
          type: 'array',
          cells: snapCells(l, r, false, bestL, bestR),
          pointers: [{ index: l, label: 'l' }, { index: r, label: 'r' }],
          hashmap: { ...freqMap },
          counters: [{ label: 'maxLen', value: maxLen }, { label: 'maxFreq', value: maxFreq }],
        },
        variables: [
          { name: 'removed', value: shrinkCh, highlight: true },
          { name: 'l', value: l },
          { name: 'windowSize', value: newWindowSize },
        ],
      });

      // break condition check against updated values
      if (newWindowSize <= maxFreq + k) break;
    }

    const curWindowSize = r - l + 1;
    maxFreq = getMaxFreq(freqMap);

    if (curWindowSize > maxLen) {
      maxLen = curWindowSize;
      bestL = l;
      bestR = r;
    }

    steps.push({
      explanation: `Window [${l}..${r}] = "${s.slice(l, r + 1)}" is valid (size=${curWindowSize}, replacements=${curWindowSize - maxFreq} ≤ k=${k}). maxLen = max(${maxLen - (curWindowSize > maxLen - curWindowSize + curWindowSize ? 0 : 0)}) = ${maxLen}.`,
      highlightLine: 33,
      state: {
        type: 'array',
        cells: snapCells(l, r, false, bestL, bestR),
        pointers: [{ index: l, label: 'l' }, { index: r, label: 'r' }],
        hashmap: { ...freqMap },
        counters: [{ label: 'maxLen', value: maxLen }, { label: 'maxFreq', value: maxFreq }],
      },
      variables: [
        { name: 'windowSize', value: curWindowSize },
        { name: 'maxLen', value: maxLen, highlight: true },
      ],
    });
  }

  steps.push({
    explanation: `Done. Longest valid window is "${s.slice(bestL, bestR + 1)}" (indices ${bestL}–${bestR}, length ${maxLen}). With k=1 replacement we can make it all one character. Return ${maxLen}.`,
    highlightLine: 34,
    state: {
      type: 'array',
      cells: snapCells(l, s.length - 1, true, bestL, bestR),
      pointers: [],
      hashmap: { ...freqMap },
      counters: [{ label: 'maxLen', value: maxLen }],
    },
    variables: [{ name: 'return', value: maxLen, highlight: true }],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Sliding Window + Freq Map',
  pythonCode: PYTHON_CODE,
  generateSteps,
};

export const longestRepeatingCharReplacementMeta: AlgorithmMeta = {
  id: 'longest-repeating-char-replacement',
  lcNumber: 424,
  title: 'Longest Repeating Character Replacement',
  difficulty: 'Medium',
  category: 'sliding-window',
  tags: ['Hash Map', 'Sliding Window'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(1)',
  description:
    'You are given a string s and an integer k. You can choose any character of the string and change it to any other uppercase English character. You can perform this operation at most k times. Return the length of the longest substring containing the same letter you can get after performing the above operations.',
  examples: [
    {
      input: 's = "ABAB", k = 2',
      output: '4',
      explanation: 'Replace the two A\'s with B\'s (or vice versa) to get "BBBB" or "AAAA".',
    },
    {
      input: 's = "AABABBA", k = 1',
      output: '4',
      explanation: 'Replace the A in the middle to get "AABBBBA". The substring "BBBB" has length 4.',
    },
  ] as ProblemExample[],
  constraints: [
    '1 ≤ s.length ≤ 10⁵',
    's consists of only uppercase English letters.',
    '0 ≤ k ≤ s.length',
  ],
  hint: 'Maintain a sliding window [l..r] and a frequency map. The window is valid when (window_size − max_freq) ≤ k — meaning we only need to replace the non-dominant characters. Expand r every iteration; shrink l while the window becomes invalid. Track the longest valid window seen.',
  solutions: [solution],
};
