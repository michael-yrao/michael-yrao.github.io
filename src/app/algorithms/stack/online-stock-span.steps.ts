// Solution + comments sourced from cse-progress: dsa/leetcode/stack/901_online_stock_span.py
import { AlgorithmMeta, SolutionVariant, Step, ArrayCell, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `class StockSpanner:
    # [7,2,1,2,4]
    # [1,1,1,3,4]
    # we increment if prior value is smaller
    # so while stack[-1] <= current: pop
    # since we are popping out of the stack, we need to keep track at each point
    # so (value, span) for the decreasing stack
    def __init__(self):
        self.decreasingStack = []

    def next(self, price: int) -> int:
        currentSpan = 1
        while self.decreasingStack and price >= self.decreasingStack[-1][0]:
            priorValue, priorSpan = self.decreasingStack.pop()
            currentSpan += priorSpan
        self.decreasingStack.append((price, currentSpan))
        return currentSpan`;

function generateSteps(): Step[] {
  const prices = [100, 80, 60, 70, 60, 75, 85];
  const steps: Step[] = [];

  // Monotonic decreasing stack of [value, span] pairs, mirrored here as we simulate.
  const stack: { value: number; span: number }[] = [];
  const results: (number | string)[] = prices.map(() => '?');

  const renderCells = (activeIdx: number): ArrayCell[] =>
    prices.map((p, i) => ({
      value: p,
      state: i < activeIdx ? 'visited' : i === activeIdx ? 'active' : 'default',
    }));

  const renderStack = (): (string | number)[] =>
    stack.map((e) => `(${e.value}, ${e.span})`);

  steps.push({
    explanation:
      'StockSpanner.next(price) returns how many consecutive prior days (including today) had price ≤ today. We keep a monotonic decreasing stack of (price, span) pairs: each entry already absorbs the span of every smaller day it swallowed.',
    highlightLine: 1,
    state: {
      type: 'array',
      cells: renderCells(-1),
      pointers: [],
      stackItems: [],
      counters: [{ label: 'decreasingStack', value: 'empty' }],
    },
    variables: [],
  });

  for (let i = 0; i < prices.length; i++) {
    const price = prices[i];

    // Start of a next(price) call: span begins at 1 (today itself).
    let currentSpan = 1;
    steps.push({
      explanation: `next(${price}) — call #${i + 1}. currentSpan starts at 1 (today counts). Now pop every stacked day whose price ≤ ${price}, folding its span in.`,
      highlightLine: 12,
      state: {
        type: 'array',
        cells: renderCells(i),
        pointers: [{ index: i, label: 'today' }],
        stackItems: renderStack(),
        counters: [
          { label: 'price', value: price },
          { label: 'currentSpan', value: currentSpan },
          { label: 'result', value: results.map((r) => (r === '?' ? '·' : r)).join(' ') },
        ],
      },
      variables: [
        { name: 'price', value: price, highlight: true },
        { name: 'currentSpan', value: currentSpan },
      ],
    });

    // while decreasingStack and price >= top.value: pop and absorb its span
    while (stack.length > 0 && price >= stack[stack.length - 1].value) {
      const top = stack[stack.length - 1];
      currentSpan += top.span;
      stack.pop();
      steps.push({
        explanation: `Top of stack is (${top.value}, ${top.span}) and ${top.value} ≤ ${price}, so it is engulfed: pop it and add its span ${top.span} → currentSpan = ${currentSpan}.`,
        highlightLine: 14,
        state: {
          type: 'array',
          cells: renderCells(i),
          pointers: [{ index: i, label: 'today' }],
          stackItems: renderStack(),
          counters: [
            { label: 'price', value: price },
            { label: 'currentSpan', value: currentSpan },
            { label: 'popped span', value: top.span },
          ],
        },
        variables: [
          { name: 'priorValue', value: top.value },
          { name: 'priorSpan', value: top.span },
          { name: 'currentSpan', value: currentSpan, highlight: true },
        ],
      });
    }

    // append (price, currentSpan) and return currentSpan
    stack.push({ value: price, span: currentSpan });
    results[i] = currentSpan;
    const stopReason =
      stack.length === 1
        ? 'stack is now the only entry (all prior days were ≤ today)'
        : `top (${stack[stack.length - 2].value}) > ${price}, so the while loop stops`;
    steps.push({
      explanation: `Push (${price}, ${currentSpan}) — ${stopReason}. return ${currentSpan}. This is the span for day ${i + 1}.`,
      highlightLine: 16,
      state: {
        type: 'array',
        cells: prices.map((p, idx) => ({
          value: p,
          state: idx < i ? 'visited' : idx === i ? 'found' : 'default',
        })),
        pointers: [{ index: i, label: 'today' }],
        stackItems: renderStack(),
        counters: [
          { label: 'price', value: price },
          { label: 'returned span', value: currentSpan },
          { label: 'result', value: results.map((r) => (r === '?' ? '·' : r)).join(' ') },
        ],
      },
      variables: [
        { name: 'return', value: currentSpan, highlight: true },
      ],
    });
  }

  steps.push({
    explanation: `All calls done. Spans returned in order: [${results.join(', ')}]. Each next() is amortized O(1): every price is pushed once and popped at most once across all calls.`,
    highlightLine: 17,
    state: {
      type: 'array',
      cells: prices.map((p) => ({ value: p, state: 'found' as const })),
      pointers: [],
      stackItems: renderStack(),
      counters: [{ label: 'spans', value: results.join(' ') }],
    },
    variables: [],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Monotonic Decreasing Stack',
  pythonCode: PYTHON_CODE,
  generateSteps,
  timeComplexity: 'O(1) amortized per next()',
  spaceComplexity: 'O(n)',
};

export const onlineStockSpanMeta: AlgorithmMeta = {
  id: 'online-stock-span',
  lcNumber: 901,
  title: 'Online Stock Span',
  difficulty: 'Medium',
  category: 'stack',
  tags: ['Stack', 'Monotonic Stack', 'Design'],
  timeComplexity: 'O(1) amortized',
  spaceComplexity: 'O(n)',
  description:
    "Design a StockSpanner that, for each daily price, returns the stock's span: the maximum number of consecutive days (ending today, going backward) whose price was less than or equal to today's price. Implement next(price), called once per day in order.",
  examples: [
    {
      input: 'next calls: 100, 80, 60, 70, 60, 75, 85',
      output: '1, 1, 1, 2, 1, 4, 6',
      explanation: 'e.g. next(75) → 4 because the last 4 prices (60, 70, 60, 75) were all ≤ 75.',
    },
  ] as ProblemExample[],
  constraints: ['1 ≤ price ≤ 10⁵', 'At most 10⁴ calls will be made to next.'],
  hint: 'Keep a monotonic decreasing stack of (price, span) pairs. On next(price), start span at 1, then pop every entry with price ≤ today and add its span in — that entry already summarizes all the smaller days it once swallowed, so you never re-scan them.',
  solutions: [solution],
};
