import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `class Solution:
    def maxProfit(self, prices: List[int]) -> int:
        # greedy: collect every upward move
        # if prices[i] > prices[i-1], that is a profitable day
        # add prices[i] - prices[i-1] to profit
        profit = 0
        for i in range(1, len(prices)):
            if prices[i] > prices[i-1]:
                profit += prices[i] - prices[i-1]
        return profit`;

function generateSteps(): Step[] {
  const prices = [7, 1, 5, 3, 6, 4];
  const steps: Step[] = [];
  let profit = 0;

  steps.push({
    explanation:
      `Best Time to Buy and Sell Stock II: prices=[${prices.join(',')}]. Greedy approach: every time prices[i] > prices[i-1], add that gain to profit (equivalent to buying at every local min, selling at every local max). Sum all positive day-over-day differences.`,
    highlightLine: 5,
    state: {
      type: 'array',
      cells: prices.map(v => ({ value: v, state: 'default' as const })),
      pointers: [],
      counters: [
        { label: 'profit', value: 0 },
        { label: 'i', value: 1 },
      ],
    },
    variables: [
      { name: 'prices', value: `[${prices.join(',')}]` },
      { name: 'profit', value: 0 },
    ],
  });

  for (let i = 1; i < prices.length; i++) {
    const gain = prices[i] - prices[i - 1];
    const isProfitable = gain > 0;

    steps.push({
      explanation: `i=${i}: prices[${i}]=${prices[i]}, prices[${i - 1}]=${prices[i - 1]}. Gain = ${prices[i]} - ${prices[i - 1]} = ${gain}. ${isProfitable ? `Profitable! Add ${gain} → profit = ${profit} + ${gain} = ${profit + gain}.` : `Not profitable (gain ≤ 0), skip.`}`,
      highlightLine: isProfitable ? 8 : 7,
      state: {
        type: 'array',
        cells: prices.map((v, idx) => ({
          value: v,
          state:
            idx === i
              ? (isProfitable ? ('found' as const) : ('eliminated' as const))
              : idx === i - 1
              ? ('active' as const)
              : idx < i - 1
              ? ('visited' as const)
              : ('default' as const),
        })),
        pointers: [{ index: i, label: `i=${i}` }],
        counters: [
          { label: 'i', value: i },
          { label: 'gain', value: gain },
          { label: 'profit', value: isProfitable ? profit + gain : profit },
        ],
      },
      variables: [
        { name: 'i', value: i },
        { name: `prices[${i}]-prices[${i - 1}]`, value: gain, highlight: true },
        { name: 'profit', value: isProfitable ? profit + gain : profit, highlight: isProfitable },
      ],
    });

    if (isProfitable) {
      profit += gain;
    }
  }

  steps.push({
    explanation: `All days processed. Total profit = ${profit}. Profitable days (green) contributed gains; unprofitable days (red) were skipped. Return ${profit}.`,
    highlightLine: 9,
    state: {
      type: 'array',
      cells: prices.map((v, idx) => ({
        value: v,
        state:
          idx === 0
            ? ('visited' as const)
            : prices[idx] - prices[idx - 1] > 0
            ? ('found' as const)
            : ('eliminated' as const),
      })),
      pointers: [],
      counters: [{ label: 'return profit', value: profit }],
    },
    variables: [{ name: 'return profit', value: profit, highlight: true }],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Greedy (Collect Every Upward Move)',
  pythonCode: PYTHON_CODE,
  generateSteps,
};

export const bestTimeBuySellStockIiMeta: AlgorithmMeta = {
  id: 'best-time-buy-sell-stock-ii',
  lcNumber: 122,
  title: 'Best Time to Buy and Sell Stock II',
  difficulty: 'Medium',
  category: 'arrays-hash',
  tags: ['Array', 'Greedy'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(1)',
  description:
    'Given an integer array prices where prices[i] is the price of a stock on day i, find the maximum profit you can achieve. You may buy and sell the stock multiple times (but must sell before buying again).',
  examples: [
    {
      input: 'prices = [7,1,5,3,6,4]',
      output: '7',
      explanation: 'Buy on day 2 (price=1), sell day 3 (price=5), profit=4. Buy day 4 (price=3), sell day 5 (price=6), profit=3. Total=7.',
    },
    {
      input: 'prices = [1,2,3,4,5]',
      output: '4',
      explanation: 'Buy day 1 (price=1), sell day 5 (price=5), profit=4.',
    },
    {
      input: 'prices = [7,6,4,3,1]',
      output: '0',
      explanation: 'Prices are always decreasing; no profitable transaction is possible.',
    },
  ] as ProblemExample[],
  constraints: [
    '1 ≤ prices.length ≤ 3 × 10⁴',
    '0 ≤ prices[i] ≤ 10⁴',
  ],
  hint: 'Greedy: for each day i from 1 to n-1, if prices[i] > prices[i-1], add the difference to profit. This is equivalent to buying at every valley and selling at every peak, capturing every upward move.',
  solutions: [solution],
};
