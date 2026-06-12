import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `class Solution:
    def shipWithinDays(self, weights: List[int], days: int) -> int:
        # ordering matters, so can't sort
        # seems like what we are doing is getting the min boundary for each day
        # so sum(weights)/days is at minimum the capacity we need if we can split up the weights, which we cannot
        # then sum(weights) is a guarantee that we can ship all in one day
        # so what we can do is binary search min boundary with those two
        # so above thought for minimum capacity is wrong, since we will never be able to ship some packages
        # e.g. [1,1,1,1,10], days = 5
        # sum(weights)//days = 2, which means we will never be able to ship out the 10
        # the minimum boundary of sum(weights)//days is unfortunately just logically impossible
        # thus we don't start with it

        def canShip(dailyCapacity):
            daysNeeded = 1
            currentLoad = 0

            for weight in weights:
                if currentLoad + weight > dailyCapacity:
                    daysNeeded+=1
                    currentLoad=0
                currentLoad+=weight
            return daysNeeded <= days

        l = max(weights)
        r = sum(weights)

        while l < r:
            mid = (l + r) // 2
            # criteria is that we are able to ship
            # so let's find the smallest possible to ship
            if canShip(mid):
                r=mid
            else:
                l=mid+1
        return l`;

function canShipSim(weights: number[], dailyCapacity: number, days: number): { daysNeeded: number; shipDays: number[] } {
  let daysNeeded = 1;
  let currentLoad = 0;
  const shipDays: number[] = new Array(weights.length).fill(0);
  let dayIdx = 0;

  for (let i = 0; i < weights.length; i++) {
    if (currentLoad + weights[i] > dailyCapacity) {
      daysNeeded++;
      currentLoad = 0;
      dayIdx++;
    }
    currentLoad += weights[i];
    shipDays[i] = dayIdx + 1;
  }
  return { daysNeeded, shipDays };
}

