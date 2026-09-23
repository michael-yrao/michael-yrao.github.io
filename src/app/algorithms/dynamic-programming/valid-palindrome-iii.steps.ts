import { AlgorithmMeta, SolutionVariant, Step, StepAnchor, ProblemExample } from '../../core/models/algorithm.model';

// Traces cse-progress's kPalindrome and kPalindromeDP verbatim. Both share the same
// two-pointer backtracking body (match/mismatch/branch) over the same while-loop, and differ
// only in memoization: kPalindrome is plain recursive backtracking with no memo at all;
// kPalindromeDP wraps the identical backtrack in Python's `@cache` decorator, which does
// memoize. The intro/final explanation text below is parametrized per variant so it stays
// truthful to that.

// s = "abcdeca", k = 2
// The backtracking approach: two-pointer from outside in, skip left or skip right when mismatch
// Trace: l=0('a'), r=6('a') → match, l=1, r=5
//        l=1('b'), r=5('c') → mismatch, branch:
//          branch A: skip left  → l=2('c'), r=5('c') → match, l=3,r=4
//                                  l=3('d'), r=4('e') → mismatch, k=1→0, branch:
//                                    skip l: l=4('e'),r=4('e') match → return true ✓
//          (branch B not needed — short-circuit)
// Result: true (2 removals: 'b' and 'e' ... or 'b' and 'd')

const chars = ['a', 'b', 'c', 'd', 'e', 'c', 'a'];

function makeCells(
  l: number,
  r: number,
  matched: Set<number>,
  skipped: Set<number>
) {
  return chars.map((ch, i) => ({
    value: ch,
    state:
      matched.has(i)
        ? ('found' as const)
        : skipped.has(i)
        ? ('eliminated' as const)
        : i === l || i === r
        ? ('active' as const)
        : ('default' as const),
  }));
}

interface BacktrackingTrace {
  introAnchor: StepAnchor;
  introExplanation: string;
  finalExplanation: string;
}

const BACKTRACKING_TRACE: BacktrackingTrace = {
  introAnchor: { match: 'def backtrack(l,r,skipsRemaining):' },
  introExplanation: `Valid Palindrome III: is s = "abcdeca" a 2-palindrome? A string is a k-palindrome if it can become a palindrome by removing at most k characters. Strategy: two-pointer backtracking. Use left (l) and right (r) pointers; while s[l] == s[r], advance both. The moment they differ, branch — try skipping l (backtrack(l+1, r, skipsRemaining-1)) OR skipping r (backtrack(l, r-1, skipsRemaining-1)), short-circuiting on the first branch that returns true. No memoization: a revisited (l, r, skipsRemaining) state is recomputed.`,
  finalExplanation: `Final result: true. The string "abcdeca" can be made into a palindrome by removing at most 2 characters — remove 'b' (index 1) and 'd' (index 3) → "aceca", which is a palindrome. This is plain exponential-time backtracking — no memo table, no @cache — so every (l, r, skipsRemaining) state that gets revisited is recomputed from scratch: O(n·2^k) time, O(k) recursion depth (each call spends one skip, so depth is bounded by k+1).`,
};

const CACHE_TRACE: BacktrackingTrace = {
  introAnchor: { match: 'if skipsRemaining < 0:' },
  introExplanation: `Valid Palindrome III: is s = "abcdeca" a 2-palindrome? A string is a k-palindrome if it can become a palindrome by removing at most k characters. Strategy: two-pointer backtracking. Use left (l) and right (r) pointers; when s[l] == s[r] advance both. When they differ, branch — try skipping l or skipping r (costs one removal each). The \`@cache\` decorator on backtrack memoizes every (l, r, skipsRemaining) call automatically.`,
  finalExplanation: `Final result: true. The string "abcdeca" can be made into a palindrome by removing at most 2 characters (e.g., remove 'b' and 'd' → "aceca" or remove 'b' and 'e' → "acdca"). \`@cache\` memoized every (l, r, skipsRemaining) call, cutting this from exponential O(n·2^k) to polynomial O(n²·k).`,
};

