import { AlgorithmMeta, CellState, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';
import { arrayState } from '../../core/steps';

// ── Step generator ────────────────────────────────────────────────────────────
//
// Traces cse-progress's mergeAlternately verbatim: while both pointers are in bounds,
// append word1[p1] then word2[p2] and advance both together; then append whichever
// tail (word1[p1:] or word2[p2:]) is left over.

function generateSteps(): Step[] {
  const word1 = 'ace';
  const word2 = 'bd';
  const steps: Step[] = [];

  // We represent both strings as a combined array: word1 chars then word2 chars
  // with a divider marker. We'll use counters to show the result string.
  let result = '';
  let p1 = 0;
  let p2 = 0;

  // word1 chars, a separator cell, then word2 chars.
  const cells = [...word1.split(''), '|', ...word2.split('')];
  const word2Offset = word1.length + 1;

  const cellStateFor = (activeP1: number | null, activeP2: number | null) => (idx: number): CellState => {
    if (idx < word1.length) return idx === activeP1 ? 'active' : idx < p1 ? 'visited' : 'default';
    const word2Idx = idx - word2Offset;
    if (word2Idx < 0) return 'default';
    return word2Idx === activeP2 ? 'active' : word2Idx < p2 ? 'visited' : 'default';
  };

  steps.push({
    explanation:
      `Merge Strings Alternately: word1="${word1}", word2="${word2}". Use two pointers p1 and p2. Each iteration take word1[p1] then word2[p2] and append to result. When one string is exhausted, append the remaining of the other.`,
    anchor: { match: 'result = ""', to: { match: 'p1 = p2 = 0' } },
    state: arrayState(cells, {
      cellState: cellStateFor(null, null),
      pointers: [{ index: 0, label: 'p1' }, { index: word2Offset, label: 'p2' }],
      counters: [
        { label: 'p1', value: p1 },
        { label: 'p2', value: p2 },
        { label: 'result', value: '""' },
      ],
    }),
    variables: [
      { name: 'word1', value: word1 },
      { name: 'word2', value: word2 },
      { name: 'result', value: '""' },
    ],
  });

  while (p1 < word1.length && p2 < word2.length) {
    const ch1 = word1[p1];
    const ch2 = word2[p2];

    // Taking from word1
    steps.push({
      explanation: `p1=${p1}, p2=${p2}: take word1[${p1}]='${ch1}', append to result. result="${result}${ch1}".`,
      anchor: { match: 'result += word1[p1]' },
      state: arrayState(cells, {
        cellState: cellStateFor(p1, null),
        pointers: [
          { index: p1, label: 'p1' },
          { index: word2Offset + p2, label: 'p2' },
        ],
        counters: [
          { label: 'p1', value: p1 },
          { label: 'p2', value: p2 },
          { label: 'result', value: `"${result}${ch1}"` },
        ],
      }),
      variables: [
        { name: 'p1', value: p1 },
        { name: 'word1[p1]', value: ch1, highlight: true },
        { name: 'result', value: `"${result}${ch1}"` },
      ],
    });

    result += ch1;

    // Taking from word2
    steps.push({
      explanation: `p1=${p1}, p2=${p2}: take word2[${p2}]='${ch2}', append to result. result="${result}${ch2}". Then p1+=1, p2+=1.`,
      anchor: { match: 'result += word2[p2]', to: { match: 'p2+=1' } },
      state: arrayState(cells, {
        cellState: cellStateFor(null, p2),
        pointers: [
          { index: p1, label: 'p1' },
          { index: word2Offset + p2, label: 'p2' },
        ],
        counters: [
          { label: 'p1', value: p1 },
          { label: 'p2', value: p2 },
          { label: 'result', value: `"${result}${ch2}"` },
        ],
      }),
      variables: [
        { name: 'p2', value: p2 },
        { name: 'word2[p2]', value: ch2, highlight: true },
        { name: 'result', value: `"${result}${ch2}"` },
      ],
    });

    result += ch2;
    p1++;
    p2++;
  }

  // Append remainder of word1
  if (p1 < word1.length) {
    const remainder = word1.slice(p1);
    steps.push({
      explanation: `word2 exhausted (p2=${p2}). Append remaining word1[${p1}:]="${remainder}" to result. result="${result}${remainder}".`,
      anchor: { match: 'result += word1[p1:]' },
      state: arrayState(cells, {
        cellState: cellStateFor(null, null),
        pointers: [
          { index: p1, label: 'p1 (rem)' },
          { index: word1.length + p2, label: 'p2 (past end)' },
        ],
        counters: [
          { label: 'p1', value: p1 },
          { label: 'remainder', value: `"${remainder}"` },
          { label: 'result', value: `"${result}${remainder}"` },
        ],
      }),
      variables: [
        { name: 'remainder word1', value: remainder, highlight: true },
        { name: 'result', value: `"${result}${remainder}"` },
      ],
    });
    result += remainder;
    p1 = word1.length;
  }

  // Append remainder of word2
  if (p2 < word2.length) {
    const remainder = word2.slice(p2);
    steps.push({
      explanation: `word1 exhausted (p1=${p1}). Append remaining word2[${p2}:]="${remainder}" to result. result="${result}${remainder}".`,
      anchor: { match: 'result += word2[p2:]' },
      state: arrayState(cells, {
        cellState: cellStateFor(null, null),
        pointers: [
          { index: p1 < word1.length ? p1 : word1.length - 1, label: 'p1 (end)' },
          { index: word2Offset + p2, label: 'p2 (rem)' },
        ],
        counters: [
          { label: 'p2', value: p2 },
          { label: 'remainder', value: `"${remainder}"` },
          { label: 'result', value: `"${result}${remainder}"` },
        ],
      }),
      variables: [
        { name: 'remainder word2', value: remainder, highlight: true },
        { name: 'result', value: `"${result}${remainder}"` },
      ],
    });
    result += remainder;
  }

  steps.push({
    explanation: `Done. Merged result="${result}". All characters from both words interleaved, with the longer word's tail appended. Return "${result}".`,
    anchor: { match: 'return result' },
    state: arrayState(cells, {
      cellState: (idx) => (idx === word1.length ? 'default' : 'visited'),
      counters: [{ label: 'return result', value: `"${result}"` }],
    }),
    variables: [{ name: 'return', value: result, highlight: true }],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Two Pointer Alternating Merge',
  variant: 'alternating',
  generateSteps,
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(n)',
};

export const mergeStringsAlternatelyMeta: AlgorithmMeta = {
  id: 'merge-strings-alternatively',
  lcNumber: 1768,
  title: 'Merge Strings Alternately',
  difficulty: 'Easy',
  category: 'two-pointers',
  tags: ['Two Pointers', 'String'],
  description:
    'Given two strings word1 and word2, merge them by adding letters in alternating order starting with word1. If one string is longer, append its remaining letters to the end of the merged string.',
  examples: [
    {
      input: 'word1 = "abc", word2 = "pqr"',
      output: '"apbqcr"',
      explanation: 'Merge alternately: a,p,b,q,c,r.',
    },
    {
      input: 'word1 = "ab", word2 = "pqrs"',
      output: '"apbqrs"',
      explanation: 'word2 is longer; "rs" is appended after interleaving.',
    },
    {
      input: 'word1 = "abcd", word2 = "pq"',
      output: '"apbqcd"',
      explanation: 'word1 is longer; "cd" is appended after interleaving.',
    },
  ] as ProblemExample[],
  constraints: [
    '1 ≤ word1.length, word2.length ≤ 100',
    'word1 and word2 consist of lowercase English letters.',
  ],
  hint: 'Use two pointers p1 and p2. While both are in bounds, append word1[p1] then word2[p2] and advance both. After the loop, append the remaining tail of whichever string is longer.',
  solutions: [solution],
};
