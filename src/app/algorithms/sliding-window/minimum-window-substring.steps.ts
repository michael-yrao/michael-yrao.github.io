import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `class Solution:

    def minWindow(self, s: str, t: str) -> str:
        # I initially assumed minimum window must start/end with a char from t
        # but it fails with scenarios like s = "aaab" and t = "ab"
        # where the shortest is size 2 but our initial solution would give size 4
        # we will still use maps of freq
        # but we will keep track of what we have (sMap) vs what we need (tMap)
        # we will update result iff sMap has same count for each char as tMap
        return "TBD"


    def minWindowIncorrect(self, s: str, t: str) -> str:
        # this is similar to character replacement and permutation
        # so we do sliding window and we have formula of (r - l + 1) = permutation + k
        # big thing here is that k is a variable and we want to minimize it essentially
        # also a big thing to note here is that a potential result substring must start and finish with a char in t
        # we do care for freq like we did in both character replacement and permutation
        # so we should use a map
        # if potential solutions must start and end with a char in t, we should just have a map for t's frequency only
        # and then another for s's frequency

        result = ""
        if len(t) > len(s):
            return result

        sMap = {}
        tMap = {}

        for i in range(len(t)):
            tMap[t[i]] = 1 + tMap.get(t[i],0)

        def isResultComplete()->bool:
            # check if all of tMap is in result
            # result's frequency is in sMap
            for key in tMap.keys():
                # sMap can have more but not less than tMap
                if sMap[key] - tMap[key] < 0:
                    return False
            return True

        l = r = 0

        while r < len(s):
            sMap[s[r]] = 1 + sMap.get(s[i],0)
            result.append(s[r])
            # so we want to make sure result starts with a char from t
            while s[l] not in tMap:
                # remove first element from result
                result=result[1:]
                l+=1
            # now that we know we are on a possible result
            # we need to make sure all characters of t are covered in the result
            if s[r] in tMap:
                # i have these on different ifs to reduce some runtime
                if isResultComplete:
                    return result
            # if not a potential result, we just keep adding to result and increment r
            r+=1

        # if we exited loop, we did not find a result
        return ""`;

