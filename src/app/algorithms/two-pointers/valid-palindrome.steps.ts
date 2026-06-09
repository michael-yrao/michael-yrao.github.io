import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `class Solution:
    def isPalindrome(self, s: str) -> bool:
        filtered = [c.lower() for c in s if c.isalnum()]
        l, r = 0, len(filtered) - 1
        while l < r:
            if filtered[l] != filtered[r]:
                return False
            l += 1
            r -= 1
        return True`;

function generateSteps(): Step[] {
  // Visualise with a pre-filtered example so the two-pointer dance is clear.
  // "A man a plan a canal Panama" → filtered: "amanaplanacanalpanama"
  // For a concise animation we use "racecar" (already lowercase alnum).
  const original = 'racecar';
  const filtered = original.split('');
  const steps: Step[] = [];

  const snap = (l: number, r: number, found = false) =>
    filtered.map((c, i) => ({
      value: c,
      state: found
        ? ('found' as const)
        : i < l || i > r
        ? ('visited' as const)
        : i === l || i === r
        ? ('active' as const)
        : ('default' as const),
    }));

  steps.push({
    explanation:
      'Filter out non-alphanumeric characters and lowercase everything. For "racecar" the filtered array is the string itself. Then place two pointers: l at the left end, r at the right end.',
    highlightLine: 3,
    state: {
      type: 'array',
      cells: filtered.map(c => ({ value: c, state: 'default' as const })),
      pointers: [{ index: 0, label: 'l' }, { index: filtered.length - 1, label: 'r' }],
    },
    variables: [
      { name: 'l', value: 0 },
      { name: 'r', value: filtered.length - 1 },
    ],
  });

  let l = 0;
  let r = filtered.length - 1;

  while (l < r) {
    const match = filtered[l] === filtered[r];

    steps.push({
      explanation: match
        ? `filtered[${l}] = '${filtered[l]}' and filtered[${r}] = '${filtered[r]}' match. Shrink the window: l++, r--.`
        : `filtered[${l}] = '${filtered[l]}' and filtered[${r}] = '${filtered[r]}' do NOT match. Return false immediately.`,
      highlightLine: match ? 8 : 7,
      state: {
        type: 'array',
        cells: snap(l, r, !match),
        pointers: [{ index: l, label: 'l' }, { index: r, label: 'r' }],
      },
      variables: [
        { name: 'l', value: l, highlight: true },
        { name: 'r', value: r, highlight: true },
        { name: 'filtered[l]', value: filtered[l] },
        { name: 'filtered[r]', value: filtered[r] },
        { name: 'match', value: match ? 'yes' : 'NO → false', highlight: !match },
      ],
    });

    if (!match) return steps;
    l++;
    r--;
  }

  steps.push({
    explanation: `l (${l}) ≥ r (${r}) — every pair matched. Return true. "racecar" is a palindrome.`,
    highlightLine: 10,
    state: {
      type: 'array',
      cells: filtered.map(c => ({ value: c, state: 'found' as const })),
      pointers: [{ index: l, label: 'l=r' }],
    },
    variables: [
      { name: 'l', value: l },
      { name: 'r', value: r },
      { name: 'result', value: 'true', highlight: true },
    ],
  });

  return steps;
}

const twoPointerSolution: SolutionVariant = {
  label: 'Two Pointers',
  pythonCode: PYTHON_CODE,
  generateSteps,
};

export const validPalindromeMeta: AlgorithmMeta = {
  id: 'valid-palindrome',
  lcNumber: 125,
  title: 'Valid Palindrome',
  difficulty: 'Easy',
  category: 'two-pointers',
  tags: ['Two Pointers', 'String'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(n)',
  description:
    'A phrase is a palindrome if, after converting all uppercase letters to lowercase and removing all non-alphanumeric characters, it reads the same forward and backward. Given a string s, return true if it is a palindrome, or false otherwise.',
  examples: [
    {
      input: 's = "A man, a plan, a canal: Panama"',
      output: 'true',
      explanation: '"amanaplanacanalpanama" is a palindrome.',
    },
    {
      input: 's = "race a car"',
      output: 'false',
      explanation: '"raceacar" is not a palindrome.',
    },
  ] as ProblemExample[],
  constraints: [
    '1 ≤ s.length ≤ 2 × 10⁵',
    's consists only of printable ASCII characters.',
  ],
  hint: 'Filter the string first, then use two pointers that start at each end and converge. If any pair doesn\'t match, return false immediately.',
  solutions: [twoPointerSolution],
};
