import { AlgorithmMeta, SolutionVariant, Step, ArrayState, ProblemExample } from '../../core/models/algorithm.model';

// ── Step generator ────────────────────────────────────────────────────────────
//
// Traces cse-progress's successfulPairs_20260619 verbatim: potions.sort() happens BEFORE
// result = [0] * len(spells) is allocated. For each spell i: l, r = 0, len(potions)-1; a
// min-boundary binary search using spells[i] * potions[m] >= success (spell first, potion
// second — not the reverse). After the loop, a separate check on potions[l] decides result[i]:
// 0 if it still fails, else len(potions) - l.

// Input: spells=[5,1,3], potions=[1,2,3,4,5], success=7 (potions already sorted)

function generateSteps(): Step[] {
  const steps: Step[] = [];
  const spells = [5, 1, 3];
  const potions = [1, 2, 3, 4, 5]; // already sorted
  const success = 7;
  const result = [0, 0, 0];

  const potionCells = (overrides: Record<number, 'window' | 'active' | 'eliminated' | 'found'>) =>
    potions.map((v, i) => ({ value: v, state: overrides[i] ?? ('default' as const) }));

  // ── Setup ─────────────────────────────────────────────────────────────────

  steps.push({
    explanation:
      'spells=[5,1,3], potions=[1,2,3,4,5], success=7. Output size = len(spells) = 3. Brute force O(n*m) checks every pair. Optimization: since ordering of potions does not affect the count, sort potions first, then binary search per spell for the minimum potion index where spells[i]*potions[m] >= success.',
    anchor: { match: 'def successfulPairs_20260619(self, spells: List[int], potions: List[int], success: int) -> List[int]:' },
    state: {
      type: 'array',
      cells: potions.map((v) => ({ value: v, state: 'default' as const })),
      pointers: [],
      counters: [
        { label: 'spells', value: '[5,1,3]' },
        { label: 'success', value: success },
        { label: 'result so far', value: '[0,0,0]' },
      ],
    } as ArrayState,
  });

  steps.push({
    explanation:
      'potions.sort(): [1,2,3,4,5] (already sorted). result = [0]*len(spells) is allocated AFTER sorting. Now binary search on sorted potions for each spell: find leftmost index where spells[i]*potions[m] >= success.',
    anchor: { match: 'potions.sort()', to: { match: 'result = [0] * len(spells)' } },
    state: {
      type: 'array',
      cells: potions.map((v) => ({ value: v, state: 'visited' as const })),
      pointers: [],
      counters: [
        { label: 'sorted potions', value: '[1,2,3,4,5]' },
        { label: 'result', value: '[0,0,0]' },
      ],
    } as ArrayState,
  });

  // ── Spell 0: strength=5, success=7 ────────────────────────────────────────

  steps.push({
    explanation: 'Spell 0: spells[0]=5. l, r = 0, len(potions)-1 → l=0, r=4.',
    anchor: { match: 'for i in range(len(spells)):', to: { match: 'l, r = 0, len(potions) - 1' } },
    state: {
      type: 'array',
      cells: potionCells({}),
      pointers: [{ index: 0, label: 'l' }, { index: 4, label: 'r' }],
      counters: [{ label: 'spells[i]', value: 5 }, { label: 'result so far', value: '[?,0,0]' }],
    } as ArrayState,
  });

  steps.push({
    explanation: 'while l < r (0<4): m=(l+r)//2=2. spells[0]*potions[2] = 5*3 = 15 >= 7 → r = m = 2.',
    anchor: { match: 'if spells[i] * potions[m] >= success:', to: { match: 'r = m', nth: 2 } }, // skips nth=1's comment '# if greater, drop r = m'
    state: {
      type: 'array',
      cells: potionCells({ 0: 'window', 1: 'window', 2: 'active', 3: 'eliminated', 4: 'eliminated' }),
      pointers: [{ index: 0, label: 'l' }, { index: 2, label: 'm/r→' }],
      counters: [{ label: 'spells[i]*potions[m]', value: '5*3=15' }, { label: '>= success?', value: 'YES → r=2' }],
    } as ArrayState,
  });

  steps.push({
    explanation: 'while l < r (0<2): m=(l+r)//2=1. spells[0]*potions[1] = 5*2 = 10 >= 7 → r = m = 1.',
    anchor: { match: 'if spells[i] * potions[m] >= success:', to: { match: 'r = m', nth: 2 } }, // skips nth=1's comment '# if greater, drop r = m'
    state: {
      type: 'array',
      cells: potionCells({ 0: 'window', 1: 'active', 2: 'eliminated', 3: 'eliminated', 4: 'eliminated' }),
      pointers: [{ index: 0, label: 'l' }, { index: 1, label: 'm/r→' }],
      counters: [{ label: 'spells[i]*potions[m]', value: '5*2=10' }, { label: '>= success?', value: 'YES → r=1' }],
    } as ArrayState,
  });

  steps.push({
    explanation: 'while l < r (0<1): m=(l+r)//2=0. spells[0]*potions[0] = 5*1 = 5, not >= 7 → the if doesn\'t fire, else: l = m+1 = 1. Now l==r==1, loop ends.',
    // nth 1: the binary search's own 'else:'/'l = m + 1'; hit 2 of 'else:' belongs to the
    // post-loop success-check's else branch further down.
    anchor: { match: 'else:', nth: 1, to: { match: 'l = m + 1' } },
    state: {
      type: 'array',
      cells: potionCells({ 0: 'eliminated', 1: 'window', 2: 'window', 3: 'window', 4: 'window' }),
      pointers: [{ index: 1, label: 'l=r=1' }],
      counters: [{ label: 'spells[i]*potions[m]', value: '5*1=5' }, { label: '>= success?', value: 'NO → l=1' }],
    } as ArrayState,
  });

  steps.push({
    explanation: 'spells[0]*potions[l] = 5*potions[1] = 5*2 = 10, not < 7 → the if doesn\'t fire, else: result[0] = len(potions) - l = 5 - 1 = 4.',
    // nth 2: hit 1 is the binary search's own 'else:' above; this is the post-loop
    // success-check's else branch (result[i] = len(potions) - l).
    anchor: { match: 'else:', nth: 2, to: { match: 'result[i] = len(potions) - l' } },
    state: {
      type: 'array',
      cells: potionCells({ 0: 'eliminated', 1: 'found', 2: 'found', 3: 'found', 4: 'found' }),
      pointers: [{ index: 1, label: 'cutoff' }],
      counters: [{ label: 'result[0] = 5-1', value: 4 }],
    } as ArrayState,
  });
  result[0] = 4;

  // ── Spell 1: strength=1, success=7 (no potion works) ──────────────────────

  steps.push({
    explanation: 'Spell 1: spells[1]=1. l, r = 0, len(potions)-1 → l=0, r=4.',
    anchor: { match: 'for i in range(len(spells)):', to: { match: 'l, r = 0, len(potions) - 1' } },
    state: {
      type: 'array',
      cells: potionCells({}),
      pointers: [{ index: 0, label: 'l' }, { index: 4, label: 'r' }],
      counters: [{ label: 'spells[i]', value: 1 }, { label: 'result so far', value: `[${result[0]},?,0]` }],
    } as ArrayState,
  });

  steps.push({
    explanation: 'while l < r (0<4): m=(l+r)//2=2. spells[1]*potions[2] = 1*3 = 3, not >= 7 → else: l = m+1 = 3.',
    // nth 1: the binary search's own 'else:'/'l = m + 1'; hit 2 of 'else:' belongs to the
    // post-loop success-check's else branch further down.
    anchor: { match: 'else:', nth: 1, to: { match: 'l = m + 1' } },
    state: {
      type: 'array',
      cells: potionCells({ 0: 'eliminated', 1: 'eliminated', 2: 'eliminated', 3: 'window', 4: 'window' }),
      pointers: [{ index: 3, label: 'l' }, { index: 4, label: 'r' }],
      counters: [{ label: 'spells[i]*potions[m]', value: '1*3=3' }, { label: '>= success?', value: 'NO → l=3' }],
    } as ArrayState,
  });

  steps.push({
    explanation: 'while l < r (3<4): m=(l+r)//2=3. spells[1]*potions[3] = 1*4 = 4, not >= 7 → else: l = m+1 = 4. Now l==r==4, loop ends.',
    // nth 1: the binary search's own 'else:'/'l = m + 1'; hit 2 of 'else:' belongs to the
    // post-loop success-check's else branch further down.
    anchor: { match: 'else:', nth: 1, to: { match: 'l = m + 1' } },
    state: {
      type: 'array',
      cells: potionCells({ 0: 'eliminated', 1: 'eliminated', 2: 'eliminated', 3: 'eliminated', 4: 'window' }),
      pointers: [{ index: 4, label: 'l=r=4' }],
      counters: [{ label: 'spells[i]*potions[m]', value: '1*4=4' }, { label: '>= success?', value: 'NO → l=4' }],
    } as ArrayState,
  });

  steps.push({
    explanation: 'spells[1]*potions[l] = 1*potions[4] = 1*5 = 5 < 7 → result[1] = 0.',
    anchor: { match: 'if spells[i] * potions[l] < success:', to: { match: 'result[i] = 0' } },
    state: {
      type: 'array',
      cells: potionCells({ 4: 'eliminated' }),
      pointers: [{ index: 4, label: 'cutoff' }],
      counters: [{ label: 'result[1]', value: 0 }],
    } as ArrayState,
  });
  result[1] = 0;

  // ── Spell 2: strength=3, success=7 ────────────────────────────────────────

  steps.push({
    explanation: 'Spell 2: spells[2]=3. l, r = 0, len(potions)-1 → l=0, r=4.',
    anchor: { match: 'for i in range(len(spells)):', to: { match: 'l, r = 0, len(potions) - 1' } },
    state: {
      type: 'array',
      cells: potionCells({}),
      pointers: [{ index: 0, label: 'l' }, { index: 4, label: 'r' }],
      counters: [{ label: 'spells[i]', value: 3 }, { label: 'result so far', value: `[${result[0]},${result[1]},?]` }],
    } as ArrayState,
  });

  steps.push({
    explanation: 'while l < r (0<4): m=(l+r)//2=2. spells[2]*potions[2] = 3*3 = 9 >= 7 → r = m = 2.',
    anchor: { match: 'if spells[i] * potions[m] >= success:', to: { match: 'r = m', nth: 2 } }, // skips nth=1's comment '# if greater, drop r = m'
    state: {
      type: 'array',
      cells: potionCells({ 0: 'window', 1: 'window', 2: 'active', 3: 'eliminated', 4: 'eliminated' }),
      pointers: [{ index: 0, label: 'l' }, { index: 2, label: 'm/r→' }],
      counters: [{ label: 'spells[i]*potions[m]', value: '3*3=9' }, { label: '>= success?', value: 'YES → r=2' }],
    } as ArrayState,
  });

  steps.push({
    explanation: 'while l < r (0<2): m=(l+r)//2=1. spells[2]*potions[1] = 3*2 = 6, not >= 7 → else: l = m+1 = 2. Now l==r==2, loop ends.',
    // nth 1: the binary search's own 'else:'/'l = m + 1'; hit 2 of 'else:' belongs to the
    // post-loop success-check's else branch further down.
    anchor: { match: 'else:', nth: 1, to: { match: 'l = m + 1' } },
    state: {
      type: 'array',
      cells: potionCells({ 0: 'eliminated', 1: 'eliminated', 2: 'window', 3: 'window', 4: 'window' }),
      pointers: [{ index: 2, label: 'l=r=2' }],
      counters: [{ label: 'spells[i]*potions[m]', value: '3*2=6' }, { label: '>= success?', value: 'NO → l=2' }],
    } as ArrayState,
  });

  steps.push({
    explanation: 'spells[2]*potions[l] = 3*potions[2] = 3*3 = 9, not < 7 → else: result[2] = len(potions) - l = 5 - 2 = 3.',
    // nth 2: hit 1 is the binary search's own 'else:' above; this is the post-loop
    // success-check's else branch (result[i] = len(potions) - l).
    anchor: { match: 'else:', nth: 2, to: { match: 'result[i] = len(potions) - l' } },
    state: {
      type: 'array',
      cells: potionCells({ 0: 'eliminated', 1: 'eliminated', 2: 'found', 3: 'found', 4: 'found' }),
      pointers: [{ index: 2, label: 'cutoff' }],
      counters: [{ label: 'result[2] = 5-2', value: 3 }],
    } as ArrayState,
  });
  result[2] = 3;

  // ── Final result ──────────────────────────────────────────────────────────

  steps.push({
    explanation: `All spells processed. return result = [${result.join(',')}]. Sort potions O(m log m) + binary search per spell O(n log m) = O((n+m) log m) total. Space O(n) for output.`,
    anchor: { match: 'return result' },
    state: {
      type: 'array',
      cells: potions.map((v) => ({ value: v, state: 'found' as const })),
      pointers: [],
      counters: [
        { label: 'spell=5 pairs', value: result[0] },
        { label: 'spell=1 pairs', value: result[1] },
        { label: 'spell=3 pairs', value: result[2] },
        { label: 'output', value: `[${result.join(',')}]` },
      ],
    } as ArrayState,
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Sort Potions + Binary Search (Min Boundary)',
  variant: 'sort-min-boundary',
  generateSteps,
};

export const successfulPairsSpellsPotionsMeta: AlgorithmMeta = {
  id: 'successful-pairs-spells-potions',
  lcNumber: 2300,
  title: 'Successful Pairs of Spells and Potions',
  difficulty: 'Medium',
  category: 'binary-search',
  tags: ['Array', 'Binary Search', 'Sorting'],
  timeComplexity: 'O(n log n)',
  spaceComplexity: 'O(n)',
  description:
    'Given spells, potions, and a success threshold, find for each spell how many potions form a successful pair (spell*potion >= success). Return an array of counts.',
  examples: [
    {
      input: 'spells = [5,1,3], potions = [1,2,3,4,5], success = 7',
      output: '[4,0,3]',
      explanation: 'Spell 5: 4 potions work. Spell 1: 0 potions work. Spell 3: 3 potions work.',
    },
    {
      input: 'spells = [3,1,2], potions = [8,5,8], success = 16',
      output: '[2,0,2]',
    },
  ] as ProblemExample[],
  constraints: [
    'n == spells.length',
    'm == potions.length',
    '1 ≤ n, m ≤ 10⁵',
    '1 ≤ spells[i], potions[i] ≤ 10⁵',
    '1 ≤ success ≤ 10¹⁰',
  ],
  hint: 'Sort potions. For each spell, binary search for the leftmost potion index where spells[i]*potions[m] >= success (min-boundary search: if condition met set r=m, else set l=m+1). result[i] = len(potions) - l (if spells[i]*potions[l] >= success, else 0).',
  solutions: [solution],
};