function generateSteps(): Step[] {
  const s = 'ADOBECODEBANC';
  const t = 'ABC';
  const steps: Step[] = [];

  // Build tMap
  const tMap: Record<string, number> = {};
  for (const ch of t) tMap[ch] = (tMap[ch] ?? 0) + 1;
  const need = Object.keys(tMap).length; // distinct chars we need fully satisfied

  const snap = (l: number, r: number, bestL: number, bestR: number) =>
    s.split('').map((ch, i) => ({
      value: ch,
      state:
        bestL >= 0 && i >= bestL && i <= bestR && bestL <= bestR
          ? ('found' as const)
          : i >= l && i <= r
          ? ('window' as const)
          : i < l
          ? ('visited' as const)
          : ('default' as const),
    }));

  steps.push({
    explanation: `Find the minimum window in s="${s}" that contains all characters of t="${t}". Strategy: expand right pointer r until all chars of t are covered (have ≥ need), then shrink left pointer l to minimize the window. Track best window seen so far.`,
    highlightLine: 1,
    state: {
      type: 'array',
      cells: s.split('').map(ch => ({ value: ch, state: 'default' as const })),
      pointers: [],
      hashmap: { ...tMap, '--- need': Object.keys(tMap).length },
    },
    variables: [
      { name: 's', value: s },
      { name: 't', value: t },
      { name: 'tMap', value: JSON.stringify(tMap) },
    ],
  });

  const sMap: Record<string, number> = {};
  let have = 0;
  let bestL = -1;
  let bestR = -1;
  let minLen = Infinity;
  let l = 0;

  for (let r = 0; r < s.length; r++) {
    const ch = s[r];
    sMap[ch] = (sMap[ch] ?? 0) + 1;

    // Check if this char satisfies a need
    if (tMap[ch] !== undefined && sMap[ch] === tMap[ch]) {
      have++;
    }

    // Show expansion step
    const windowStr = s.slice(l, r + 1);
    const coveredStr = Object.entries(tMap)
      .map(([k, v]) => `${k}:${sMap[k] ?? 0}/${v}`)
      .join(', ');
    steps.push({
      explanation: `Expand r=${r}: add '${ch}'. Window "${windowStr}" (l=${l}..r=${r}). Coverage: {${coveredStr}}. have=${have}/${need} distinct chars fully covered.`,
      highlightLine: 40,
      state: {
        type: 'array',
        cells: s.split('').map((c, i) => ({
          value: c,
          state:
            i === r
              ? ('active' as const)
              : i >= l && i < r
              ? ('window' as const)
              : i < l
              ? ('visited' as const)
              : ('default' as const),
        })),
        pointers: [
          { index: l, label: 'l' },
          { index: r, label: 'r' },
        ],
        hashmap: Object.fromEntries(
          Object.entries(tMap).map(([k, v]) => [`${k} (need ${v})`, sMap[k] ?? 0])
        ),
        counters: [
          { label: 'have', value: have },
          { label: 'need', value: need },
          { label: 'minLen', value: minLen === Infinity ? '∞' : minLen },
        ],
      },
      variables: [
        { name: 'r', value: r },
        { name: 'char', value: ch },
        { name: 'have', value: have },
        { name: 'need', value: need },
      ],
    });

    // Shrink from left while window is valid
    while (have === need) {
      const len = r - l + 1;
      if (len < minLen) {
        minLen = len;
        bestL = l;
        bestR = r;
      }

      const bestStr = bestL >= 0 ? s.slice(bestL, bestR + 1) : 'none';
      steps.push({
        explanation: `have=${have} == need=${need}: window valid! Window "${s.slice(l, r + 1)}" (len=${len}). ${len < minLen + 1 ? `New best: "${bestStr}" (len=${minLen}).` : `Not better than current best "${bestStr}".`} Shrink l to find smaller window.`,
        highlightLine: 47,
        state: {
          type: 'array',
          cells: snap(l, r, bestL, bestR),
          pointers: [
            { index: l, label: 'l' },
            { index: r, label: 'r' },
          ],
          hashmap: Object.fromEntries(
            Object.entries(tMap).map(([k, v]) => [`${k} (need ${v})`, sMap[k] ?? 0])
          ),
          counters: [
            { label: 'have', value: have },
            { label: 'need', value: need },
            { label: 'minLen', value: minLen },
            { label: 'best', value: bestStr },
          ],
        },
        variables: [
          { name: 'window len', value: len },
          { name: 'best', value: bestStr, highlight: true },
        ],
      });

      // Remove left char
      const leftCh = s[l];
      sMap[leftCh]--;
      if (tMap[leftCh] !== undefined && sMap[leftCh] < tMap[leftCh]) {
        have--;
      }
      l++;
    }
  }

  const result = bestL >= 0 ? s.slice(bestL, bestR + 1) : '';
  steps.push({
    explanation: `Finished scanning s. Minimum window is "${result}" (indices ${bestL}..${bestR}, length ${minLen}). O(n) time — each character is added and removed at most once. O(k) space for the frequency maps where k = |charset|.`,
    highlightLine: 55,
    state: {
      type: 'array',
      cells: s.split('').map((ch, i) => ({
        value: ch,
        state:
          i >= bestL && i <= bestR && bestL >= 0
            ? ('found' as const)
            : ('visited' as const),
      })),
      pointers: bestL >= 0
        ? [{ index: bestL, label: 'result start' }, { index: bestR, label: 'result end' }]
        : [],
      counters: [{ label: 'result', value: result || '""' }],
    },
    variables: [{ name: 'return', value: result || '""', highlight: true }],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Variable Sliding Window + Frequency Maps',
  pythonCode: PYTHON_CODE,
  generateSteps,
};

export const minimumWindowSubstringMeta: AlgorithmMeta = {
  id: 'minimum-window-substring',
  lcNumber: 76,
  title: 'Minimum Window Substring',
  difficulty: 'Hard',
  category: 'sliding-window',
  tags: ['Hash Map', 'Sliding Window', 'Two Pointers'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(k)',
  description:
    'Given two strings s and t, return the minimum window substring of s such that every character in t (including duplicates) is included. If no such window exists, return the empty string.',
  examples: [
    {
      input: 's = "ADOBECODEBANC", t = "ABC"',
      output: '"BANC"',
      explanation: 'The minimum window "BANC" contains A, B, and C from t.',
    },
    {
      input: 's = "a", t = "a"',
      output: '"a"',
    },
    {
      input: 's = "a", t = "aa"',
      output: '""',
      explanation: 's only has one \'a\' but t needs two.',
    },
  ] as ProblemExample[],
  constraints: [
    'm == s.length, n == t.length',
    '1 ≤ m, n ≤ 10⁵',
    's and t consist of uppercase and lowercase English letters.',
  ],
  hint: 'Use two frequency maps: tMap (what you need) and sMap (what you have in the current window). Track how many distinct characters are fully satisfied (have vs need). Expand r to cover t, then shrink l to minimize — update best window whenever have == need.',
  solutions: [solution],
};
