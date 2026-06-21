import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `class Solution:
    def isPalindrome(self, s: str) -> bool:
        # clean string to alphabet only
        # also make it lowercase
        regex = re.compile('[^a-zA-Z]')
        cleanString = regex.sub('', s).lower()

        l,r=0,len(cleanString)-1
        while r>=l:
            if cleanString[l] != cleanString[r]:
                return False
            l+=1
            r-=1
        return True`;

const PYTHON_CODE_ALT = `class Solution:
    def isPalindromeNoCleaning(self, s: str) -> bool:

        def alphaNumeric(character):
            return ((ord('A') <= ord(character) <= ord('Z')) or
                    (ord('a') <= ord(character) <= ord('z')) or
                    (ord('0') <= ord(character) <= ord('9'))
                    )

        l, r = 0, len(s) - 1

        while r >= l:
            # get to alphanumeric for both l and r
            while l < r and not alphaNumeric(s[l]):
                l+=1
            while r > l and not alphaNumeric(s[r]):
                r-=1
            if s[r].lower() != s[l].lower():
                return False
            r-=1
            l+=1
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

function generateNoCleaningSteps(): Step[] {
  // No pre-filtering: pointers skip non-alphanumeric chars in place.
  const s = 'Race, car'.split(''); // R a c e ,   c a r  → "racecar"
  const steps: Step[] = [];
  const isAlnum = (c: string) => /[a-z0-9]/i.test(c);

  const matched = new Set<number>();
  const skipped = new Set<number>();

  const snap = (l: number, r: number, done = false) =>
    s.map((c, i) => ({
      value: c,
      state: done
        ? isAlnum(c)
          ? ('found' as const)
          : ('eliminated' as const)
        : skipped.has(i)
        ? ('eliminated' as const)
        : i === l || i === r
        ? ('active' as const)
        : matched.has(i)
        ? ('visited' as const)
        : ('default' as const),
    }));

  steps.push({
    explanation:
      'This version never builds a cleaned copy of the string — it saves that O(n) extra space by skipping non-alphanumeric characters on the fly. Two pointers start at the ends; before each comparison we slide each pointer inward past any punctuation or spaces.',
    highlightLine: 10,
    state: { type: 'array', cells: snap(0, s.length - 1), pointers: [{ index: 0, label: 'l' }, { index: s.length - 1, label: 'r' }] },
    variables: [{ name: 'l', value: 0 }, { name: 'r', value: s.length - 1 }],
  });

  let l = 0;
  let r = s.length - 1;
  let result = true;

  while (r >= l) {
    // Inner loop: advance l past non-alphanumeric characters.
    while (l < r && !isAlnum(s[l])) {
      skipped.add(l);
      steps.push({
        explanation: `Left pointer: s[${l}] = '${s[l]}' is NOT alphanumeric, so skip it (l++). We don't compare punctuation.`,
        highlightLine: 15,
        state: { type: 'array', cells: snap(l, r), pointers: [{ index: l, label: 'l' }, { index: r, label: 'r' }] },
        variables: [{ name: 'l', value: l, highlight: true }, { name: `s[l]`, value: `'${s[l]}'` }, { name: 'alphanumeric?', value: 'no → skip' }],
      });
      l++;
    }
    // Inner loop: advance r past non-alphanumeric characters.
    while (r > l && !isAlnum(s[r])) {
      skipped.add(r);
      steps.push({
        explanation: `Right pointer: s[${r}] = '${s[r]}' is NOT alphanumeric, so skip it (r--).`,
        highlightLine: 17,
        state: { type: 'array', cells: snap(l, r), pointers: [{ index: l, label: 'l' }, { index: r, label: 'r' }] },
        variables: [{ name: 'r', value: r, highlight: true }, { name: `s[r]`, value: `'${s[r]}'` }, { name: 'alphanumeric?', value: 'no → skip' }],
      });
      r--;
    }

    const a = s[l].toLowerCase();
    const b = s[r].toLowerCase();
    const match = a === b;
    steps.push({
      explanation: match
        ? `Both alphanumeric now. Compare s[${l}]→'${a}' vs s[${r}]→'${b}' (lowercased): they match. Move both pointers inward (l++, r--).`
        : `Compare s[${l}]→'${a}' vs s[${r}]→'${b}' (lowercased): they do NOT match. Return False immediately.`,
      highlightLine: match ? 21 : 19,
      state: { type: 'array', cells: snap(l, r), pointers: [{ index: l, label: 'l' }, { index: r, label: 'r' }] },
      variables: [
        { name: 'l', value: l }, { name: 'r', value: r },
        { name: "s[l].lower()", value: `'${a}'` }, { name: "s[r].lower()", value: `'${b}'` },
        { name: 'match', value: match ? 'yes' : 'NO → False', highlight: true },
      ],
    });

    if (!match) { result = false; break; }
    if (l !== r) { matched.add(l); matched.add(r); }
    l++;
    r--;
  }

  steps.push({
    explanation: result
      ? `r (${r}) < l (${l}) — the pointers crossed and every alphanumeric pair matched. Return True. Same answer as the cleaning version, but O(1) extra space.`
      : `Returned False above — not a palindrome.`,
    highlightLine: 22,
    state: { type: 'array', cells: snap(l, r, result), pointers: [] },
    variables: [{ name: 'result', value: String(result), highlight: true }],
  });

  return steps;
}

const twoPointerSolution: SolutionVariant = {
  label: 'Two Pointers',
  pythonCode: PYTHON_CODE,
  generateSteps,
};

const noCleaningSolution: SolutionVariant = {
  label: 'No Cleaning',
  pythonCode: PYTHON_CODE_ALT,
  generateSteps: generateNoCleaningSteps,
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
  solutions: [twoPointerSolution, noCleaningSolution],
};
