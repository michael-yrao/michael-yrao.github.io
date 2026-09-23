import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

// ── Solution 1: Hash map ─────────────────────────────────────────────────────
//
// Traces cse-progress's isAnagram verbatim: sMap/tMap initialized together, an
// early length check, then a single loop that updates BOTH maps on every
// index (not conditionally on s[i] === t[i]), finishing with sMap == tMap.

function generateSteps(): Step[] {
  const s = 'anagram';
  const t = 'nagaram';
  const steps: Step[] = [];
  const sMap: Record<string, number> = {};
  const tMap: Record<string, number> = {};

  const sChars = s.split('');
  const tChars = t.split('');

  const sSnap = (activeIdx: number) =>
    sChars.map((c, i) => ({
      value: c,
      state:
        i < activeIdx ? ('visited' as const) : i === activeIdx ? ('active' as const) : ('default' as const),
    }));

  steps.push({
    explanation: `Create two empty frequency maps: sMap for "${s}", tMap for "${t}".`,
    anchor: { match: 'sMap, tMap = {}, {}' },
    state: {
      type: 'array',
      cells: sChars.map(c => ({ value: c, state: 'default' as const })),
      pointers: [],
      hashmap: {},
    },
    variables: [
      { name: 's', value: s },
      { name: 't', value: t },
      { name: 'sMap', value: '{}' },
      { name: 'tMap', value: '{}' },
    ],
  });

  steps.push({
    explanation: `Check len(s) != len(t): ${s.length} != ${t.length} is false — lengths match, so no early return. One pass builds both maps simultaneously.`,
    anchor: { match: 'if len(s) != len(t):' },
    state: {
      type: 'array',
      cells: sChars.map(c => ({ value: c, state: 'default' as const })),
      pointers: [],
      hashmap: {},
    },
    variables: [
      { name: 'len(s)', value: s.length },
      { name: 'len(t)', value: t.length },
    ],
  });

  for (let i = 0; i < s.length; i++) {
    sMap[s[i]] = (sMap[s[i]] ?? 0) + 1;
    tMap[t[i]] = (tMap[t[i]] ?? 0) + 1;

    steps.push({
      explanation: `i=${i}: both maps update on this index — sMap['${s[i]}'] → ${sMap[s[i]]}; tMap['${t[i]}'] → ${tMap[t[i]]}.`,
      anchor: { match: 'sMap[s[i]] = 1 + sMap.get(s[i],0)', to: { match: 'tMap[t[i]] = 1 + tMap.get(t[i],0)' } },
      state: {
        type: 'array',
        cells: sSnap(i),
        pointers: [{ index: i, label: 'i' }],
        hashmap: { ...sMap },
        counters: Object.entries(tMap).map(([k, v]) => ({ label: `t['${k}']`, value: v })),
      },
      variables: [
        { name: 'i', value: i, highlight: true },
        { name: "s[i]", value: s[i], highlight: true },
        { name: "t[i]", value: t[i], highlight: true },
        { name: `sMap['${s[i]}']`, value: sMap[s[i]] },
        { name: `tMap['${t[i]}']`, value: tMap[t[i]] },
      ],
    });
  }

  const equal = JSON.stringify(
    Object.fromEntries(Object.entries(sMap).sort()),
  ) === JSON.stringify(Object.fromEntries(Object.entries(tMap).sort()));

  steps.push({
    explanation: equal
      ? `sMap == tMap — every character appears the same number of times in both strings. Return true: "${s}" and "${t}" are anagrams.`
      : `sMap != tMap — at least one character frequency differs. Return false.`,
    anchor: { match: 'return sMap == tMap' },
    state: {
      type: 'array',
      cells: sChars.map(c => ({ value: c, state: equal ? ('found' as const) : ('eliminated' as const) })),
      pointers: [],
      hashmap: { ...sMap },
      counters: Object.entries(tMap).map(([k, v]) => ({ label: `t['${k}']`, value: v })),
    },
    variables: [
      { name: 'sMap == tMap', value: equal ? 'true' : 'false', highlight: true },
      { name: 'result', value: String(equal), highlight: true },
    ],
  });

  return steps;
}

