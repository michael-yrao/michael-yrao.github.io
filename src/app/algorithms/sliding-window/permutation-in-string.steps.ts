import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

// ── Step generator ────────────────────────────────────────────────────────────
//
// Traces cse-progress's checkInclusion verbatim: two 26-length arrays (s1Array, s2Array) and a
// nested compareS1andS2() that does an O(26) elementwise comparison — not a dict/map diff. The
// length guard (`if len(s1) > len(s2): return False`) runs BEFORE s1Array is populated. The
// shrink is a `while r-l+1 > len(s1)` (not an `if`), and compareS1andS2() is called
// UNCONDITIONALLY every outer iteration — even before the window first reaches full size —
// not gated behind a "window is exactly len(s1)" check.

const ALPHABET_SIZE = 26;
const CHAR_CODE_A = 'a'.charCodeAt(0);

function charIndex(ch: string): number {
  return ch.charCodeAt(0) - CHAR_CODE_A;
}

/** Renders a 26-slot frequency array as a compact {char:count} display, non-zero slots only. */
function displayFreq(arr: readonly number[]): Record<string, number> {
  const display: Record<string, number> = {};
  arr.forEach((count, idx) => {
    if (count > 0) display[String.fromCharCode(CHAR_CODE_A + idx)] = count;
  });
  return display;
}

