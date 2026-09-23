import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

// ── Step generator ────────────────────────────────────────────────────────────
//
// Traces cse-progress's shipWithinDays_20260612 verbatim: left = max(weights), right =
// sum(weights); canShip(capacity) tracks currentDayCapacity as REMAINING room on the current
// day (starts at capacity, decrements as weights load) — not an accumulated-load counter. When
// currentDayCapacity < weight, a new day starts: numberOfDaysUsed+=1, currentDayCapacity resets
// to capacity, THEN the weight loads. Outer loop: left, right, middle (not l/r/mid).

/** One capacity's greedy-packing simulation, following canShip's own remaining-capacity
 *  tracking rather than an accumulated-load counter. */
function canShipSim(weights: number[], capacity: number, days: number): { numberOfDaysUsed: number; shipDays: number[] } {
  let numberOfDaysUsed = 1;
  let currentDayCapacity = capacity;
  const shipDays: number[] = new Array(weights.length).fill(0);

  for (let i = 0; i < weights.length; i++) {
    const weight = weights[i];
    if (currentDayCapacity >= weight) {
      currentDayCapacity -= weight;
    } else {
      numberOfDaysUsed += 1;
      currentDayCapacity = capacity;
      currentDayCapacity -= weight;
    }
    shipDays[i] = numberOfDaysUsed;
  }
  return { numberOfDaysUsed, shipDays };
}

function generateSteps(): Step[] {
  const weights = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const days = 5;
  const steps: Step[] = [];

  const maxW = Math.max(...weights);
  const sumW = weights.reduce((a, b) => a + b, 0);

  steps.push({
    explanation: `Capacity to Ship Packages: weights=[${weights.join(',')}], days=${days}. left = max(weights) = ${maxW}, right = sum(weights) = ${sumW}. Binary search on capacity — the minimum possible is max(weights) (must fit the heaviest package alone); the maximum useful is sum(weights) (ships everything in 1 day).`,
    anchor: { match: 'left = max(weights)', to: { match: 'right = sum(weights)' } },
    state: {
      type: 'array',
      cells: weights.map((v) => ({ value: v, state: 'default' as const })),
      pointers: [],
      counters: [
        { label: 'left', value: maxW },
        { label: 'right', value: sumW },
        { label: 'days', value: days },
      ],
    },
    variables: [
      { name: 'weights', value: `[${weights.join(',')}]` },
      { name: 'left', value: maxW },
      { name: 'right', value: sumW },
      { name: 'days', value: days },
    ],
  });

  steps.push({
    explanation:
      'def canShip(capacity): numberOfDaysUsed=1, currentDayCapacity=capacity. For each weight, if currentDayCapacity >= weight it loads onto today (currentDayCapacity -= weight); otherwise a new day starts (numberOfDaysUsed+=1, currentDayCapacity resets to capacity, THEN loads this weight). Returns numberOfDaysUsed <= days.',
    anchor: { match: 'def canShip(capacity):', to: { match: 'return numberOfDaysUsed <= days' } },
    state: {
      type: 'array',
      cells: weights.map((v) => ({ value: v, state: 'default' as const })),
      pointers: [],
    },
    variables: [{ name: 'days', value: days }],
  });

  let left = maxW;
  let right = sumW;

  while (left < right) {
    const middle = Math.floor((left + right) / 2);
    const { numberOfDaysUsed, shipDays } = canShipSim(weights, middle, days);
    const feasible = numberOfDaysUsed <= days;

    steps.push({
      explanation: `while left < right (${left}<${right}): middle = (left+right)//2 = ${middle}. canShip(${middle}): numberOfDaysUsed=${numberOfDaysUsed}.`,
      anchor: { match: 'while left < right:', to: { match: 'middle = (left+right)//2' } },
      state: {
        type: 'array',
        cells: weights.map((v) => ({ value: v, state: 'default' as const })),
        pointers: [],
        counters: [
          { label: 'left', value: left },
          { label: 'right', value: right },
          { label: 'middle', value: middle },
        ],
      },
      variables: [
        { name: 'left', value: left },
        { name: 'right', value: right },
        { name: 'middle', value: middle, highlight: true },
      ],
    });

    if (feasible) {
      steps.push({
        explanation: `canShip(${middle}) → numberOfDaysUsed=${numberOfDaysUsed} <= days=${days} → True → right = middle = ${middle}. Ship day assignment: ${weights.map((w, i) => `[${i}]:${w}→day${shipDays[i]}`).join(', ')}.`,
        anchor: { match: 'if canShip(middle):', to: { match: 'right = middle' } },
        state: {
          type: 'array',
          cells: weights.map((v, idx) => ({ value: v, state: (shipDays[idx] % 2 === 1 ? 'window' : 'visited') as 'window' | 'visited' })),
          pointers: [],
          counters: [
            { label: 'numberOfDaysUsed', value: numberOfDaysUsed },
            { label: 'days', value: days },
            { label: 'right →', value: middle },
          ],
        },
        variables: [
          { name: 'numberOfDaysUsed', value: numberOfDaysUsed, highlight: true },
          { name: 'right', value: middle, highlight: true },
        ],
      });
      right = middle;
    } else {
      steps.push({
        explanation: `canShip(${middle}) → numberOfDaysUsed=${numberOfDaysUsed} > days=${days} → False → else: left = middle+1 = ${middle + 1}.`,
        // nth 2: hit 1 is canShip()'s own 'else:' (the day-rollover branch); this is the outer
        // while loop's else.
        anchor: { match: 'else:', nth: 2, to: { match: 'left = middle + 1' } },
        state: {
          type: 'array',
          cells: weights.map((v) => ({ value: v, state: 'eliminated' as const })),
          pointers: [],
          counters: [
            { label: 'numberOfDaysUsed', value: numberOfDaysUsed },
            { label: 'days', value: days },
            { label: 'left →', value: middle + 1 },
          ],
        },
        variables: [
          { name: 'numberOfDaysUsed', value: numberOfDaysUsed, highlight: true },
          { name: 'left', value: middle + 1, highlight: true },
        ],
      });
      left = middle + 1;
    }
  }

  const { numberOfDaysUsed: finalDays } = canShipSim(weights, left, days);

  steps.push({
    explanation: `left === right === ${left}. Converged! return left = ${left}. Verification: canShip(${left}) needs ${finalDays} days ≤ ${days} ✓. O(n log m) time where n=weights.length and m=sum(weights)-max(weights). O(1) space.`,
    anchor: { match: 'return left' },
    state: {
      type: 'array',
      cells: weights.map((v) => ({ value: v, state: 'found' as const })),
      pointers: [],
      counters: [
        { label: 'answer capacity', value: left },
        { label: 'numberOfDaysUsed', value: finalDays },
        { label: 'days', value: days },
      ],
    },
    variables: [{ name: 'return', value: left, highlight: true }],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Binary Search on Capacity',
  variant: 'capacity-search',
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
  hint: 'Binary search on the capacity in [max(weights)..sum(weights)]. For each candidate capacity middle, simulate canShip: track currentDayCapacity as room remaining on the current day, decrementing per weight; when it can\'t fit the next weight, start a new day. If numberOfDaysUsed ≤ days the capacity is feasible (try smaller, right=middle); otherwise too small (left=middle+1).',
  solutions: [solution],
};
