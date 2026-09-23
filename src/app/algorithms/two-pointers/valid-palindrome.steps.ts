import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

// ── Step generators ──────────────────────────────────────────────────────────
//
// clean-then-scan traces cse-progress's isPalindrome verbatim: regex = re.compile('[^a-zA-Z]')
// strips anything that ISN'T a letter — digits included, not just punctuation/spaces — then
// .lower(). The loop is `while r>=l` (not `r>l`): it still runs the l===r middle-character
// case (a trivial self-match) before l crosses r.
//
// no-cleaning traces isPalindromeNoCleaning verbatim: a nested alphaNumeric() helper, then the
// same `while r>=l` shape, with two inner skip-loops (l past non-alnum, then r past non-alnum)
// before each comparison.

function generateSteps(): Step[] {
  // regex.sub('[^a-zA-Z]', '') strips anything that isn't a letter — including digits — so a
  // digit disappears here rather than surviving as itself; the input is chosen to show that.
  const original = 'Race1car!';
  const cleanString = original.replace(/[^a-zA-Z]/g, '').toLowerCase();
  const steps: Step[] = [];

  const snap = (l: number, r: number, found = false) =>
    cleanString.split('').map((c, i) => ({
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
    explanation: `regex = re.compile('[^a-zA-Z]'); cleanString = regex.sub('', s).lower(). s="${original}" → every non-letter (the digit '1' and the '!') is stripped, not just punctuation/spaces → cleanString="${cleanString}".`,
    anchor: { match: "regex = re.compile('[^a-zA-Z]')", to: { match: "cleanString = regex.sub('', s).lower()" } },
    state: {
      type: 'array',
      cells: cleanString.split('').map((c) => ({ value: c, state: 'default' as const })),
      pointers: [],
    },
    variables: [{ name: 'cleanString', value: cleanString }],
  });

  let l = 0;
  let r = cleanString.length - 1;

  steps.push({
    explanation: `l,r=0,len(cleanString)-1 → l=${l}, r=${r}.`,
    anchor: { match: 'l,r=0,len(cleanString)-1' },
    state: { type: 'array', cells: snap(l, r), pointers: [{ index: l, label: 'l' }, { index: r, label: 'r' }] },
    variables: [
      { name: 'l', value: l },
      { name: 'r', value: r },
    ],
  });

  while (r >= l) {
    const match = cleanString[l] === cleanString[r];

    if (!match) {
      steps.push({
        explanation: `while r>=l (${r}>=${l}): cleanString[l]='${cleanString[l]}' != cleanString[r]='${cleanString[r]}' → return False.`,
        anchor: { match: 'if cleanString[l] != cleanString[r]:', to: { match: 'return False' } },
        state: { type: 'array', cells: snap(l, r), pointers: [{ index: l, label: 'l' }, { index: r, label: 'r' }] },
        variables: [
          { name: 'l', value: l, highlight: true },
          { name: 'r', value: r, highlight: true },
          { name: 'match', value: 'NO → False', highlight: true },
        ],
      });
      return steps;
    }

    steps.push({
      explanation: `while r>=l (${r}>=${l}): cleanString[l]='${cleanString[l]}' == cleanString[r]='${cleanString[r]}' → the if doesn't fire. l+=1, r-=1.`,
      anchor: { match: 'l+=1', to: { match: 'r-=1' } },
      state: { type: 'array', cells: snap(l, r), pointers: [{ index: l, label: 'l' }, { index: r, label: 'r' }] },
      variables: [
        { name: 'l', value: l },
        { name: 'r', value: r },
        { name: 'match', value: 'yes' },
      ],
    });
    l += 1;
    r -= 1;
  }

  steps.push({
    explanation: `r (${r}) < l (${l}) — every pair (including the middle self-match, if any) checked out. Return True. "${cleanString}" is a palindrome.`,
    anchor: { match: 'return True' },
    state: { type: 'array', cells: cleanString.split('').map((c) => ({ value: c, state: 'found' as const })), pointers: [] },
    variables: [{ name: 'result', value: 'True', highlight: true }],
  });

  return steps;
}

function generateNoCleaningSteps(): Step[] {
  // No pre-filtering: pointers skip non-alphanumeric chars in place.
  const s = 'Race, car'.split(''); // R a c e ,   c a r  → alphanumerics spell "Racecar"
  const steps: Step[] = [];
  const isAlnum = (c: string) => /[a-zA-Z0-9]/.test(c);

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
      "def alphaNumeric(character) checks ord() ranges for 'A'-'Z', 'a'-'z', '0'-'9' — a character is alphanumeric only if one of those three ranges holds. This version never builds a cleaned copy of the string; it saves that O(n) space by skipping non-alphanumeric characters on the fly.",
    anchor: { match: 'def alphaNumeric(character):', to: { match: "(ord('0') <= ord(character) <= ord('9'))" } },
    state: { type: 'array', cells: snap(0, s.length - 1), pointers: [] },
    variables: [{ name: 's', value: s.join('') }],
  });

  let l = 0;
  let r = s.length - 1;

  steps.push({
    explanation: `l, r = 0, len(s) - 1 → l=${l}, r=${r}.`,
    anchor: { match: 'l, r = 0, len(s) - 1' },
    state: { type: 'array', cells: snap(l, r), pointers: [{ index: l, label: 'l' }, { index: r, label: 'r' }] },
    variables: [
      { name: 'l', value: l },
      { name: 'r', value: r },
    ],
  });

  while (r >= l) {
    // Inner loop: advance l past non-alphanumeric characters.
    while (l < r && !isAlnum(s[l])) {
      skipped.add(l);
      steps.push({
        explanation: `while l < r and not alphaNumeric(s[l]): s[${l}]='${s[l]}' is NOT alphanumeric, so skip it (l+=1). We don't compare punctuation.`,
        // nth 1: this loop's own 'l+=1'; hit 2 is the final match-advance's 'l+=1' further down.
        anchor: { match: 'while l < r and not alphaNumeric(s[l]):', to: { match: 'l+=1', nth: 1 } },
        state: { type: 'array', cells: snap(l, r), pointers: [{ index: l, label: 'l' }, { index: r, label: 'r' }] },
        variables: [{ name: 'l', value: l, highlight: true }, { name: 's[l]', value: `'${s[l]}'` }],
      });
      l++;
    }
    // Inner loop: advance r past non-alphanumeric characters.
    while (r > l && !isAlnum(s[r])) {
      skipped.add(r);
      steps.push({
        explanation: `while r > l and not alphaNumeric(s[r]): s[${r}]='${s[r]}' is NOT alphanumeric, so skip it (r-=1).`,
        // nth 1: this loop's own 'r-=1'; hit 2 is the final match-advance's 'r-=1' further down.
        anchor: { match: 'while r > l and not alphaNumeric(s[r]):', to: { match: 'r-=1', nth: 1 } },
        state: { type: 'array', cells: snap(l, r), pointers: [{ index: l, label: 'l' }, { index: r, label: 'r' }] },
        variables: [{ name: 'r', value: r, highlight: true }, { name: 's[r]', value: `'${s[r]}'` }],
      });
      r--;
    }

    const a = s[l].toLowerCase();
    const b = s[r].toLowerCase();
    const match = a === b;

    if (!match) {
      steps.push({
        explanation: `if s[r].lower() != s[l].lower(): s[${r}]→'${b}' vs s[${l}]→'${a}' — do NOT match. Return False.`,
        anchor: { match: 'if s[r].lower() != s[l].lower():', to: { match: 'return False' } },
        state: { type: 'array', cells: snap(l, r), pointers: [{ index: l, label: 'l' }, { index: r, label: 'r' }] },
        variables: [
          { name: 's[r].lower()', value: `'${b}'` },
          { name: 's[l].lower()', value: `'${a}'` },
          { name: 'match', value: 'NO → False', highlight: true },
        ],
      });
      return steps;
    }

    steps.push({
      explanation: `if s[r].lower() != s[l].lower(): s[${r}]→'${b}' vs s[${l}]→'${a}' — they match, so the if doesn't fire. r-=1, l+=1.`,
      // nth 2: hit 1 is the left skip-loop's 'l+=1' above; this is the final match-advance's own.
      anchor: { match: 'if s[r].lower() != s[l].lower():', to: { match: 'l+=1', nth: 2 } },
      state: { type: 'array', cells: snap(l, r), pointers: [{ index: l, label: 'l' }, { index: r, label: 'r' }] },
      variables: [
        { name: 's[r].lower()', value: `'${b}'` },
        { name: 's[l].lower()', value: `'${a}'` },
        { name: 'match', value: 'yes' },
      ],
    });

    if (l !== r) { matched.add(l); matched.add(r); }
    r--;
    l++;
  }

  steps.push({
    explanation: `r (${r}) < l (${l}) — the pointers crossed and every alphanumeric pair matched. Return True. Same answer as the cleaning version, but O(1) extra space.`,
    anchor: { match: 'return True' },
    state: { type: 'array', cells: snap(l, r, true), pointers: [] },
    variables: [{ name: 'result', value: 'True', highlight: true }],
  });

  return steps;
}

const twoPointerSolution: SolutionVariant = {
  label: 'Clean Then Scan',
  variant: 'clean-then-scan',
  generateSteps,
};

const noCleaningSolution: SolutionVariant = {
  label: 'No Cleaning',
  variant: 'no-cleaning',
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