function generateBacktrackingSteps(trace: BacktrackingTrace): Step[] {
  const steps: Step[] = [];
  const s = 'abcdeca';
  const k = 2;
  const n = s.length;

  const matched = new Set<number>();
  const skipped = new Set<number>();

  // Step 0: Introduction
  steps.push({
    explanation: trace.introExplanation,
    anchor: trace.introAnchor,
    state: {
      type: 'array',
      cells: chars.map(ch => ({ value: ch, state: 'default' as const })),
      pointers: [
        { index: 0, label: 'l' },
        { index: n - 1, label: 'r' },
      ],
      counters: [
        { label: 'k (skips left)', value: k },
        { label: 'result', value: '?' },
      ],
    },
    variables: [
      { name: 's', value: s },
      { name: 'k', value: k },
      { name: 'n', value: n },
    ],
  });

  // Step 1: l=0, r=6 → 'a' == 'a' match
  steps.push({
    explanation: `backtrack(l=0, r=6, skips=2): s[0]='a' == s[6]='a' → match! Advance both pointers: l=1, r=5. No removal used. Matched pair highlighted in green.`,
    anchor: { match: 'if s[l] == s[r]:', to: { match: 'r-=1' } },
    state: {
      type: 'array',
      cells: chars.map((ch, i) => ({
        value: ch,
        state:
          i === 0 || i === 6
            ? ('found' as const)
            : ('default' as const),
      })),
      pointers: [
        { index: 0, label: 'l=0' },
        { index: 6, label: 'r=6' },
      ],
      counters: [
        { label: 'k (skips left)', value: 2 },
        { label: 'result', value: '?' },
      ],
    },
    variables: [
      { name: 'l', value: 0 },
      { name: 'r', value: 6 },
      { name: 's[l]', value: 'a' },
      { name: 's[r]', value: 'a' },
      { name: 'match', value: 'true' },
    ],
  });

  matched.add(0);
  matched.add(6);

  // Step 2: l=1, r=5 → 'b' != 'c' mismatch → branch
  steps.push({
    explanation: `backtrack(l=1, r=5, skips=2): s[1]='b' != s[5]='c' → mismatch. Must branch: try skipping left (backtrack(l=2, r=5, skips=1)) OR skipping right (backtrack(l=1, r=4, skips=1)). We explore skip-left first (short-circuit OR).`,
    anchor: { match: 'return backtrack(l+1, r, skipsRemaining-1) or backtrack(l,r-1,skipsRemaining-1)' },
    state: {
      type: 'array',
      cells: chars.map((ch, i) => ({
        value: ch,
        state:
          matched.has(i)
            ? ('found' as const)
            : i === 1 || i === 5
            ? ('active' as const)
            : ('default' as const),
      })),
      pointers: [
        { index: 1, label: 'l=1' },
        { index: 5, label: 'r=5' },
      ],
      counters: [
        { label: 'k (skips left)', value: 2 },
        { label: 'result', value: '?' },
      ],
    },
    variables: [
      { name: 'l', value: 1 },
      { name: 'r', value: 5 },
      { name: 's[l]', value: 'b' },
      { name: 's[r]', value: 'c' },
      { name: 'mismatch → branch', value: 'skip l or skip r' },
    ],
  });

  // Branch A: skip left (skip index 1 = 'b'), now l=2, r=5
  skipped.add(1);
  steps.push({
    explanation: `Branch A: skip left — remove 'b' at index 1. backtrack(l=2, r=5, skips=1): s[2]='c' == s[5]='c' → match! Advance: l=3, r=4. Skips remaining: 1.`,
    anchor: { match: 'if s[l] == s[r]:', to: { match: 'r-=1' } },
    state: {
      type: 'array',
      cells: chars.map((ch, i) => ({
        value: ch,
        state:
          matched.has(i)
            ? ('found' as const)
            : skipped.has(i)
            ? ('eliminated' as const)
            : i === 2 || i === 5
            ? ('found' as const)
            : ('default' as const),
      })),
      pointers: [
        { index: 2, label: 'l=2' },
        { index: 5, label: 'r=5' },
      ],
      counters: [
        { label: 'k (skips left)', value: 1 },
        { label: 'result', value: '?' },
      ],
    },
    variables: [
      { name: 'l', value: 2 },
      { name: 'r', value: 5 },
      { name: 's[l]', value: 'c' },
      { name: 's[r]', value: 'c' },
      { name: 'match', value: 'true' },
    ],
  });

  matched.add(2);
  matched.add(5);

  // l=3, r=4 → 'd' != 'e' mismatch, skips=1
  steps.push({
    explanation: `backtrack(l=3, r=4, skips=1): s[3]='d' != s[4]='e' → mismatch again. Branch: skip left (backtrack(l=4, r=4, skips=0)) or skip right (backtrack(l=3, r=3, skips=0)). Try skip-left first.`,
    anchor: { match: 'return backtrack(l+1, r, skipsRemaining-1) or backtrack(l,r-1,skipsRemaining-1)' },
    state: {
      type: 'array',
      cells: chars.map((ch, i) => ({
        value: ch,
        state:
          matched.has(i)
            ? ('found' as const)
            : skipped.has(i)
            ? ('eliminated' as const)
            : i === 3 || i === 4
            ? ('active' as const)
            : ('default' as const),
      })),
      pointers: [
        { index: 3, label: 'l=3' },
        { index: 4, label: 'r=4' },
      ],
      counters: [
        { label: 'k (skips left)', value: 1 },
        { label: 'result', value: '?' },
      ],
    },
    variables: [
      { name: 'l', value: 3 },
      { name: 'r', value: 4 },
      { name: 's[l]', value: 'd' },
      { name: 's[r]', value: 'e' },
      { name: 'mismatch → branch', value: 'skip l or skip r' },
    ],
  });

  // skip 'd' at index 3: l=4, r=4 → l >= r → true
  skipped.add(3);
  steps.push({
    explanation: `Skip left — remove 'd' at index 3. backtrack(l=4, r=4, skips=0): l >= r → palindrome condition met! Return true. Total removals used: 2 ('b' and 'd'). 2 ≤ k=2 → valid k-palindrome.`,
    anchor: { match: 'return True' },
    state: {
      type: 'array',
      cells: chars.map((ch, i) => ({
        value: ch,
        state:
          matched.has(i)
            ? ('found' as const)
            : skipped.has(i)
            ? ('eliminated' as const)
            : i === 4
            ? ('found' as const)
            : ('default' as const),
      })),
      pointers: [{ index: 4, label: 'l=r=4' }],
      counters: [
        { label: 'k (skips left)', value: 0 },
        { label: 'result', value: 'true' },
      ],
    },
    variables: [
      { name: 'l', value: 4 },
      { name: 'r', value: 4 },
      { name: 'l >= r', value: 'true → return true' },
    ],
  });

  matched.add(4);

  // Final step
  steps.push({
    explanation: trace.finalExplanation,
    anchor: { match: 'return backtrack(0,len(s)-1,k)' },
    state: {
      type: 'array',
      cells: chars.map((ch, i) => ({
        value: ch,
        state:
          skipped.has(i)
            ? ('eliminated' as const)
            : ('found' as const),
      })),
      pointers: [],
      counters: [
        { label: 'k (skips left)', value: 0 },
        { label: 'result', value: 'true' },
      ],
    },
    variables: [{ name: 'return', value: 'true', highlight: true }],
  });

  return steps;
}

