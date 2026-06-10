import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `class Solution:
    def groupAnagrams(self, strs: List[str]) -> List[List[str]]:
        groups = defaultdict(list)
        for s in strs:
            key = tuple(sorted(s))
            groups[key].append(s)
        return list(groups.values())`;

function generateSteps(): Step[] {
  const strs = ['eat', 'tea', 'tan', 'ate', 'nat', 'bat'];
  const steps: Step[] = [];
  const groups: Record<string, string[]> = {};

  steps.push({
    explanation:
      'Anagrams share the same characters. Sort each string to get a canonical key — all anagrams produce the same key. Group by that key in a hash map.',
    highlightLine: 2,
    state: {
      type: 'array',
      cells: strs.map(s => ({ value: s, state: 'default' as const })),
      pointers: [],
      hashmap: {},
    },
    variables: [{ name: 'strs', value: `[${strs.map(s => `"${s}"`).join(', ')}]` }],
  });

  for (let i = 0; i < strs.length; i++) {
    const s = strs[i];
    const key = s.split('').sort().join('');

    if (!groups[key]) groups[key] = [];
    groups[key].push(s);

    const hashmapSnapshot: Record<string, string> = {};
    for (const [k, v] of Object.entries(groups)) {
      hashmapSnapshot[k] = `[${v.map(w => `"${w}"`).join(', ')}]`;
    }

    steps.push({
      explanation: `"${s}" → sorted key = "${key}". Append to groups["${key}"]. Group is now ${hashmapSnapshot[key]}.`,
      highlightLine: 4,
      state: {
        type: 'array',
        cells: strs.map((w, j) => ({
          value: w,
          state:
            j === i
              ? ('active' as const)
              : j < i
              ? ('visited' as const)
              : ('default' as const),
        })),
        pointers: [{ index: i, label: 'i' }],
        hashmap: hashmapSnapshot,
      },
      variables: [
        { name: 's', value: `"${s}"` },
        { name: 'key', value: `"${key}"`, highlight: true },
        { name: `groups["${key}"]`, value: hashmapSnapshot[key] },
      ],
    });
  }

  const result = Object.values(groups);
  const hashmapFinal: Record<string, string> = {};
  for (const [k, v] of Object.entries(groups)) {
    hashmapFinal[k] = `[${v.map(w => `"${w}"`).join(', ')}]`;
  }

  steps.push({
    explanation: `All strings grouped. ${result.length} groups: ${result.map(g => '[' + g.map(w => `"${w}"`).join(', ') + ']').join(', ')}. O(n·k log k) time where k is max string length.`,
    highlightLine: 6,
    state: {
      type: 'array',
      cells: strs.map(s => ({ value: s, state: 'found' as const })),
      pointers: [],
      hashmap: hashmapFinal,
    },
    variables: [{ name: 'groups', value: result.length, highlight: true }],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Sort Key HashMap',
  pythonCode: PYTHON_CODE,
  generateSteps,
};

export const groupAnagramsMeta: AlgorithmMeta = {
  id: 'group-anagrams',
  lcNumber: 49,
  title: 'Group Anagrams',
  difficulty: 'Medium',
  category: 'arrays-hash',
  tags: ['Hash Map', 'String', 'Sorting'],
  timeComplexity: 'O(n·k log k)',
  spaceComplexity: 'O(n·k)',
  description:
    'Given an array of strings strs, group the anagrams together. You can return the answer in any order. An anagram is a word or phrase formed by rearranging the letters of a different word or phrase, using all the original letters exactly once.',
  examples: [
    {
      input: 'strs = ["eat","tea","tan","ate","nat","bat"]',
      output: '[["bat"],["nat","tan"],["ate","eat","tea"]]',
    },
    {
      input: 'strs = [""]',
      output: '[[""]]',
    },
  ] as ProblemExample[],
  constraints: [
    '1 ≤ strs.length ≤ 10⁴',
    '0 ≤ strs[i].length ≤ 100',
    'strs[i] consists of lowercase English letters.',
  ],
  hint: 'Anagrams sort to the same string. Use sorted(s) as the hash map key. An alternative O(n·k) approach uses a 26-character frequency count as the key instead of sorting.',
  solutions: [solution],
};