// ── Solution 2: Sort ──────────────────────────────────────────────────────────
//
// Traces cse-progress's isAnagramPython verbatim: a single-line return
// `''.join(sorted(s)) == ''.join(sorted(t))`. No separate lines exist for
// sorting s vs sorting t, so every step anchors to that one return line while
// narrating what the expression computes.

const SORT_RETURN_LINE = "return ''.join(sorted(s)) == ''.join(sorted(t))";

function generateSortedSteps(): Step[] {
  const s = 'anagram';
  const t = 'nagaram';
  const steps: Step[] = [];

  steps.push({
    explanation: `Sort both strings. If they produce the same sequence of characters, they are anagrams. s="${s}", t="${t}".`,
    anchor: { match: SORT_RETURN_LINE },
    state: {
      type: 'array',
      cells: s.split('').map(c => ({ value: c, state: 'default' as const })),
      pointers: [],
      hashmap: { t },
    },
    variables: [{ name: 's', value: s }, { name: 't', value: t }],
  });

  const sortedS = s.split('').sort().join('');
  steps.push({
    explanation: `sorted(s) = "${sortedS}".`,
    anchor: { match: SORT_RETURN_LINE },
    state: {
      type: 'array',
      cells: sortedS.split('').map(c => ({ value: c, state: 'visited' as const })),
      pointers: [],
      hashmap: { 't': t, 'sorted(t)': '...' },
    },
    variables: [{ name: 'sorted(s)', value: sortedS, highlight: true }],
  });

  const sortedT = t.split('').sort().join('');
  steps.push({
    explanation: `sorted(t) = "${sortedT}".`,
    anchor: { match: SORT_RETURN_LINE },
    state: {
      type: 'array',
      cells: sortedT.split('').map(c => ({ value: c, state: 'visited' as const })),
      pointers: [],
      hashmap: { 'sorted(s)': sortedS, 'sorted(t)': sortedT },
    },
    variables: [{ name: 'sorted(t)', value: sortedT, highlight: true }],
  });

  const equal = sortedS === sortedT;
  steps.push({
    explanation: `sorted(s) "${sortedS}" ${equal ? '==' : '!='} sorted(t) "${sortedT}" → return ${equal}.`,
    anchor: { match: SORT_RETURN_LINE },
    state: {
      type: 'array',
      cells: sortedS.split('').map((c, i) => ({
        value: c,
        state: equal ? ('found' as const) : (c === sortedT[i] ? ('visited' as const) : ('eliminated' as const)),
      })),
      pointers: [],
      hashmap: { 'sorted(s)': sortedS, 'sorted(t)': sortedT },
    },
    variables: [{ name: 'return', value: String(equal), highlight: true }],
  });

  return steps;
}

const hashMapSolution: SolutionVariant = {
  label: 'Hash Map',
  variant: 'hash-map',
  generateSteps,
};

const sortedSolution: SolutionVariant = {
  label: 'Sort',
  variant: 'sort',
  generateSteps: generateSortedSteps,
};

export const validAnagramMeta: AlgorithmMeta = {
  id: 'valid-anagram',
  lcNumber: 242,
  title: 'Valid Anagram',
  difficulty: 'Easy',
  category: 'arrays-hash',
  tags: ['Hash Map', 'String', 'Sorting'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(n)',
  description:
    'Given two strings s and t, return true if t is an anagram of s, and false otherwise. An anagram uses all the original letters exactly once, just rearranged.',
  examples: [
    {
      input: 's = "anagram",  t = "nagaram"',
      output: 'true',
    },
    {
      input: 's = "rat",  t = "car"',
      output: 'false',
    },
  ] as ProblemExample[],
  constraints: [
    '1 ≤ s.length, t.length ≤ 5 × 10⁴',
    's and t consist of lowercase English letters.',
  ],
  hint: 'Two strings are anagrams if and only if their character frequency maps are identical. Build both maps in one pass and compare.',
  solutions: [hashMapSolution, sortedSolution],
};
