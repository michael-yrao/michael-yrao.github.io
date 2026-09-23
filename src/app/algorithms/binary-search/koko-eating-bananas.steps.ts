import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

// Traces cse-progress's minEatingSpeed_20260703 verbatim. Two nested helpers, not one flat
// function: canFinish(m) sums timeTaken = Σ⌈bananas/m⌉ over piles and returns timeTaken <= h;
// minBoundaryBinarySearch(l, r) runs the actual while l < r loop, calling canFinish(m) — if
// canFinish(m): r = m (feasible, keep as candidate) else: l = m + 1 (too slow). l and r arrive
// as that function's own parameters (1, max(piles)), not from a bare l, r = ... assignment.

function generateSteps(): Step[] {
  const piles = [3, 6, 7, 11];
  const h = 8;
  const steps: Step[] = [];

  const maxPile = Math.max(...piles);

  steps.push({
    explanation: `Find the minimum eating speed k so Koko can finish all piles in h=${h} hours. piles=[${piles.join(', ')}]. Binary search on the answer space [1..${maxPile}] (1 is slowest, max(piles) is always fast enough). canFinish(m) sums timeTaken=Σ⌈bananas/m⌉ across piles and returns timeTaken<=h; minBoundaryBinarySearch(l, r) narrows using that.`,
    anchor: { match: 'def minEatingSpeed_20260703(self, piles: List[int], h: int) -> int:' },
    state: {
      type: 'array',
      cells: piles.map(v => ({ value: v, state: 'default' as const })),
      pointers: [],
      counters: [
        { label: 'h (max hours)', value: h },
        { label: 'search range', value: `[1..${maxPile}]` },
      ],
    },
    variables: [
      { name: 'piles', value: `[${piles.join(', ')}]` },
      { name: 'h', value: h },
      { name: 'max(piles)', value: maxPile },
    ],
  });

  let l = 1;
  let r = maxPile;

  steps.push({
    explanation: `Call minBoundaryBinarySearch(1, max(piles)) = minBoundaryBinarySearch(1, ${maxPile}) — l=1, r=${maxPile} arrive as this function's own parameters. Loop is l < r (not l ≤ r) so it converges to the minimum feasible k without overshooting — when l === r, that value is the answer.`,
    anchor: { match: 'return minBoundaryBinarySearch(1,max(piles))' },
    state: {
      type: 'array',
      cells: piles.map(v => ({ value: v, state: 'default' as const })),
      pointers: [],
      counters: [
        { label: 'l', value: l },
        { label: 'r', value: r },
        { label: 'h', value: h },
      ],
    },
    variables: [{ name: 'l', value: l }, { name: 'r', value: r }],
  });

  while (l < r) {
    const m = Math.floor((l + r) / 2);
    let timeTaken = 0;
    for (const bananas of piles) timeTaken += Math.ceil(bananas / m);

    steps.push({
      explanation: `l=${l}, r=${r}, m=${m}. canFinish(${m}) computes timeTaken = Σ⌈bananas/${m}⌉ = ${piles.map(p => `⌈${p}/${m}⌉=${Math.ceil(p / m)}`).join(' + ')} = ${timeTaken}.`,
      anchor: { match: 'timeTaken = 0', to: { match: 'timeTaken+=math.ceil(bananas/m)' } },
      state: {
        type: 'array',
        cells: piles.map(v => ({ value: v, state: 'active' as const })),
        pointers: [],
        counters: [
          { label: 'm (k)', value: m },
          { label: 'timeTaken', value: timeTaken },
          { label: 'h', value: h },
          { label: 'l', value: l },
          { label: 'r', value: r },
        ],
      },
      variables: [
        { name: 'm (k)', value: m },
        { name: 'timeTaken', value: timeTaken },
        { name: 'h', value: h },
      ],
    });

    const feasible = timeTaken <= h;
    steps.push({
      explanation: feasible
        ? `canFinish(${m}) returns timeTaken<=h → ${timeTaken}<=${h} → True: speed m=${m} is feasible — Koko finishes in time. Keep m as a candidate (might do better), set r = m = ${m}.`
        : `canFinish(${m}) returns timeTaken<=h → ${timeTaken}<=${h} → False: speed m=${m} is too slow — Koko can't finish in time. Exclude m, set l = m+1 = ${m + 1}.`,
      anchor: feasible
        ? { match: 'if canFinish(m):' }
        : { match: 'l = m + 1' },
      state: {
        type: 'array',
        cells: piles.map(v => ({
          value: v,
          state: feasible ? ('window' as const) : ('eliminated' as const),
        })),
        pointers: [],
        counters: [
          { label: 'm (k)', value: m },
          { label: 'timeTaken', value: timeTaken },
          { label: 'h', value: h },
          { label: feasible ? 'r →' : 'l →', value: feasible ? m : m + 1 },
        ],
      },
      variables: [
        { name: 'canFinish(m)', value: feasible ? 'True' : 'False', highlight: true },
        { name: feasible ? 'r →' : 'l →', value: feasible ? m : m + 1, highlight: true },
      ],
    });

    if (feasible) r = m;
    else l = m + 1;
  }

  // l === r, found answer
  const answerHours = piles.reduce((sum, p) => sum + Math.ceil(p / l), 0);
  steps.push({
    explanation: `l === r === ${l}: minBoundaryBinarySearch returns l. Minimum eating speed k=${l}. Verification: Σ⌈bananas/${l}⌉ = ${piles.map(p => `⌈${p}/${l}⌉=${Math.ceil(p / l)}`).join(' + ')} = ${answerHours} ≤ ${h} ✓. O(n log m) time where n=piles.length and m=max(piles). O(1) space.`,
    anchor: { match: 'return l' },
    state: {
      type: 'array',
      cells: piles.map(v => ({ value: v, state: 'found' as const })),
      pointers: [],
      counters: [
        { label: 'answer k', value: l },
        { label: 'timeTaken', value: answerHours },
        { label: 'h', value: h },
      ],
    },
    variables: [{ name: 'return k', value: l, highlight: true }],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Binary Search on Answer Space',
  variant: 'answer-space',
  generateSteps,
};

export const kokoEatingBananasMeta: AlgorithmMeta = {
  id: 'koko-eating-bananas',
  lcNumber: 875,
  title: 'Koko Eating Bananas',
  difficulty: 'Medium',
  category: 'binary-search',
  tags: ['Array', 'Binary Search'],
  timeComplexity: 'O(n log m)',
  spaceComplexity: 'O(1)',
  description:
    'Given n piles of bananas and h hours before guards return, find the minimum eating speed k (bananas/hour) such that Koko can eat all bananas in h hours. Each hour she picks one pile and eats up to k bananas from it.',
  examples: [
    {
      input: 'piles = [3,6,7,11], h = 8',
      output: '4',
    },
    {
      input: 'piles = [30,11,23,4,20], h = 5',
      output: '30',
    },
    {
      input: 'piles = [30,11,23,4,20], h = 6',
      output: '23',
    },
  ] as ProblemExample[],
  constraints: [
    '1 ≤ piles.length ≤ 10⁴',
    'piles.length ≤ h ≤ 10⁹',
    '1 ≤ piles[i] ≤ 10⁹',
  ],
  hint: 'The answer lies in [1, max(piles)]. Binary search on k: for each candidate mid, compute Σ⌈pile/mid⌉. If hours > h the speed is too slow (l = mid+1); if hours ≤ h keep mid as a candidate (r = mid). Use l < r to converge on the minimum feasible k.',
  solutions: [solution],
};
