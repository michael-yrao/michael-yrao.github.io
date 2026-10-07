import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';
import { arrayState } from '../../core/steps';

// ── Step generator ────────────────────────────────────────────────────────────
//
// Traces cse-progress's validPalindromeVariation verbatim: the skippable(l, r) helper is
// defined FIRST, then l, r = 0, len(s)-1. The outer `while l < r` loop and skippable's own
// `while l < r` loop share the identical body (if s[l]==s[r]: l+=1, r-=1; else: ...) — the
// only difference is the else branch: the outer one calls
// `skippable(l+1, r) or skippable(l,r-1)` (Python `or` short-circuits — skippable(l,r-1)
// only runs if skippable(l+1,r) is falsy); skippable's own else just returns False.

function generateSteps(): Step[] {
  // "eccer" → true (delete 'r', leaving "ecce" which is a palindrome)
  const s = 'eccer';
  const chars = s.split('');
  const steps: Step[] = [];

  steps.push({
    explanation: `def skippable(l,r): checks whether s[l..r] is a plain palindrome (two pointers, no further deletion). Then l, r = 0, len(s)-1 → l=0, r=${chars.length - 1}. The outer loop advances while characters match; on a mismatch it tries skipping the left char or the right char.`,
    anchor: { match: 'def skippable(l,r):', to: { match: 'l, r = 0, len(s)-1' } },
    state: arrayState(chars, { pointers: [{ index: 0, label: 'l' }, { index: chars.length - 1, label: 'r' }] }),
    variables: [
      { name: 'l', value: 0 },
      { name: 'r', value: chars.length - 1 },
      { name: 's', value: s },
    ],
  });

  const l = 0;
  const r = chars.length - 1;

  steps.push({
    explanation: `Outer loop: s[${l}]='${chars[l]}' != s[${r}]='${chars[r]}' → the if doesn't fire. return skippable(l+1, r) or skippable(l, r-1) — try skipping the left char first; skippable(l,r-1) only runs if that's falsy.`,
    // nth 2: hit 1 is skippable()'s own 'if s[l] == s[r]:' inside the helper; this is the outer
    // function's check.
    anchor: { match: 'if s[l] == s[r]:', nth: 2, to: { match: 'return skippable(l+1, r) or skippable(l,r-1)' } },
    state: arrayState(chars, {
      cellState: (i) => (i === l || i === r ? 'active' : i < l || i > r ? 'visited' : 'default'),
      pointers: [{ index: l, label: 'l' }, { index: r, label: 'r' }],
    }),
    variables: [
      { name: 'l', value: l, highlight: true },
      { name: 'r', value: r, highlight: true },
      { name: 's[l]', value: chars[l] },
      { name: 's[r]', value: chars[r] },
    ],
  });

  // Branch A: skippable(l+1, r) → checks s[1..4] = "ccer"
  {
    const bl = l + 1;
    const br = r;
    steps.push({
      explanation: `skippable(${bl}, ${br}): while l<r → s[${bl}]='${chars[bl]}' vs s[${br}]='${chars[br]}' — the if doesn't match, so the else fires: return False. skippable(l+1, r) is falsy.`,
      // nth 1: skippable()'s own check; hit 2 is the outer function's 'if s[l] == s[r]:'.
      anchor: { match: 'if s[l] == s[r]:', nth: 1, to: { match: 'return False' } },
      state: arrayState(chars, {
        cellState: (i) =>
          i === l ? 'eliminated' : i === bl || i === br ? 'active' : i > bl && i < br ? 'default' : 'visited',
        pointers: [{ index: bl, label: 'l' }, { index: br, label: 'r' }],
      }),
      variables: [
        { name: 'branch', value: 'skippable(l+1, r)' },
        { name: `s[${bl}]`, value: chars[bl] },
        { name: `s[${br}]`, value: chars[br] },
        { name: 'match', value: 'false' },
      ],
    });
  }

  // Branch B: `or` falls through to skippable(l, r-1) → checks s[0..3] = "ecce"
  {
    let bl = l;
    let br = r - 1;

    steps.push({
      explanation: `skippable(l+1, r) was falsy, so the \`or\` evaluates skippable(${bl}, ${br}): while l<r → s[${bl}]='${chars[bl]}' == s[${br}]='${chars[br]}' → the if fires: l+=1, r-=1.`,
      // nth 1/1: skippable()'s own 'if' and its own 'r-=1'; hit 2 of each belongs to the outer
      // function's identical-looking lines.
      anchor: { match: 'if s[l] == s[r]:', nth: 1, to: { match: 'r-=1', nth: 1 } },
      state: arrayState(chars, {
        cellState: (i) =>
          i === r ? 'eliminated' : i === bl || i === br ? 'found' : i > bl && i < br ? 'default' : 'visited',
        pointers: [{ index: bl, label: 'l' }, { index: br, label: 'r' }],
      }),
      variables: [
        { name: 'branch', value: 'skippable(l, r-1)' },
        { name: `s[${bl}]`, value: chars[bl] },
        { name: `s[${br}]`, value: chars[br] },
        { name: 'match', value: 'true' },
      ],
    });

    bl += 1;
    br -= 1;

    steps.push({
      explanation: `while l<r (${bl}<${br}): s[${bl}]='${chars[bl]}' == s[${br}]='${chars[br]}' → the if fires again: l+=1, r-=1.`,
      // nth 1/1: skippable()'s own 'if' and its own 'r-=1'; hit 2 of each belongs to the outer
      // function's identical-looking lines.
      anchor: { match: 'if s[l] == s[r]:', nth: 1, to: { match: 'r-=1', nth: 1 } },
      state: arrayState(chars, {
        cellState: (i) => (i !== r && i !== l && (i === bl || i === br) ? 'found' : 'visited'),
        pointers: [{ index: bl, label: 'l' }, { index: br, label: 'r' }],
      }),
      variables: [
        { name: `s[${bl}]`, value: chars[bl] },
        { name: `s[${br}]`, value: chars[br] },
        { name: 'match', value: 'true' },
      ],
    });

    bl += 1;
    br -= 1;

    steps.push({
      explanation: `while l<r (${bl}<${br}): false — skippable's loop exits, return True. skippable(l, r-1) is True, so the \`or\` evaluates to True and the outer function returns it. Substring "${s.slice(l, r)}" reads as a palindrome once '${chars[r]}' at index ${r} is deleted. Outer function returns True.`,
      // nth 1: skippable()'s own 'return True'; hit 2 is the outer function's (unreachable in
      // this trace — we return via skippable(l,r-1) truthy, not the outer 'return True').
      anchor: { match: 'return True', nth: 1 },
      state: arrayState(chars, { cellState: (i) => (i === r ? 'eliminated' : 'found') }),
      variables: [
        { name: 'skippable(l, r-1)', value: 'True', highlight: true },
        { name: 'return', value: 'True', highlight: true },
      ],
    });
  }

  return steps;
}

const solution: SolutionVariant = {
  label: 'Two Pointers + Skip Check',
  variant: 'skip-check',
  generateSteps,
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(1)',
};

export const validPalindromeIIMeta: AlgorithmMeta = {
  id: 'valid-palindrome-ii',
  lcNumber: 680,
  title: 'Valid Palindrome II',
  difficulty: 'Easy',
  category: 'two-pointers',
  tags: ['Two Pointers', 'String', 'Greedy'],
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
