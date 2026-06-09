import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `from typing import List


class Solution:
    def isAnagram(self, s: str, t: str) -> bool:
        if len(s) != len(t):
            return False

        sMap, tMap = {}, {}

        for i in range(len(s)):
            sMap[s[i]] = 1 + sMap.get(s[i], 0)
            tMap[t[i]] = 1 + tMap.get(t[i], 0)

        return sMap == tMap`;

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
    explanation: `Both strings are length ${s.length} — lengths match. Create two frequency maps: sMap for "${s}", tMap for "${t}". One pass builds both simultaneously.`,
    highlightLine: 9,
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

  for (let i = 0; i < s.length; i++) {
    sMap[s[i]] = (sMap[s[i]] ?? 0) + 1;
    tMap[t[i]] = (tMap[t[i]] ?? 0) + 1;

    steps.push({
      explanation: `i=${i}: sMap['${s[i]}'] → ${sMap[s[i]]}; tMap['${t[i]}'] → ${tMap[t[i]]}. Each char's frequency grows.`,
      highlightLine: s[i] === t[i] ? 12 : 13,
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
      : `sMap ≠ tMap — at least one character frequency differs. Return false.`,
    highlightLine: 15,
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

const hashMapSolution: SolutionVariant = {
  label: 'Hash Map',
  pythonCode: PYTHON_CODE,
  generateSteps,
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
  solutions: [hashMapSolution],
};