function arraysEqual(a: readonly number[], b: readonly number[]): boolean {
  for (let i = 0; i < ALPHABET_SIZE; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

function generateSteps(): Step[] {
  const s1 = 'ab';
  const s2 = 'eidbaooo';
  const steps: Step[] = [];

  const s1Array = new Array(ALPHABET_SIZE).fill(0);
  const s2Array = new Array(ALPHABET_SIZE).fill(0);

  const snap = (l: number, r: number, found: boolean) =>
    s2.split('').map((ch, i) => ({
      value: ch,
      state: (found && i >= l && i <= r
        ? 'found'
        : i >= l && i <= r
        ? 'window'
        : i < l
        ? 'eliminated'
        : 'default') as 'found' | 'window' | 'eliminated' | 'default',
    }));

  steps.push({
    explanation:
      'def compareS1andS2(): for i in range(26): if s1Array[i] != s2Array[i]: return False; return True. An O(26) elementwise array comparison — not a dict diff. This is what O(26)=O(1) means here.',
    // nth 1: compareS1andS2()'s own 'return True'; hit 2 is the outer function's 'return True'
    // upon a match, further down.
    anchor: { match: 'def compareS1andS2() -> bool:', to: { match: 'return True', nth: 1 } },
    state: { type: 'array', cells: s2.split('').map((ch) => ({ value: ch, state: 'default' as const })), pointers: [] },
    variables: [{ name: 's1', value: s1 }, { name: 's2', value: s2 }],
  });

  steps.push({
    explanation: 's1Array = [0]*26; s2Array = [0]*26. Both start empty.',
    anchor: { match: 's1Array = [0] * 26', to: { match: 's2Array = [0] * 26' } },
    state: { type: 'array', cells: s2.split('').map((ch) => ({ value: ch, state: 'default' as const })), pointers: [] },
    variables: [{ name: 's1Array', value: '[0]*26' }, { name: 's2Array', value: '[0]*26' }],
  });

  steps.push({
    explanation: `l = r = 0. if len(s1) > len(s2): return False — len(s1)=${s1.length}, len(s2)=${s2.length}, ${s1.length > s2.length ? 'true, would return False here' : 'false, so no early return — proceed'}.`,
    // nth 2: hit 1 is compareS1andS2()'s own 'return False' (it's defined earlier in the file);
    // this guard's own 'return False' is the 2nd; hit 3 is the final "exhausted" return.
    anchor: { match: 'if len(s1) > len(s2):', to: { match: 'return False', nth: 2 } },
    state: { type: 'array', cells: s2.split('').map((ch) => ({ value: ch, state: 'default' as const })), pointers: [{ index: 0, label: 'l=r' }] },
    variables: [{ name: 'l', value: 0 }, { name: 'r', value: 0 }],
  });

  for (let i = 0; i < s1.length; i++) {
    s1Array[charIndex(s1[i])] += 1;
    steps.push({
      explanation: `for i in range(len(s1)): s1Array[ord(s1[${i}])-ord('a')] += 1 → s1Array counts '${s1[i]}'. s1Array so far: ${JSON.stringify(displayFreq(s1Array))}.`,
      anchor: { match: 'for i in range(len(s1)):', to: { match: "s1Array[ord(s1[i]) - ord('a')] += 1" } },
      state: { type: 'array', cells: s2.split('').map((ch) => ({ value: ch, state: 'default' as const })), pointers: [], hashmap: displayFreq(s1Array) },
      variables: [{ name: 's1[i]', value: s1[i], highlight: true }, { name: 's1Array', value: JSON.stringify(displayFreq(s1Array)) }],
    });
  }

  let l = 0;

  for (let r = 0; r < s2.length; r++) {
    s2Array[charIndex(s2[r])] += 1;

    steps.push({
      explanation: `while r < len(s2): s2Array[ord(s2[${r}])-ord('a')] += 1 → s2Array counts '${s2[r]}'.`,
      anchor: { match: 'while r < len(s2):', to: { match: "s2Array[ord(s2[r]) - ord('a')] += 1" } },
      state: { type: 'array', cells: snap(l, r, false), pointers: [{ index: l, label: 'l' }, { index: r, label: 'r' }], hashmap: displayFreq(s2Array) },
      variables: [{ name: 'r', value: r, highlight: true }, { name: 's2[r]', value: s2[r] }],
    });

    while (r - l + 1 > s1.length) {
      const removedCh = s2[l];
      s2Array[charIndex(removedCh)] -= 1;
      const oldL = l;
      l++;
      steps.push({
        explanation: `while r-l+1 > len(s1) (${r - oldL + 1} > ${s1.length}): s2Array[ord(s2[l])-ord('a')] -= 1 → remove '${removedCh}'. l+=1 → ${l}.`,
        anchor: { match: 'while r - l + 1 > len(s1):', to: { match: 'l+=1' } },
        state: { type: 'array', cells: snap(l, r, false), pointers: [{ index: l, label: 'l' }, { index: r, label: 'r' }], hashmap: displayFreq(s2Array) },
        variables: [{ name: 'removed', value: removedCh, highlight: true }, { name: 'l', value: l, highlight: true }],
      });
    }

    const isMatch = arraysEqual(s1Array, s2Array);

    if (isMatch) {
      steps.push({
        explanation: `if compareS1andS2(): window [${l}..${r}] = "${s2.slice(l, r + 1)}" — s2Array matches s1Array exactly. return True.`,
        // nth 2: hit 1 is compareS1andS2()'s own 'return True' inside the helper; this is the
        // outer function's return upon a match.
        anchor: { match: 'if compareS1andS2():', to: { match: 'return True', nth: 2 } },
        state: { type: 'array', cells: snap(l, r, true), pointers: [{ index: l, label: 'l' }, { index: r, label: 'r' }], hashmap: displayFreq(s2Array) },
        variables: [{ name: 'window', value: s2.slice(l, r + 1) }, { name: 'match?', value: 'YES → True', highlight: true }],
      });
      return steps;
    }

    steps.push({
      explanation: `if compareS1andS2(): window [${l}..${r}] = "${s2.slice(l, r + 1)}" — s2Array ≠ s1Array, the if doesn't fire. r+=1.`,
      anchor: { match: 'r+=1' },
      state: { type: 'array', cells: snap(l, r, false), pointers: [{ index: l, label: 'l' }, { index: r, label: 'r' }], hashmap: displayFreq(s2Array) },
      variables: [{ name: 'window', value: s2.slice(l, r + 1) }, { name: 'match?', value: 'no' }],
    });
  }

  steps.push({
    explanation: 'Loop exhausted without a match. return False.',
    // nth 3: hit 1 is compareS1andS2()'s own 'return False'; hit 2 is the length-guard's near
    // the top; this is the final, loop-exhausted return.
    anchor: { match: 'return False', nth: 3 },
    state: { type: 'array', cells: s2.split('').map((ch) => ({ value: ch, state: 'eliminated' as const })), pointers: [] },
    variables: [{ name: 'return', value: 'False', highlight: true }],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Fixed-Size Sliding Window + Freq Array',
  variant: 'fixed-window',
  generateSteps,
};

export const permutationInStringMeta: AlgorithmMeta = {
  id: 'permutation-in-string',
  lcNumber: 567,
  title: 'Permutation in String',
  difficulty: 'Medium',
  category: 'sliding-window',
  tags: ['Hash Map', 'Sliding Window', 'Two Pointers'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(1)',
  description:
    'Given two strings s1 and s2, return true if s2 contains a permutation of s1, or false otherwise. In other words, return true if one of s1\'s permutations is a substring of s2.',
  examples: [
    {
      input: 's1 = "ab", s2 = "eidbaooo"',
      output: 'true',
      explanation: 's2 contains one permutation of s1 ("ba" at index 3).',
    },
    {
      input: 's1 = "ab", s2 = "eidboaoo"',
      output: 'false',
    },
  ] as ProblemExample[],
  constraints: [
    '1 ≤ s1.length, s2.length ≤ 10⁴',
    's1 and s2 consist of lowercase English letters.',
  ],
  hint: 'A permutation has the same character frequencies. Use a fixed-size sliding window of length len(s1) over s2, tracking two 26-element frequency arrays (indexed by ord(c) - ord(\'a\')) and comparing them in O(26) instead of diffing a map.',
  solutions: [solution],
};
