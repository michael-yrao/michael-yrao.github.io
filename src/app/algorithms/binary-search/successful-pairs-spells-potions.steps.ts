import { AlgorithmMeta, SolutionVariant, Step, ArrayState, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `from typing import List

class Solution:
    # time complexity: O(nlogm + mlogm) ; mlogm to sort the potion ; nlogm to find min boundary
    def successfulPairs(self, spells: List[int], potions: List[int], success: int) -> List[int]:
        # ok so first thing to notice is that size of output = len(spells)
        # brute force solution is to just iterate over both, check spells[i]*potions[j]>success and increment output[i]
        # this would be a O(n*m) solution
        # so note that we are keeping track of numbers of success, so ordering doesn't matter much, so we can sort potions
        # if we can sort potions, we can find the minimum potion strength such that it is successful
        # so what this becomes is a min boundary binary search problem
        # condition that we found the min is that if potions[mid] * spells[i] >= success and potions[right] * spells[i] >= success
        # that means we definitely want to go to the left

        successRate = [0] * len(spells)

        potions.sort()

        for i in range(len(spells)):
            l, r = 0, len(potions) - 1
            while l < r:
                mid = (l + r) // 2
                if potions[mid] * spells[i] >= success:
                    r = mid
                else:
                    l = mid + 1

            # if min boundary is < success, then assign 0
            if potions[l] * spells[i] < success:
                successRate[i] = 0
            else:
                successRate[i] = len(potions) - l

        return successRate`;

// Input: spells=[5,1,3], potions=[1,2,3,4,5], success=7
// After sorting potions: [1,2,3,4,5] (already sorted)
// spell=5: 5*p >= 7 → p >= 7/5=1.4 → min potion=2 (index 1) → pairs=5-1=4
// spell=1: 1*p >= 7 → p >= 7  → none → pairs=0
// spell=3: 3*p >= 7 → p >= 7/3=2.33 → min potion=3 (index 2) → pairs=5-2=3

function generateSteps(): Step[] {
  const steps: Step[] = [];
  const spells = [5, 1, 3];
  const potions = [1, 2, 3, 4, 5]; // already sorted
  const success = 7;
  const successRate = [0, 0, 0];

  // ── Setup ─────────────────────────────────────────────────────────────────

  steps.push({
    explanation:
      'spells=[5,1,3], potions=[1,2,3,4,5], success=7. Output size = len(spells) = 3. Brute force O(n*m) checks every pair. Optimization: since ordering of potions does not affect count, sort potions first, then binary search to find the minimum potion index where spell*potion >= success.',
    highlightLine: 4,
    state: {
      type: 'array',
      cells: potions.map((v) => ({ value: v, state: 'default' as const })),
      pointers: [],
      counters: [
        { label: 'spells', value: '[5,1,3]' },
        { label: 'success', value: success },
        { label: 'pairs so far', value: '[0,0,0]' },
      ],
    } as ArrayState,
  });

  steps.push({
    explanation:
      'potions.sort(): sort potions ascending. Result: [1,2,3,4,5] (already sorted in this case). Sorting costs O(m log m). Now binary search on sorted potions for each spell: find leftmost index where potions[mid]*spell >= success.',
    highlightLine: 17,
    state: {
      type: 'array',
      cells: potions.map((v) => ({ value: v, state: 'visited' as const })),
      pointers: [],
      counters: [
        { label: 'sorted potions', value: '[1,2,3,4,5]' },
        { label: 'sort cost', value: 'O(m log m)' },
      ],
    } as ArrayState,
  });

  // ── Spell 0: strength=5, success=7, need potion >= ceil(7/5)=2 ───────────

  steps.push({
    explanation:
      'Spell 0: strength=5. We need potions[mid]*5 >= 7, i.e. potions[mid] >= 1.4, so min potion=2 (index 1). Binary search on [1,2,3,4,5] with l=0, r=4.',
    highlightLine: 19,
    state: {
      type: 'array',
      cells: potions.map((v) => ({ value: v, state: 'window' as const })),
      pointers: [
        { index: 0, label: 'l' },
        { index: 4, label: 'r' },
      ],
      counters: [
        { label: 'spell', value: 5 },
        { label: 'success threshold', value: success },
        { label: 'need potion >=', value: '7/5=1.4' },
        { label: 'pairs so far', value: '[?,0,0]' },
      ],
    } as ArrayState,
  });

  // l=0, r=4, mid=2. potions[2]*5=15>=7 → r=mid=2
  steps.push({
    explanation:
      'l=0, r=4, mid=2. potions[2]=3. 3*5=15 >= 7 → success! Condition met, but we want the MINIMUM boundary, so set r=mid=2 (try to go further left).',
    highlightLine: 22,
    state: {
      type: 'array',
      cells: [
        { value: 1, state: 'window' as const },
        { value: 2, state: 'window' as const },
        { value: 3, state: 'active' as const },
        { value: 4, state: 'eliminated' as const },
        { value: 5, state: 'eliminated' as const },
      ],
      pointers: [
        { index: 0, label: 'l' },
        { index: 2, label: 'mid/r→' },
      ],
      counters: [
        { label: 'spell', value: 5 },
        { label: 'potions[2]*5', value: '3*5=15' },
        { label: '15 >= 7?', value: 'YES → r=mid=2' },
      ],
    } as ArrayState,
  });

  // l=0, r=2, mid=1. potions[1]*5=10>=7 → r=mid=1
  steps.push({
    explanation:
      'l=0, r=2, mid=1. potions[1]=2. 2*5=10 >= 7 → success! Set r=mid=1.',
    highlightLine: 22,
    state: {
      type: 'array',
      cells: [
        { value: 1, state: 'window' as const },
        { value: 2, state: 'active' as const },
        { value: 3, state: 'eliminated' as const },
        { value: 4, state: 'eliminated' as const },
        { value: 5, state: 'eliminated' as const },
      ],
      pointers: [
        { index: 0, label: 'l' },
        { index: 1, label: 'mid/r→' },
      ],
      counters: [
        { label: 'spell', value: 5 },
        { label: 'potions[1]*5', value: '2*5=10' },
        { label: '10 >= 7?', value: 'YES → r=mid=1' },
      ],
    } as ArrayState,
  });

  // l=0, r=1, mid=0. potions[0]*5=5<7 → l=mid+1=1. Loop ends l==r==1
  steps.push({
    explanation:
      'l=0, r=1, mid=0. potions[0]=1. 1*5=5 < 7 → not successful. Set l=mid+1=1. Now l==r==1, loop ends. Min boundary index=1. Check: potions[1]*5=10>=7 → successRate[0] = len(potions)-l = 5-1 = 4.',
    highlightLine: 24,
    state: {
      type: 'array',
      cells: [
        { value: 1, state: 'eliminated' as const },
        { value: 2, state: 'found' as const },
        { value: 3, state: 'found' as const },
        { value: 4, state: 'found' as const },
        { value: 5, state: 'found' as const },
      ],
      pointers: [{ index: 1, label: 'cutoff (l=r=1)' }],
      counters: [
        { label: 'spell', value: 5 },
        { label: 'potions[0]*5', value: '1*5=5 < 7 → l=1' },
        { label: 'cutoff index', value: 1 },
        { label: 'pairs = 5-1', value: 4 },
      ],
    } as ArrayState,
  });

  successRate[0] = 4;

  // ── Spell 1: strength=1, success=7, need potion >= 7 → none ──────────────

  steps.push({
    explanation:
      'Spell 1: strength=1. Need potions[mid]*1 >= 7, i.e. potion >= 7. Max potion is 5 which is < 7 — no successful pairs exist. Binary search: l=0, r=4.',
    highlightLine: 19,
    state: {
      type: 'array',
      cells: potions.map((v) => ({ value: v, state: 'window' as const })),
      pointers: [
        { index: 0, label: 'l' },
        { index: 4, label: 'r' },
      ],
      counters: [
        { label: 'spell', value: 1 },
        { label: 'need potion >=', value: '7/1=7 (impossible)' },
        { label: 'pairs so far', value: `[${successRate[0]},?,0]` },
      ],
    } as ArrayState,
  });

  // mid=2: 3*1=3<7 → l=3. mid=3: 4*1=4<7 → l=4. l==r==4. potions[4]*1=5<7 → 0 pairs
  steps.push({
    explanation:
      'Binary search narrows down: potions[mid]*1 always < 7 for all potions. Eventually l=r=4. Check: potions[4]*1=5 < 7 → condition fails → successRate[1]=0.',
    highlightLine: 28,
    state: {
      type: 'array',
      cells: potions.map((v) => ({ value: v, state: 'eliminated' as const })),
      pointers: [{ index: 4, label: 'l=r=4' }],
      counters: [
        { label: 'spell', value: 1 },
        { label: 'potions[4]*1', value: '5 < 7 → 0 pairs' },
        { label: 'successRate[1]', value: 0 },
      ],
    } as ArrayState,
  });

  successRate[1] = 0;

  // ── Spell 2: strength=3, success=7, need potion >= ceil(7/3)=3 ───────────

  steps.push({
    explanation:
      'Spell 2: strength=3. Need potions[mid]*3 >= 7, i.e. potion >= 2.33, so min potion=3 (index 2). Binary search: l=0, r=4.',
    highlightLine: 19,
    state: {
      type: 'array',
      cells: potions.map((v) => ({ value: v, state: 'window' as const })),
      pointers: [
        { index: 0, label: 'l' },
        { index: 4, label: 'r' },
      ],
      counters: [
        { label: 'spell', value: 3 },
        { label: 'need potion >=', value: '7/3≈2.33' },
        { label: 'pairs so far', value: `[${successRate[0]},${successRate[1]},?]` },
      ],
    } as ArrayState,
  });

  // l=0, r=4, mid=2. potions[2]*3=9>=7 → r=2
  steps.push({
    explanation:
      'l=0, r=4, mid=2. potions[2]=3. 3*3=9 >= 7 → success! r=mid=2.',
    highlightLine: 22,
    state: {
      type: 'array',
      cells: [
        { value: 1, state: 'window' as const },
        { value: 2, state: 'window' as const },
        { value: 3, state: 'active' as const },
        { value: 4, state: 'eliminated' as const },
        { value: 5, state: 'eliminated' as const },
      ],
      pointers: [
        { index: 0, label: 'l' },
        { index: 2, label: 'mid/r→' },
      ],
      counters: [
        { label: 'spell', value: 3 },
        { label: 'potions[2]*3', value: '3*3=9 >= 7 → r=2' },
      ],
    } as ArrayState,
  });

  // l=0, r=2, mid=1. potions[1]*3=6<7 → l=2. l==r==2
  steps.push({
    explanation:
      'l=0, r=2, mid=1. potions[1]=2. 2*3=6 < 7 → not successful. l=mid+1=2. Now l==r==2. Check: potions[2]*3=9>=7 → successRate[2]=5-2=3.',
    highlightLine: 24,
    state: {
      type: 'array',
      cells: [
        { value: 1, state: 'eliminated' as const },
        { value: 2, state: 'eliminated' as const },
        { value: 3, state: 'found' as const },
        { value: 4, state: 'found' as const },
        { value: 5, state: 'found' as const },
      ],
      pointers: [{ index: 2, label: 'cutoff (l=r=2)' }],
      counters: [
        { label: 'spell', value: 3 },
        { label: 'potions[1]*3', value: '2*3=6 < 7 → l=2' },
        { label: 'cutoff index', value: 2 },
        { label: 'pairs = 5-2', value: 3 },
      ],
    } as ArrayState,
  });

  successRate[2] = 3;

  // ── Final result ──────────────────────────────────────────────────────────

  steps.push({
    explanation:
      `All spells processed. successRate=[${successRate.join(',')}]. Algorithm: sort potions O(m log m) + binary search per spell O(n log m) = O((n+m) log m) total. Space O(n) for output. Key insight: sorting potions lets us use binary search (min-boundary variant) instead of O(n*m) brute force.`,
    highlightLine: 31,
    state: {
      type: 'array',
      cells: potions.map((v) => ({ value: v, state: 'found' as const })),
      pointers: [],
      counters: [
        { label: 'spell=5 pairs', value: successRate[0] },
        { label: 'spell=1 pairs', value: successRate[1] },
        { label: 'spell=3 pairs', value: successRate[2] },
        { label: 'output', value: `[${successRate.join(',')}]` },
      ],
    } as ArrayState,
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Sort Potions + Binary Search (Min Boundary)',
  pythonCode: PYTHON_CODE,
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
  hint: 'Sort potions. For each spell, binary search for the leftmost potion index where potions[mid]*spell >= success (min-boundary search: if condition met set r=mid, else set l=mid+1). Pairs = len(potions) - l (if potions[l]*spell >= success, else 0).',
  solutions: [solution],
};