function generateSteps(): Step[] {
  const weights = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const days = 5;
  const steps: Step[] = [];

  const maxW = Math.max(...weights);
  const sumW = weights.reduce((a, b) => a + b, 0);

  steps.push({
    explanation:
      `Capacity to Ship Packages: weights=[${weights.join(',')}], days=${days}. Binary search on capacity in [max(weights)..sum(weights)] = [${maxW}..${sumW}]. max(weights)=${maxW} is the minimum possible (must fit the heaviest package). sum(weights)=${sumW} ships everything in 1 day. For each mid capacity, simulate greedy packing and count days needed.`,
    highlightLine: 25,
    state: {
      type: 'array',
      cells: weights.map(v => ({ value: v, state: 'default' as const })),
      pointers: [],
      counters: [
        { label: 'l (min cap)', value: maxW },
        { label: 'r (max cap)', value: sumW },
        { label: 'target days', value: days },
      ],
    },
    variables: [
      { name: 'weights', value: `[${weights.join(',')}]` },
      { name: 'l', value: maxW },
      { name: 'r', value: sumW },
      { name: 'days', value: days },
    ],
  });

  let l = maxW;
  let r = sumW;

  steps.push({
    explanation: `Initialize l=${l}=max(weights), r=${r}=sum(weights). Use l < r to converge on the minimum feasible capacity. Note: we can't use sum/days as the lower bound because individual packages can't be split.`,
    highlightLine: 25,
    state: {
      type: 'array',
      cells: weights.map(v => ({ value: v, state: 'default' as const })),
      pointers: [],
      counters: [
        { label: 'l', value: l },
        { label: 'r', value: r },
        { label: 'target days', value: days },
      ],
    },
    variables: [{ name: 'l', value: l }, { name: 'r', value: r }],
  });

  while (l < r) {
    const mid = Math.floor((l + r) / 2);
    const { daysNeeded, shipDays } = canShipSim(weights, mid, days);
    const feasible = daysNeeded <= days;

    // Show simulation of packing for this capacity
    steps.push({
      explanation: `l=${l}, r=${r}, mid=${mid} (capacity=${mid}). Simulate greedy packing: greedily load packages until adding the next would exceed ${mid}. Days needed = ${daysNeeded}. ${feasible ? `${daysNeeded} ≤ ${days} → feasible, try smaller: r = ${mid}.` : `${daysNeeded} > ${days} → too small, try larger: l = ${mid + 1}.`}`,
      highlightLine: feasible ? 31 : 33,
      state: {
        type: 'array',
        cells: weights.map((v, idx) => ({
          value: v,
          state: feasible ? ('window' as const) : ('eliminated' as const),
        })),
        pointers: [],
        counters: [
          { label: 'mid (capacity)', value: mid },
          { label: 'days_needed', value: daysNeeded },
          { label: 'target_days', value: days },
          { label: 'l', value: l },
          { label: 'r', value: r },
          { label: feasible ? 'r →' : 'l →', value: feasible ? mid : mid + 1 },
        ],
      },
      variables: [
        { name: 'mid', value: mid },
        { name: 'days_needed', value: daysNeeded },
        { name: 'feasible?', value: feasible ? 'YES → r=mid' : 'NO → l=mid+1', highlight: true },
      ],
    });

    // Show which packages go on which day
    steps.push({
      explanation: `Packing detail at capacity=${mid}: packages coloured by ship day. Day 1 (window) → Day ${daysNeeded}. Package sizes: ${weights.map((w, i) => `[${i}]:${w}→day${shipDays[i]}`).join(', ')}.`,
      highlightLine: feasible ? 31 : 33,
      state: {
        type: 'array',
        cells: weights.map((v, idx) => ({
          value: v,
          state:
            shipDays[idx] % 2 === 1
              ? ('window' as const)
              : ('visited' as const),
        })),
        pointers: [],
        counters: [
          { label: 'capacity', value: mid },
          { label: 'days_needed', value: daysNeeded },
          { label: 'target_days', value: days },
          { label: 'feasible?', value: feasible ? 'YES' : 'NO' },
        ],
      },
      variables: [
        { name: 'ship day dist', value: `[${shipDays.join(',')}]` },
        { name: 'days_needed', value: daysNeeded },
      ],
    });

    if (feasible) r = mid;
    else l = mid + 1;
  }

  const { daysNeeded: finalDays } = canShipSim(weights, l, days);

  steps.push({
    explanation: `l === r === ${l}. Converged! Minimum ship capacity = ${l}. Verification: at capacity=${l}, need ${finalDays} days ≤ ${days} ✓. O(n log m) time where n=weights.length and m=sum(weights)-max(weights). O(1) space.`,
    highlightLine: 34,
    state: {
      type: 'array',
      cells: weights.map(v => ({ value: v, state: 'found' as const })),
      pointers: [],
      counters: [
        { label: 'answer capacity', value: l },
        { label: 'days_needed', value: finalDays },
        { label: 'target_days', value: days },
      ],
    },
    variables: [{ name: 'return capacity', value: l, highlight: true }],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Binary Search on Capacity',
  pythonCode: PYTHON_CODE,
  generateSteps,
};

export const capacityToShipPackagesMeta: AlgorithmMeta = {
  id: 'capacity-to-ship-packages',
  lcNumber: 1011,
  title: 'Capacity To Ship Packages Within D Days',
  difficulty: 'Medium',
  category: 'binary-search',
  tags: ['Array', 'Binary Search'],
  timeComplexity: 'O(n log m)',
  spaceComplexity: 'O(1)',
  description:
    'A conveyor belt has packages to ship within days days. The i-th package weighs weights[i]. Each day load packages in order without exceeding the ship capacity. Return the least weight capacity to ship all packages within days days.',
  examples: [
    {
      input: 'weights = [1,2,3,4,5,6,7,8,9,10], days = 5',
      output: '15',
      explanation: 'Capacity 15: day1=[1,2,3,4,5], day2=[6,7], day3=[8], day4=[9], day5=[10].',
    },
    {
      input: 'weights = [3,2,2,4,1,4], days = 3',
      output: '6',
    },
    {
      input: 'weights = [1,2,3,1,1], days = 4',
      output: '3',
    },
  ] as ProblemExample[],
  constraints: [
    '1 ≤ days ≤ weights.length ≤ 5 × 10⁴',
    '1 ≤ weights[i] ≤ 500',
  ],
  hint: 'Binary search on the capacity in [max(weights)..sum(weights)]. For each candidate capacity mid, greedily simulate: accumulate weights into the current day; when adding the next package exceeds mid, start a new day. If days_needed ≤ days the capacity is feasible (try smaller, r=mid); otherwise too small (l=mid+1).',
  solutions: [solution],
};
