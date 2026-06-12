import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `class Solution:
    def longestCommonPrefix(self, strs: List[str]) -> str:
        # the prefix can never be longer than the shortest string, so scan that as our limit
        # at each position, if any string diverges from the shortest, we have our answer

        shortestString = min(strs, key=len)

        lcp = ""

        for i in range(len(shortestString)):
            for str in strs:
                if str[i] != shortestString[i]:
                    return lcp
            lcp += shortestString[i]

        return lcp`;

function generateSteps(): Step[] {
  const strs = ['flower', 'flow', 'flight'];
  const steps: Step[] = [];

  const shortest = strs.reduce((a, b) => (a.length <= b.length ? a : b));
  let lcp = '';

  steps.push({
    explanation: `Find the longest prefix shared by all ${strs.length} strings. Strategy: the prefix can never be longer than the shortest string — "${shortest}". Scan it character by character; stop the moment any string diverges.`,
    highlightLine: 2,
    state: {
      type: 'array',
      cells: shortest.split('').map(c => ({ value: c, state: 'default' as const })),
      pointers: [],
      hashmap: Object.fromEntries(strs.map((s, i) => [`str${i + 1}`, s])),
    },
    variables: [
      { name: 'shortest', value: shortest },
      { name: 'lcp', value: '""' },
    ],
  });

  outer: for (let i = 0; i < shortest.length; i++) {
    const ch = shortest[i];

    for (const s of strs) {
      if (s[i] !== ch) {
        steps.push({
          explanation: `i=${i}, char="${ch}": "${s}" has "${s[i]}" at position ${i} — mismatch! Return lcp="${lcp}".`,
          highlightLine: 6,
          state: {
            type: 'array',
            cells: shortest.split('').map((c, j) => ({
              value: c,
              state:
                j < i
                  ? ('found' as const)
                  : j === i
                  ? ('eliminated' as const)
                  : ('default' as const),
            })),
            pointers: [{ index: i, label: 'i' }],
            hashmap: Object.fromEntries(strs.map((str, k) => [`str${k + 1}`, str])),
          },
          variables: [
            { name: 'i', value: i },
            { name: 'mismatch in', value: s, highlight: true },
            { name: 'return', value: `"${lcp}"` },
          ],
        });
        break outer;
      }
    }

    lcp += ch;

    steps.push({
      explanation: `i=${i}, char="${ch}": all strings have "${ch}" at position ${i} ✓. lcp grows to "${lcp}".`,
      highlightLine: 8,
      state: {
        type: 'array',
        cells: shortest.split('').map((c, j) => ({
          value: c,
          state:
            j < lcp.length
              ? ('found' as const)
              : j === lcp.length
              ? ('active' as const)
              : ('default' as const),
        })),
        pointers: [{ index: i, label: 'i' }],
        hashmap: Object.fromEntries(strs.map((str, k) => [`str${k + 1}`, str])),
      },
      variables: [
        { name: 'i', value: i },
        { name: 'char', value: ch },
        { name: 'lcp', value: `"${lcp}"`, highlight: true },
      ],
    });
  }

  if (lcp === shortest) {
    steps.push({
      explanation: `Reached end of shortest string "${shortest}" with no mismatch. Return lcp="${lcp}".`,
      highlightLine: 16,
      state: {
        type: 'array',
        cells: shortest.split('').map(c => ({ value: c, state: 'found' as const })),
        pointers: [],
        hashmap: Object.fromEntries(strs.map((s, i) => [`str${i + 1}`, s])),
      },
      variables: [{ name: 'return', value: `"${lcp}"`, highlight: true }],
    });
  }

  return steps;
}

const solution: SolutionVariant = {
  label: 'Vertical Scan',
  pythonCode: PYTHON_CODE,
  generateSteps,
};

export const longestCommonPrefixMeta: AlgorithmMeta = {
  id: 'longest-common-prefix',
  lcNumber: 14,
  title: 'Longest Common Prefix',
  difficulty: 'Easy',
  category: 'arrays-hash',
  tags: ['String', 'Trie'],
  timeComplexity: 'O(m·n)',
  spaceComplexity: 'O(1)',
  description:
    'Write a function to find the longest common prefix string amongst an array of strings. If there is no common prefix, return an empty string "".',
  examples: [
    {
      input: 'strs = ["flower","flow","flight"]',
      output: '"fl"',
      explanation: '"fl" is the longest prefix common to all three strings.',
    },
    {
      input: 'strs = ["dog","racecar","car"]',
      output: '""',
      explanation: 'No common prefix.',
    },
  ] as ProblemExample[],
  constraints: [
    '1 ≤ strs.length ≤ 200',
    '0 ≤ strs[i].length ≤ 200',
    'strs[i] consists of only lowercase English letters.',
  ],
  hint: 'Find the shortest string first — the LCP can never be longer. Then scan column by column (same index across all strings). The moment any string differs, return what you have.',
  solutions: [solution],
};