const solutionBacktracking: SolutionVariant = {
  label: 'Backtracking',
  variant: 'backtracking',
  generateSteps: () => generateBacktrackingSteps(BACKTRACKING_TRACE),
  timeComplexity: 'O(n·2^k) — plain exponential backtracking, no memoization',
  spaceComplexity: 'O(k) recursion depth',
};

const solutionCache: SolutionVariant = {
  label: 'Backtracking + @cache',
  variant: 'cache',
  generateSteps: () => generateBacktrackingSteps(CACHE_TRACE),
  timeComplexity: 'O(n²·k)',
  spaceComplexity: 'O(n²·k)',
};

export const validPalindromeIIIMeta: AlgorithmMeta = {
  id: 'valid-palindrome-iii',
  lcNumber: 1216,
  title: 'Valid Palindrome III',
  difficulty: 'Hard',
  category: 'dynamic-programming',
  tags: ['String', 'Dynamic Programming', 'Backtracking', 'Memoization'],
  timeComplexity: 'O(n²·k)',
  spaceComplexity: 'O(n²·k)',
  description:
    'Given a string s and an integer k, return true if s is a k-palindrome. A string is k-palindrome if it can be transformed into a palindrome by removing at most k characters from it.',
  examples: [
    {
      input: 's = "abcdeca", k = 2',
      output: 'true',
      explanation: "Remove 'b' and 'd' to get \"aceca\" (or 'b' and 'e' to get \"acdca\"), which is a palindrome.",
    },
    {
      input: 's = "abcdeca", k = 1',
      output: 'false',
      explanation: 'At least 2 deletions are needed; 1 is not enough.',
    },
  ] as ProblemExample[],
  constraints: [
    '1 ≤ s.length ≤ 1000',
    's consists of lowercase English letters only.',
    '1 ≤ k ≤ s.length',
  ],
  hint: 'Use two-pointer backtracking: l and r start at opposite ends. When s[l] == s[r], advance both. When they differ, branch — try removing s[l] (call backtrack(l+1, r, k-1)) OR removing s[r] (call backtrack(l, r-1, k-1)). Memoize on (l, r, skipsRemaining) to cut exponential time to polynomial.',
  solutions: [solutionBacktracking, solutionCache],
};
