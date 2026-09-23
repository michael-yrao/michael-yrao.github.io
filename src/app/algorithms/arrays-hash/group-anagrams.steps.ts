import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

// ── Solution 1: Sort Key HashMap ─────────────────────────────────────────────
//
// Traces cse-progress's groupAnagrams verbatim: anagramMap starts as a plain
// {}, sortedStr is computed every iteration, and a key is initialized to []
// ONLY the first time it's seen (`if sortedStr not in anagramMap:`) before the
// unconditional append.

function generateSteps(): Step[] {
  const strs = ['eat', 'tea', 'tan', 'ate', 'nat', 'bat'];
  const steps: Step[] = [];
  const groups: Record<string, string[]> = {};

  steps.push({
    explanation:
      'Anagrams share the same characters. Sort each string to get a canonical sortedStr key — all anagrams produce the same key. Group by that key in anagramMap.',
    anchor: { match: 'anagramMap = {}' },
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
    const firstTouch = !groups[key];

    if (firstTouch) groups[key] = [];
    groups[key].push(s);

    const hashmapSnapshot: Record<string, string> = {};
    for (const [k, v] of Object.entries(groups)) {
      hashmapSnapshot[k] = `[${v.map(w => `"${w}"`).join(', ')}]`;
    }

    steps.push({
      explanation: `"${s}" → sortedStr = "${key}". ${firstTouch ? `"${key}" not in anagramMap → initialize anagramMap["${key}"] = [], then append.` : `"${key}" already in anagramMap → append directly.`} Group is now ${hashmapSnapshot[key]}.`,
      anchor: firstTouch
        ? { match: 'if sortedStr not in anagramMap:', to: { match: 'anagramMap[sortedStr].append(str)' } }
        : { match: 'anagramMap[sortedStr].append(str)' },
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
        { name: 'str', value: `"${s}"` },
        { name: 'sortedStr', value: `"${key}"`, highlight: true },
        { name: `anagramMap["${key}"]`, value: hashmapSnapshot[key] },
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
    anchor: { match: 'return list(anagramMap.values())' },
    state: {
      type: 'array',
      cells: strs.map(s => ({ value: s, state: 'found' as const })),
      pointers: [],
      hashmap: hashmapFinal,
    },
    variables: [{ name: 'anagramMap', value: result.length, highlight: true }],
  });

  return steps;
}

// ── Solution 2: defaultdict ──────────────────────────────────────────────────
//
// Traces cse-progress's groupAnagramsAlternative verbatim: identical sortedStr
// computation, but anagramMap = defaultdict(list), so append happens
// unconditionally with no not-in check.

function generateAltSteps(): Step[] {
  const strs = ['eat', 'tea', 'tan', 'ate', 'nat', 'bat'];
  const steps: Step[] = [];
  const groups: Record<string, string[]> = {};

  steps.push({
    explanation:
      'Same sort-the-key idea, but anagramMap = defaultdict(list). The difference: with a plain dict you must write "if key not in map: map[key] = []" before appending. defaultdict creates that empty list automatically the first time a key is touched, so we can append directly — one fewer line and no missing-key check.',
    anchor: { match: 'anagramMap = defaultdict(list)' },
    state: {
      type: 'array',
      cells: strs.map((s) => ({ value: s, state: 'default' as const })),
      pointers: [],
      hashmap: {},
    },
    variables: [{ name: 'anagramMap', value: 'defaultdict(list)' }],
  });

  for (let i = 0; i < strs.length; i++) {
    const s = strs[i];
    const key = s.split('').sort().join('');
    const firstTouch = !groups[key];
    if (firstTouch) groups[key] = [];
    groups[key].push(s);

    const hashmapSnapshot: Record<string, string> = {};
    for (const [k, v] of Object.entries(groups)) {
      hashmapSnapshot[k] = `[${v.map((w) => `"${w}"`).join(', ')}]`;
    }

    steps.push({
      explanation: `"${s}" → sortedStr = "${key}". ${firstTouch ? `"${key}" is new — defaultdict auto-creates an empty list, then we append.` : `"${key}" already exists — append directly.`} Group is now ${hashmapSnapshot[key]}.`,
      anchor: { match: 'anagramMap[sortedStr].append(str)' },
      state: {
        type: 'array',
        cells: strs.map((w, j) => ({
          value: w,
          state: j === i ? ('active' as const) : j < i ? ('visited' as const) : ('default' as const),
        })),
        pointers: [{ index: i, label: 'i' }],
        hashmap: hashmapSnapshot,
      },
      variables: [
        { name: 'str', value: `"${s}"` },
        { name: 'sortedStr', value: `"${key}"`, highlight: true },
        { name: 'auto-created?', value: firstTouch ? 'yes' : 'no', highlight: firstTouch },
        { name: `anagramMap["${key}"]`, value: hashmapSnapshot[key] },
      ],
    });
  }

  const result = Object.values(groups);
  const hashmapFinal: Record<string, string> = {};
  for (const [k, v] of Object.entries(groups)) {
    hashmapFinal[k] = `[${v.map((w) => `"${w}"`).join(', ')}]`;
  }

  steps.push({
    explanation: `All strings grouped into ${result.length} buckets: ${result.map((g) => '[' + g.map((w) => `"${w}"`).join(', ') + ']').join(', ')}. Return the map's values.`,
    anchor: { match: 'return list(anagramMap.values())' },
    state: {
      type: 'array',
      cells: strs.map((s) => ({ value: s, state: 'found' as const })),
      pointers: [],
      hashmap: hashmapFinal,
    },
    variables: [{ name: 'anagramMap', value: result.length, highlight: true }],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Sort Key HashMap',
  variant: 'sort-key-map',
  generateSteps,
};

const altSolution: SolutionVariant = {
  label: 'defaultdict',
  variant: 'defaultdict',
  generateSteps: generateAltSteps,
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
  solutions: [solution, altSolution],
};
