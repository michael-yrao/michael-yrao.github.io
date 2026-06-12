import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `class Solution:
    def validPalindrome(self, s: str) -> bool:
        # two pointers converge inward; on a mismatch we get one deletion attempt
        # try skipping the left character or skipping the right — either may yield a palindrome
        l, r = 0, len(s) - 1

        def skippable(l, r) -> bool:
            while l < r:
                if s[l] == s[r]:
                    l += 1
                    r -= 1
                else:
                    return False
            return True

        while l < r:
            if s[l] == s[r]:
                l += 1
                r -= 1
            else:
                return skippable(l+1, r) or skippable(l, r-1)

        return True`;

function generateSteps(): Step[] {
  // "eccer" → true (delete 'r', leaving "ecce" which is a palindrome)
  const s = 'eccer';
  const chars = s.split('');
  const steps: Step[] = [];

  const snap = (
    l: number,
    r: number,
    overrides: Record<number, 'active' | 'found' | 'visited' | 'eliminated' | 'default'> = {}
  ) =>
    chars.map((c, i) => ({
      value: c,
      state: overrides[i] ?? (
        i === l || i === r
          ? ('active' as const)
          : i < l || i > r
          ? ('visited' as const)
          : ('default' as const)
      ),
    }));

  steps.push({
    explanation:
      'Two pointers approach with one allowed deletion. Start with l at the left and r at the right. Advance both as long as characters match. On a mismatch, try skipping either side and check if the remaining substring is a palindrome.',
    highlightLine: 11,
    state: {
      type: 'array',
      cells: chars.map(c => ({ value: c, state: 'default' as const })),
      pointers: [{ index: 0, label: 'l' }, { index: chars.length - 1, label: 'r' }],
    },
    variables: [
      { name: 'l', value: 0 },
      { name: 'r', value: chars.length - 1 },
      { name: 's', value: s },
    ],
  });

  // l=0, r=4: s[0]='e' vs s[4]='r'
  let l = 0;
  let r = chars.length - 1;

  steps.push({
    explanation: `s[${l}]='${chars[l]}' != s[${r}]='${chars[r]}': mismatch on first comparison! Try skipping the left (check s[${l + 1}..${r}]) OR skipping the right (check s[${l}..${r - 1}]).`,
    highlightLine: 16,
    state: {
      type: 'array',
      cells: snap(l, r),
      pointers: [{ index: l, label: 'l' }, { index: r, label: 'r' }],
    },
    variables: [
      { name: 'l', value: l, highlight: true },
      { name: 'r', value: r, highlight: true },
      { name: `s[l]`, value: chars[l] },
      { name: `s[r]`, value: chars[r] },
    ],
  });

  // Branch A: skip left, check s[1..4] = "ccer"
  {
    const bl = l + 1;
    const br = r;
    steps.push({
      explanation: `Branch A: skip left → check s[${bl}..${br}] = "${s.slice(bl, br + 1)}". s[${bl}]='${chars[bl]}' vs s[${br}]='${chars[br]}' — mismatch. Branch A fails.`,
      highlightLine: 4,
      state: {
        type: 'array',
        cells: chars.map((c, i) => ({
          value: c,
          state:
            i === l
              ? ('eliminated' as const)
              : i === bl || i === br
              ? ('active' as const)
              : i > bl && i < br
              ? ('default' as const)
              : ('visited' as const),
        })),
        pointers: [{ index: bl, label: 'l+1' }, { index: br, label: 'r' }],
      },
      variables: [
        { name: 'branch', value: 'skip left' },
        { name: `s[${bl}]`, value: chars[bl] },
        { name: `s[${br}]`, value: chars[br] },
        { name: 'match', value: 'false' },
      ],
    });
  }

  // Branch B: skip right, check s[0..3] = "ecce"
  {
    const bl = l;
    let br = r - 1;

    steps.push({
      explanation: `Branch B: skip right → check s[${bl}..${br}] = "${s.slice(bl, br + 1)}". Begin inner check.`,
      highlightLine: 4,
      state: {
        type: 'array',
        cells: chars.map((c, i) => ({
          value: c,
          state:
            i === r
              ? ('eliminated' as const)
              : i === bl || i === br
              ? ('active' as const)
              : i > bl && i < br
              ? ('default' as const)
              : ('visited' as const),
        })),
        pointers: [{ index: bl, label: 'l' }, { index: br, label: 'r-1' }],
      },
      variables: [
        { name: 'branch', value: 'skip right' },
        { name: `s[${bl}]`, value: chars[bl] },
        { name: `s[${br}]`, value: chars[br] },
      ],
    });

    // s[0]='e' == s[3]='e'
    steps.push({
      explanation: `s[${bl}]='${chars[bl]}' == s[${br}]='${chars[br]}' ✓ — advance inward.`,
      highlightLine: 5,
      state: {
        type: 'array',
        cells: chars.map((c, i) => ({
          value: c,
          state:
            i === r
              ? ('eliminated' as const)
              : i === bl || i === br
              ? ('found' as const)
              : i > bl && i < br
              ? ('default' as const)
              : ('visited' as const),
        })),
        pointers: [{ index: bl, label: 'l' }, { index: br, label: 'r' }],
      },
      variables: [
        { name: `s[${bl}]`, value: chars[bl] },
        { name: `s[${br}]`, value: chars[br] },
        { name: 'match', value: 'true' },
      ],
    });

    // Advance: bl=1, br=2
    const bl2 = bl + 1;
    br = br - 1;

    steps.push({
      explanation: `s[${bl2}]='${chars[bl2]}' == s[${br}]='${chars[br]}' ✓ — advance inward again.`,
      highlightLine: 6,
      state: {
        type: 'array',
        cells: chars.map((c, i) => ({
          value: c,
          state:
            i === r || i === bl || i === br + 1
              ? ('visited' as const)
              : i === bl2 || i === br
              ? ('found' as const)
              : ('visited' as const),
        })),
        pointers: [{ index: bl2, label: 'l' }, { index: br, label: 'r' }],
      },
      variables: [
        { name: `s[${bl2}]`, value: chars[bl2] },
        { name: `s[${br}]`, value: chars[br] },
        { name: 'match', value: 'true' },
      ],
    });

    // bl2=1+1=2, br=br-1: now l >= r → exit
    steps.push({
      explanation: `l(${bl2 + 1}) >= r(${br - 1}): inner loop exits. Substring "${s.slice(bl, r)}" is a palindrome — we can delete '${chars[r]}' at index ${r}. Return true.`,
      highlightLine: 9,
      state: {
        type: 'array',
        cells: chars.map((c, i) => ({
          value: c,
          state: i === r ? ('eliminated' as const) : ('found' as const),
        })),
        pointers: [],
      },
      variables: [
        { name: 'skippable', value: 'true', highlight: true },
        { name: 'return', value: 'true', highlight: true },
      ],
    });
  }

  return steps;
}

const solution: SolutionVariant = {
  label: 'Two Pointers',
  pythonCode: PYTHON_CODE,
  generateSteps,
};

export const validPalindromeIIMeta: AlgorithmMeta = {
  id: 'valid-palindrome-ii',
  lcNumber: 680,
  title: 'Valid Palindrome II',
  difficulty: 'Easy',
  category: 'two-pointers',
  tags: ['Two Pointers', 'String', 'Greedy'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(1)',
  description:
    'Given a string s, return true if the s can be palindrome after deleting at most one character from it.',
  examples: [
    { input: 's = "aba"', output: 'true' },
    { input: 's = "abca"', output: 'true', explanation: 'You could delete the character \'c\'.' },
    { input: 's = "abc"', output: 'false' },
  ] as ProblemExample[],
  constraints: [
    '1 ≤ s.length ≤ 10⁵',
    's consists of lowercase English letters.',
  ],
  hint: 'Move two pointers inward while characters match. On the first mismatch, you must delete either the left or right character. Check both: if either resulting substring is a palindrome, return true.',
  solutions: [solution],
};
