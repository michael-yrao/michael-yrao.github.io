import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `import math

class Solution:
    def minEatingSpeed(self, piles: List[int], h: int) -> int:
        # we are looking for the value k
        # using a bit of math, we can tell we are looking for where math.ceil(piles[i] / k) = h
        # we also know the max this k should be is the max(piles)
        # knowing the list is not sorted, we should just go through the list to find the max giving us O(n) minimum
        # brute force solution is trying k from 1 to max(piles), giving us a time complexity of O(n*max(piles))
        # what we can do is actually just do the same thing but with binary search
        # l = 1, r = max(piles)

        l, r = 1, max(piles)

        # we are not sure what we are looking for just yet
        # thus we want to use l < r
        while l < r:
            mid = (l + r) // 2
            currentHours = 0
            for pile in piles:
                currentHours += math.ceil(pile / mid)

            # can't finish the bananas in mid eating speed
            # exclude mid from further searches
            if currentHours > h:
                l = mid + 1
            else:
            # can finish in mid eating speed, keep it as a candidate
                r = mid
        return l`;

function generateSteps(): Step[] {
  const piles = [3, 6, 7, 11];
  const h = 8;
  const steps: Step[] = [];

  const maxPile = Math.max(...piles);

  steps.push({
    explanation: `Find the minimum eating speed k so Koko can finish all piles in h=${h} hours. piles=[${piles.join(', ')}]. Binary search on the answer space [1..${maxPile}] (1 is slowest, max(piles) is always fast enough). For each candidate k, compute hours=Σ⌈pile/k⌉; if hours ≤ h, k is feasible (keep as candidate, try smaller); else k is too slow (must go larger).`,
    highlightLine: 11,
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
    explanation: `Initialize l=1, r=${maxPile}=max(piles). We use l < r (not l ≤ r) because we want to converge to the minimum feasible k without overshooting — when l === r, that value is the answer.`,
    highlightLine: 14,
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
    const mid = Math.floor((l + r) / 2);
    let currentHours = 0;
    for (const pile of piles) currentHours += Math.ceil(pile / mid);

    // Show: computing hours for this k=mid
    steps.push({
      explanation: `l=${l}, r=${r}, mid=${mid} (k=${mid}). Computing hours needed at speed k=${mid}: Σ⌈pile/${mid}⌉ = ${piles.map(p => `⌈${p}/${mid}⌉=${Math.ceil(p / mid)}`).join(' + ')} = ${currentHours}.`,
      highlightLine: 17,
      state: {
        type: 'array',
        cells: piles.map(v => ({ value: v, state: 'active' as const })),
        pointers: [],
        counters: [
          { label: 'k (mid)', value: mid },
          { label: 'hoursNeeded', value: currentHours },
          { label: 'h', value: h },
          { label: 'l', value: l },
          { label: 'r', value: r },
        ],
      },
      variables: [
        { name: 'mid (k)', value: mid },
        { name: 'hoursNeeded', value: currentHours },
        { name: 'h', value: h },
      ],
    });

    const tooSlow = currentHours > h;
    steps.push({
      explanation: tooSlow
        ? `hoursNeeded=${currentHours} > h=${h}: speed k=${mid} is too slow — Koko can't finish in time. Exclude mid, set l = mid+1 = ${mid + 1}.`
        : `hoursNeeded=${currentHours} ≤ h=${h}: speed k=${mid} is feasible — Koko finishes in time. Keep mid as a candidate (might do better), set r = mid = ${mid}.`,
      highlightLine: tooSlow ? 23 : 26,
      state: {
        type: 'array',
        cells: piles.map(v => ({
          value: v,
          state: tooSlow ? ('eliminated' as const) : ('window' as const),
        })),
        pointers: [],
        counters: [
          { label: 'k (mid)', value: mid },
          { label: 'hoursNeeded', value: currentHours },
          { label: 'h', value: h },
          { label: tooSlow ? 'l →' : 'r →', value: tooSlow ? mid + 1 : mid },
        ],
      },
      variables: [
        { name: 'feasible?', value: tooSlow ? 'NO' : 'YES', highlight: true },
        { name: tooSlow ? 'l →' : 'r →', value: tooSlow ? mid + 1 : mid, highlight: true },
      ],
    });

    if (tooSlow) l = mid + 1;
    else r = mid;
  }

  // l === r, found answer
  const answerHours = piles.reduce((sum, p) => sum + Math.ceil(p / l), 0);
  steps.push({
    explanation: `l === r === ${l}. Converged! Minimum eating speed k=${l}. Verification: Σ⌈pile/${l}⌉ = ${piles.map(p => `⌈${p}/${l}⌉=${Math.ceil(p / l)}`).join(' + ')} = ${answerHours} ≤ ${h} ✓. O(n log m) time where n=piles.length and m=max(piles). O(1) space.`,
    highlightLine: 27,
    state: {
      type: 'array',
      cells: piles.map(v => ({ value: v, state: 'found' as const })),
      pointers: [],
      counters: [
        { label: 'answer k', value: l },
        { label: 'hoursNeeded', value: answerHours },
        { label: 'h', value: h },
      ],
    },
    variables: [{ name: 'return k', value: l, highlight: true }],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Binary Search on Answer Space',
  pythonCode: PYTHON_CODE,
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
