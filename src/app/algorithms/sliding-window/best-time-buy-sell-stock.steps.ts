import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `from typing import List

class Solution:
    def maxProfit(self, prices: List[int]) -> int:
        # l = buy day, r = sell day; profit = prices[r] - prices[l]
        # if prices[r] < prices[l], buying at r is strictly better — move l there
        # this keeps l at the lowest price seen so far without needing a separate min variable
        currentMaxProfit = 0

        l, r = 0, 1

        while r < len(prices):
            currentMaxProfit = max(currentMaxProfit, prices[r] - prices[l])

            if prices[r] < prices[l]:
                l = r
            r += 1

        return currentMaxProfit`;

function generateSteps(): Step[] {
  const prices = [7, 1, 5, 3, 6, 4];
  const steps: Step[] = [];

  let l = 0;
  let r = 1;
  let maxProfit = 0;

  const makeState = (l: number, r: number, maxProfit: number) => ({
    type: 'array' as const,
    cells: prices.map((v, i) => ({
      value: v,
      state:
        i === l
          ? ('active' as const)
          : i === r
          ? ('window' as const)
          : ('default' as const),
    })),
    pointers: [
      { index: l, label: 'L (buy)' },
      { index: r, label: 'R (sell)' },
    ],
    counters: [{ label: 'max profit', value: maxProfit }],
  });

  steps.push({
    explanation:
      'L points to our buy day, R to our sell day. We slide R rightward. The key insight: if we see a price lower than L, it\'s always better to buy there instead — so we move L to R.',
    highlightLine: 12,
    state: makeState(l, r, maxProfit),
    variables: [
      { name: 'l', value: l },
      { name: 'r', value: r },
      { name: 'currentMaxProfit', value: maxProfit },
    ],
  });

  while (r < prices.length) {
    const profit = prices[r] - prices[l];
    const newMax = Math.max(maxProfit, profit);

    if (profit > maxProfit) {
      steps.push({
        explanation: `prices[R]=${prices[r]} − prices[L]=${prices[l]} = ${profit}. New best profit! We update maxProfit to ${profit}.`,
        highlightLine: 16,
        state: makeState(l, r, newMax),
        variables: [
          { name: 'l', value: l },
          { name: 'r', value: r },
          { name: 'prices[l]', value: prices[l] },
          { name: 'prices[r]', value: prices[r] },
          { name: 'prices[r]-prices[l]', value: profit, highlight: true },
          { name: 'currentMaxProfit', value: newMax, highlight: true },
        ],
      });
    } else {
      steps.push({
        explanation: `prices[R]=${prices[r]} − prices[L]=${prices[l]} = ${profit}. Not better than current max ${maxProfit}. Keep going.`,
        highlightLine: 16,
        state: makeState(l, r, newMax),
        variables: [
          { name: 'l', value: l },
          { name: 'r', value: r },
          { name: 'prices[l]', value: prices[l] },
          { name: 'prices[r]', value: prices[r] },
          { name: 'prices[r]-prices[l]', value: profit },
          { name: 'maxProfit', value: newMax },
        ],
      });
    }

    maxProfit = newMax;

    if (prices[r] < prices[l]) {
      steps.push({
        explanation: `prices[R]=${prices[r]} < prices[L]=${prices[l]}. This is a lower buy price. Move L here — buying later at a lower price can only improve future profit. R keeps advancing.`,
        highlightLine: 16,
        state: {
          type: 'array',
          cells: prices.map((v, i) => ({
            value: v,
            state:
              i === r
                ? ('active' as const)
                : i === l
                ? ('eliminated' as const)
                : ('default' as const),
          })),
          pointers: [
            { index: r, label: 'L→here' },
            { index: r, label: 'R' },
          ],
          counters: [{ label: 'max profit', value: maxProfit }],
        },
        variables: [
          { name: 'l', value: r, highlight: true },
          { name: 'r', value: r },
          { name: 'prices[l]', value: prices[r], highlight: true },
          { name: 'currentMaxProfit', value: maxProfit },
        ],
      });
      l = r;
    }
    r++;
  }

  steps.push({
    explanation: `R has passed the end. The best profit we found was ${maxProfit} (buy low, sell high).`,
    highlightLine: 19,
    state: makeState(l, prices.length - 1, maxProfit),
    variables: [
      { name: 'maxProfit', value: maxProfit, highlight: true },
    ],
  });

  return steps;
}

const slidingWindowSolution: SolutionVariant = {
  label: 'Sliding Window',
  pythonCode: PYTHON_CODE,
  generateSteps,
};

export const bestTimeBuySellMeta: AlgorithmMeta = {
  id: 'best-time-to-buy-and-sell-stock',
  lcNumber: 121,
  title: 'Best Time to Buy and Sell Stock',
  difficulty: 'Easy',
  category: 'sliding-window',
  tags: ['Sliding Window', 'Array', 'Greedy'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(1)',
  description:
    'You are given an array prices where prices[i] is the price of a stock on day i. Choose a single day to buy and a later day to sell to maximize profit. Return the maximum profit, or 0 if no profit is possible.',
  examples: [
    {
      input: 'prices = [7, 1, 5, 3, 6, 4]',
      output: '5',
      explanation: 'Buy on day 2 (price = 1), sell on day 5 (price = 6). Profit = 6 − 1 = 5.',
    },
    {
      input: 'prices = [7, 6, 4, 3, 1]',
      output: '0',
      explanation: 'Prices only decrease — no profitable transaction is possible.',
    },
  ] as ProblemExample[],
  constraints: ['1 ≤ prices.length ≤ 10⁵', '0 ≤ prices[i] ≤ 10⁴'],
  hint: 'You want to buy low and sell high. As you scan left to right, you always want L to be the lowest price seen so far. What condition should make you move L?',
  solutions: [slidingWindowSolution],
};
