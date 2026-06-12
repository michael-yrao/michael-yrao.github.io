import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `class Solution:
    def reverseString(self, s: List[str]) -> None:
        l, r = 0, len(s) - 1
        while r>l:
            s[l], s[r] = s[r], s[l]
            r-=1
            l+=1`;

function generateSteps(): Step[] {
  const s = ['h', 'e', 'l', 'l', 'o'];
  const steps: Step[] = [];

  const snap = (l: number, r: number, swapped: Set<number>, done: boolean) =>
    s.map((v, i) => ({
      value: v,
      state: done
        ? ('found' as const)
        : swapped.has(i) && i !== l && i !== r
        ? ('visited' as const)
        : i === l || i === r
        ? ('active' as const)
        : ('default' as const),
    }));

  const swapped = new Set<number>();

  steps.push({
    explanation:
      'Reverse string ["h","e","l","l","o"] in-place using two pointers. l starts at the left end, r at the right end. Each step swaps s[l] and s[r] then moves both pointers inward. O(n) time, O(1) space.',
    highlightLine: 2,
    state: {
      type: 'array',
      cells: s.map(v => ({ value: v, state: 'default' as const })),
      pointers: [],
    },
    variables: [{ name: 's', value: '["h","e","l","l","o"]' }],
  });

  let l = 0;
  let r = s.length - 1;

  steps.push({
    explanation: `Initialize l=${l}, r=${r}. Two pointers face inward — we swap while r > l.`,
    highlightLine: 2,
    state: {
      type: 'array',
      cells: snap(l, r, swapped, false),
      pointers: [{ index: l, label: 'l' }, { index: r, label: 'r' }],
    },
    variables: [{ name: 'l', value: l }, { name: 'r', value: r }],
  });

  while (r > l) {
    const lVal = s[l];
    const rVal = s[r];

    steps.push({
      explanation: `r=${r} > l=${l}: swap s[${l}]='${lVal}' and s[${r}]='${rVal}'.`,
      highlightLine: 3,
      state: {
        type: 'array',
        cells: snap(l, r, swapped, false),
        pointers: [{ index: l, label: 'l' }, { index: r, label: 'r' }],
      },
      variables: [
        { name: 'l', value: l },
        { name: 'r', value: r },
        { name: 's[l]', value: lVal, highlight: true },
        { name: 's[r]', value: rVal, highlight: true },
      ],
    });

    // perform swap
    s[l] = rVal;
    s[r] = lVal;
    swapped.add(l);
    swapped.add(r);
    r--;
    l++;

    steps.push({
      explanation: `Swapped → s[${l - 1}]='${s[l - 1]}', s[${r + 1}]='${s[r + 1]}'. Move l→${l}, r→${r}.`,
      highlightLine: 4,
      state: {
        type: 'array',
        cells: snap(l, r, swapped, false),
        pointers: r >= l
          ? [{ index: l, label: 'l' }, { index: r, label: 'r' }]
          : [{ index: l, label: 'l=r' }],
      },
      variables: [
        { name: 'l', value: l },
        { name: 'r', value: r },
      ],
    });
  }

  steps.push({
    explanation: `r=${r} ≤ l=${l}: done. Reversed string is ["${s.join('","')}"].`,
    highlightLine: 6,
    state: {
      type: 'array',
      cells: snap(l, r, swapped, true),
      pointers: [],
    },
    variables: [{ name: 'result', value: `["${s.join('","')}"]`, highlight: true }],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Two Pointers',
  pythonCode: PYTHON_CODE,
  generateSteps,
};

export const reverseStringMeta: AlgorithmMeta = {
  id: 'reverse-string',
  lcNumber: 344,
  title: 'Reverse String',
  difficulty: 'Easy',
  category: 'two-pointers',
  tags: ['Two Pointers', 'String'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(1)',
  description:
    'Write a function that reverses a string. The input string is given as an array of characters s. You must do this by modifying the input array in-place with O(1) extra memory.',
  examples: [
    {
      input: 's = ["h","e","l","l","o"]',
      output: '["o","l","l","e","h"]',
    },
    {
      input: 's = ["H","a","n","n","a","h"]',
      output: '["h","a","n","n","a","H"]',
    },
  ] as ProblemExample[],
  constraints: [
    '1 ≤ s.length ≤ 10⁵',
    's[i] is a printable ASCII character.',
  ],
  hint: 'Place l at index 0 and r at index n-1. While r > l, swap s[l] and s[r], then increment l and decrement r. Each swap places two characters in their final positions, so n/2 swaps suffice.',
  solutions: [solution],
};
