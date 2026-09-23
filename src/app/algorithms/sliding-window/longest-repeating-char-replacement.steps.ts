import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

// ── Step generator ────────────────────────────────────────────────────────────
//
// Traces cse-progress's characterReplacement_20260710 verbatim: maxFreq is a plain running
// max that is ONLY ever updated by `maxFreq = max(maxFreq, freqMap[s[r]])` — right after
// adding s[r], once per outer iteration. It is NEVER recomputed by rescanning freqMap, and the
// shrink loop does not touch it either — so maxFreq can go "stale" (stay above the window's
// true current max) after a shrink. That's fine for the final answer (a well-known property of
// this trick) but the trace must show maxFreq NOT changing on shrink steps.

function generateSteps(): Step[] {
  const s = 'AABABBA';
  const k = 1;
  const steps: Step[] = [];

  const freqMap: Record<string, number> = {};
  let l = 0;
  let maxFreq = 0;
  let maxLength = 0;

  const snap = (curL: number, curR: number) =>
    s.split('').map((ch, i) => ({
      value: ch,
      state: (i === curR
        ? 'active'
        : i >= curL && i < curR
        ? 'window'
        : i < curL
        ? 'eliminated'
        : 'default') as 'active' | 'window' | 'eliminated' | 'default',
    }));

  steps.push({
    explanation: `Longest Repeating Character Replacement on "${s}", k=${k}. l = r = 0; freqMap = defaultdict(int); maxFreq = 0; maxLength = 0. Window [l..r] is valid while (r-l+1) - maxFreq <= k, i.e. r-l+1 <= maxFreq+k.`,
    anchor: { match: 'l = r = 0', to: { match: 'maxLength = 0' } },
    state: {
      type: 'array',
      cells: s.split('').map((ch) => ({ value: ch, state: 'default' as const })),
      pointers: [{ index: 0, label: 'l=r' }],
      hashmap: {},
      counters: [{ label: 'maxLength', value: 0 }, { label: 'maxFreq', value: 0 }],
    },
    variables: [{ name: 's', value: s }, { name: 'k', value: k }],
  });

  for (let r = 0; r < s.length; r++) {
    const ch = s[r];
    freqMap[ch] = (freqMap[ch] ?? 0) + 1;

    steps.push({
      explanation: `while r < len(s): freqMap[s[${r}]]+=1 → freqMap['${ch}']=${freqMap[ch]}.`,
      anchor: { match: 'while r < len(s):', to: { match: 'freqMap[s[r]]+=1' } },
      state: {
        type: 'array',
        cells: snap(l, r),
        pointers: [{ index: l, label: 'l' }, { index: r, label: 'r' }],
        hashmap: { ...freqMap },
        counters: [{ label: 'maxLength', value: maxLength }, { label: 'maxFreq', value: maxFreq }],
      },
      variables: [{ name: 'r', value: r }, { name: `freqMap['${ch}']`, value: freqMap[ch], highlight: true }],
    });

    const oldMaxFreq = maxFreq;
    maxFreq = Math.max(maxFreq, freqMap[ch]);

    steps.push({
      explanation: `maxFreq = max(maxFreq, freqMap[s[r]]) = max(${oldMaxFreq}, ${freqMap[ch]}) = ${maxFreq}. This is the ONLY place maxFreq is ever set — it never gets rescanned or decreased on shrink.`,
      anchor: { match: 'maxFreq = max(maxFreq,freqMap[s[r]])' },
      state: {
        type: 'array',
        cells: snap(l, r),
        pointers: [{ index: l, label: 'l' }, { index: r, label: 'r' }],
        hashmap: { ...freqMap },
        counters: [{ label: 'maxLength', value: maxLength }, { label: 'maxFreq', value: maxFreq }],
      },
      variables: [{ name: 'maxFreq', value: maxFreq, highlight: true }],
    });

    while (r - l + 1 > maxFreq + k) {
      const shrinkCh = s[l];
      freqMap[shrinkCh] = (freqMap[shrinkCh] ?? 1) - 1;
      const oldL = l;
      l++;

      steps.push({
        explanation: `while r-l+1 > maxFreq+k (${r - oldL + 1} > ${maxFreq}+${k}): shrink. freqMap[s[l]]-=1 → freqMap['${shrinkCh}']=${freqMap[shrinkCh]}. l+=1 → ${l}. maxFreq is UNCHANGED at ${maxFreq} — still stale from before this shrink.`,
        anchor: { match: 'while r - l + 1 > maxFreq + k:', to: { match: 'l+=1' } },
        state: {
          type: 'array',
          cells: snap(l, r),
          pointers: [{ index: l, label: 'l' }, { index: r, label: 'r' }],
          hashmap: { ...freqMap },
          counters: [{ label: 'maxLength', value: maxLength }, { label: 'maxFreq', value: maxFreq }],
        },
        variables: [{ name: 'removed', value: shrinkCh, highlight: true }, { name: 'l', value: l, highlight: true }],
      });
    }

    const windowSize = r - l + 1;
    maxLength = Math.max(maxLength, windowSize);

    steps.push({
      explanation: `maxLength = max(maxLength, r-l+1) = max(previous, ${windowSize}) = ${maxLength}. r+=1.`,
      anchor: { match: 'maxLength = max(maxLength, r - l + 1)', to: { match: 'r+=1' } },
      state: {
        type: 'array',
        cells: snap(l, r),
        pointers: [{ index: l, label: 'l' }, { index: r, label: 'r' }],
        hashmap: { ...freqMap },
        counters: [{ label: 'maxLength', value: maxLength }, { label: 'maxFreq', value: maxFreq }],
      },
      variables: [{ name: 'windowSize', value: windowSize }, { name: 'maxLength', value: maxLength, highlight: true }],
    });
  }

  steps.push({
    explanation: `Loop exhausted (r=${s.length}). Return maxLength = ${maxLength}.`,
    anchor: { match: 'return maxLength' },
    state: {
      type: 'array',
      cells: snap(l, s.length - 1),
      pointers: [],
      hashmap: { ...freqMap },
      counters: [{ label: 'maxLength', value: maxLength }],
    },
    variables: [{ name: 'return', value: maxLength, highlight: true }],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Sliding Window + Freq Map',
  variant: 'freq-window',
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
  hint: 'Maintain a sliding window [l..r] and a frequency map. maxFreq only ever increases as you add characters at r — it is never recomputed when you shrink from l. The window is valid when (window_size − maxFreq) ≤ k. Track the longest valid window seen.',
  solutions: [solution],
};
