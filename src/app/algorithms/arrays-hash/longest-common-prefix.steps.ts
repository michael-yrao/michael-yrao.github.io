import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

// ── Step generator ────────────────────────────────────────────────────────────
//
// Traces cse-progress's longestCommonPrefix verbatim: there is NO pre-computed
// "shortest string" — the outer loop is bounded by len(strs[0]) (the FIRST
// string, not the shortest), and the inner loop's guard is a single combined
// condition `if i == len(string) or string[i] != strs[0][i]:` — an explicit
// bounds check (since the loop isn't pre-bounded by the shortest length) OR'd
// with the character mismatch check. `strs[0]` itself is compared against
// itself on every outer iteration (it's the first element of `strs`, iterated
// like every other string).

function generateSteps(): Step[] {
  const strs = ['flower', 'flow', 'flight'];
  const steps: Step[] = [];

  const reference = strs[0];
  let prefix = '';
  let diverged = false;

  steps.push({
    explanation: `Find the longest prefix shared by all ${strs.length} strings. Strategy: scan by index against strs[0] = "${reference}" (the FIRST string, not the shortest). At each i, check every string: if i is past that string's length, or its char at i differs from strs[0][i], the common prefix ends there.`,
    anchor: { match: 'prefix = ""' },
    state: {
      type: 'array',
      cells: reference.split('').map(c => ({ value: c, state: 'default' as const })),
      pointers: [],
      hashmap: Object.fromEntries(strs.map((s, i) => [`str${i + 1}`, s])),
    },
    variables: [
      { name: 'strs[0]', value: reference },
      { name: 'prefix', value: '""' },
    ],
  });

  // Highlight which string in the map is currently being compared.
  const strMap = (activeStr: number | null, mark?: 'ok' | 'bad') => {
    const m: Record<string, string> = {};
    strs.forEach((str, k) => {
      const tag = activeStr === k ? (mark === 'bad' ? ' ✗' : mark === 'ok' ? ' ✓' : ' ◀') : '';
      m[`str${k + 1}`] = `"${str}"${tag}`;
    });
    return m;
  };

  outer: for (let i = 0; i < reference.length; i++) {
    const ch = reference[i];

    // Inner loop: compare EVERY string (including strs[0] itself) at position i.
    for (let k = 0; k < strs.length; k++) {
      const s = strs[k];
      const outOfBounds = i >= s.length;
      const mismatch = !outOfBounds && s[i] !== ch;
      const diverges = outOfBounds || mismatch;

      steps.push({
        explanation: diverges
          ? outOfBounds
            ? `i=${i}: check string "${s}". i == len("${s}") (${s.length}) — out of bounds. The common prefix ends here. Return prefix="${prefix}".`
            : `i=${i}: check string "${s}". "${s}"[${i}] = "${s[i]}" ≠ strs[0][${i}] = "${ch}". A string diverged here, so the common prefix ends. Return prefix="${prefix}".`
          : `i=${i}: check string "${s}". Not out of bounds, and "${s}"[${i}] = "${s[i]}" equals strs[0][${i}] = "${ch}" ✓ — keep going to the next string.`,
        anchor: diverges
          ? { match: 'if i == len(string) or string[i] != strs[0][i]:', to: { match: 'return prefix', nth: 2 } } // nth:2 skips the plan comment (hit 1) and the final `return prefix` (hit 3)
          : { match: 'if i == len(string) or string[i] != strs[0][i]:' },
        state: {
          type: 'array',
          cells: reference.split('').map((c, j) => ({
            value: c,
            state:
              j < i ? ('found' as const) : j === i ? (diverges ? ('eliminated' as const) : ('active' as const)) : ('default' as const),
          })),
          pointers: [{ index: i, label: 'i' }],
          hashmap: strMap(k, diverges ? 'bad' : 'ok'),
        },
        variables: [
          { name: 'i', value: i },
          { name: 'string', value: `"${s}"`, highlight: true },
          { name: 'i == len(string)', value: outOfBounds ? 'yes → return' : 'no' },
          { name: `string[${i}] != strs[0][${i}]`, value: outOfBounds ? '—' : mismatch ? 'yes → return' : 'no', highlight: diverges },
        ],
      });

      if (diverges) {
        diverged = true;
        break outer;
      }
    }

    prefix += ch;

    steps.push({
      explanation: `i=${i}: every string had "${ch}" at position ${i} ✓ (no bounds issue, no mismatch). Commit it — prefix grows to "${prefix}". Move to the next position.`,
      anchor: { match: 'prefix += strs[0][i]' },
      state: {
        type: 'array',
        cells: reference.split('').map((c, j) => ({
          value: c,
          state:
            j < prefix.length
              ? ('found' as const)
              : j === prefix.length
              ? ('active' as const)
              : ('default' as const),
        })),
        pointers: [{ index: i, label: 'i' }],
        hashmap: strMap(null),
      },
      variables: [
        { name: 'i', value: i },
        { name: 'char', value: ch },
        { name: 'prefix', value: `"${prefix}"`, highlight: true },
      ],
    });
  }

  if (!diverged) {
    steps.push({
      explanation: `i reached len(strs[0]) = ${reference.length} with no divergence. Return prefix="${prefix}".`,
      anchor: { match: 'return prefix', nth: 3 }, // nth:3 — the final `return prefix` after the loop completes
      state: {
        type: 'array',
        cells: reference.split('').map(c => ({ value: c, state: 'found' as const })),
        pointers: [],
        hashmap: Object.fromEntries(strs.map((s, i) => [`str${i + 1}`, s])),
      },
      variables: [{ name: 'return', value: `"${prefix}"`, highlight: true }],
    });
  }

  return steps;
}

const solution: SolutionVariant = {
  label: 'Vertical Scan',
  variant: 'vertical-scan',
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
  hint: 'Scan by index against strs[0] — no need to pre-find the shortest string. At each i, check every string in turn: if i runs past that string\'s length, or its char at i differs from strs[0][i], the common prefix ends there.',
  solutions: [solution],
};
