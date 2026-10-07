// Traces cse-progress's findCheapestPrice_20260815 verbatim: Bellman-Ford with a working
// copy named workingPrices, read from the locked prices[] and written to workingPrices so
// a round never chains more than one extra edge.
import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';
import { GraphStateOptions, graphState } from '../../core/steps';

const N = 4;
const FLIGHTS: [number, number, number][] = [
  [0, 1, 100],
  [1, 2, 100],
  [2, 0, 100],
  [1, 3, 600],
  [2, 3, 200],
];
const SRC = 0;
const DST = 3;
const K = 1;

const POS: Record<number, { x: number; y: number }> = {
  0: { x: 60, y: 120 },
  1: { x: 175, y: 55 },
  2: { x: 175, y: 190 },
  3: { x: 300, y: 120 },
};

const NODE_INPUTS = Array.from({ length: N }, (_, i) => ({ id: i, ...POS[i], label: `${i}` }));
const EDGE_INPUTS = FLIGHTS.map(([from, to]) => ({ from, to }));

const fmt =(v: number) => (v === Infinity ? '∞' : `${v}`);

function generateSteps(): Step[] {
  const steps: Step[] = [];

  const mkState = (active: number | null, settledPrices: number[], activeEdge: number | null, options: GraphStateOptions) =>
    graphState(NODE_INPUTS, EDGE_INPUTS, {
      nodeState: (_, i) => (i === active ? 'active' : i === SRC ? 'found' : settledPrices[i] !== Infinity ? 'visited' : 'default'),
      edgeState: (_, i) => (i === activeEdge ? 'active' : 'default'),
      directed: true,
      ...options,
    });

  const priceMap = (arr: number[]): Record<string | number, string> => {
    const m: Record<string | number, string> = {};
    arr.forEach((v, i) => (m[i] = fmt(v)));
    return m;
  };

  let prices = Array<number>(N).fill(Infinity);
  prices[SRC] = 0;

  const flightsList = FLIGHTS.map((f) => `${f[0]}→${f[1]}:$${f[2]}`).join('  ');

  steps.push({
    explanation:
      `Bellman-Ford. Flights: ${flightsList}. src=0, dst=3, k=1. prices[] starts ∞ except prices[0]=0. "At most k stops" = k+1 edges, so we run exactly k+1 = 2 relaxation rounds — each round can extend a path by one more edge.`,
    anchor: { match: 'prices = [math.inf] * n', to: { match: 'prices[src] = 0' } },
    state: mkState(null, prices, null, {
      hashmap: priceMap(prices),
      hashmapLabel: 'prices',
      counters: [{ label: 'round', value: `0 / ${K + 1}` }],
    }),
    variables: [{ name: 'prices', value: `[${prices.map(fmt).join(', ')}]` }],
  });

  for (let round = 0; round < K + 1; round++) {
    const workingPrices = [...prices];
    steps.push({
      explanation: `Round ${round + 1} of ${K + 1}: copy prices → workingPrices. We will READ from prices (locked at last round's values) and WRITE to workingPrices, so no path grows by more than one edge this round.`,
      anchor: { match: 'workingPrices = prices.copy()' },
      state: mkState(null, prices, null, {
        hashmap: priceMap(prices),
        hashmapLabel: 'prices (locked)',
        hashmap2: priceMap(workingPrices),
        hashmap2Label: 'workingPrices (writing)',
        counters: [{ label: 'round', value: `${round + 1} / ${K + 1}` }],
      }),
      variables: [],
    });

    for (let fi = 0; fi < FLIGHTS.length; fi++) {
      const [s, t, p] = FLIGHTS[fi];
      if (prices[s] === Infinity) {
        steps.push({
          explanation: `Flight ${s}→${t} ($${p}): prices[${s}] is ∞ (city ${s} unreachable so far) → skip.`,
          anchor: { match: 'if prices[source] == math.inf:' },
          state: mkState(s, prices, fi, {
            hashmap: priceMap(prices),
            hashmapLabel: 'prices (locked)',
            hashmap2: priceMap(workingPrices),
            hashmap2Label: 'workingPrices (writing)',
            counters: [{ label: 'round', value: `${round + 1} / ${K + 1}` }, { label: 'flight', value: `${s}→${t}` }],
          }),
          variables: [{ name: `prices[${s}]`, value: '∞' }, { name: 'action', value: 'skip' }],
        });
        continue;
      }
      const candidate = prices[s] + p;
      const prevVal = workingPrices[t];
      const improved = candidate < prevVal;
      if (improved) workingPrices[t] = candidate;
      steps.push({
        explanation: improved
          ? `Flight ${s}→${t} ($${p}): prices[${s}] + ${p} = ${candidate} < workingPrices[${t}] (${fmt(prevVal)}) → relax it → workingPrices[${t}] = ${candidate}.`
          : `Flight ${s}→${t} ($${p}): prices[${s}] + ${p} = ${candidate} is not better than workingPrices[${t}] (${fmt(prevVal)}) → leave it.`,
        anchor: { match: 'if prices[source] + price < workingPrices[destination]:', to: { match: 'workingPrices[destination] = prices[source] + price' } },
        state: mkState(t, prices, fi, {
          hashmap: priceMap(prices),
          hashmapLabel: 'prices (locked)',
          hashmap2: priceMap(workingPrices),
          hashmap2Label: 'workingPrices (writing)',
          counters: [
            { label: 'round', value: `${round + 1} / ${K + 1}` },
            { label: 'flight', value: `${s}→${t}` },
            { label: 'candidate', value: candidate },
          ],
        }),
        variables: [
          { name: `prices[${s}]+${p}`, value: candidate, highlight: improved },
          { name: `workingPrices[${t}]`, value: fmt(workingPrices[t]) },
        ],
      });
    }

    prices = workingPrices;
    steps.push({
      explanation: `End of round ${round + 1}: commit prices = workingPrices → [${prices.map(fmt).join(', ')}]. These paths use at most ${round + 1} edge(s).`,
      anchor: { match: 'prices = workingPrices' },
      state: mkState(null, prices, null, {
        hashmap: priceMap(prices),
        hashmapLabel: 'prices',
        counters: [{ label: 'round done', value: round + 1 }],
      }),
      variables: [{ name: 'prices', value: `[${prices.map(fmt).join(', ')}]`, highlight: true }],
    });
  }

  const answer = prices[DST] === Infinity ? -1 : prices[DST];
  steps.push({
    explanation:
      answer === -1
        ? `prices[${DST}] is ∞ → no route within ${K} stop(s). Return -1.`
        : `prices[dst=${DST}] = ${answer}. Return ${answer}. Note the cheaper 0→1→2→3 = $400 route is rejected — it needs 2 stops (3 edges), exceeding k=1.`,
    anchor: answer === -1 ? { match: 'return -1' } : { match: 'return prices[dst]' },
    state: mkState(DST, prices, null, {
      hashmap: priceMap(prices),
      hashmapLabel: 'prices',
      counters: [{ label: 'answer', value: answer }],
    }),
    variables: [{ name: 'return', value: answer, highlight: true }],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Bellman-Ford (k+1 rounds)',
  variant: 'bellman-ford',
  generateSteps,
  timeComplexity: 'O(k · E)',
  spaceComplexity: 'O(n)',
};

export const cheapestFlightsWithinKStopsMeta: AlgorithmMeta = {
  id: 'cheapest-flights-within-k-stops',
  lcNumber: 787,
  title: 'Cheapest Flights Within K Stops',
  difficulty: 'Medium',
  category: 'graphs',
  tags: ['Graph', 'Dynamic Programming', 'Shortest Path', 'Bellman-Ford'],
  description:
    'n cities are connected by directed weighted flights. Given src, dst, and k, return the cheapest price from src to dst using at most k stops, or -1 if unreachable.',
  examples: [
    {
      input: 'n=4, flights=[[0,1,100],[1,2,100],[2,0,100],[1,3,600],[2,3,200]], src=0, dst=3, k=1',
      output: '700',
      explanation: '0→1→3 costs 700 (1 stop). 0→1→2→3 is cheaper at 400 but uses 2 stops.',
    },
  ] as ProblemExample[],
  constraints: ['1 ≤ n ≤ 100', 'flights[i] = [from, to, price]', '0 ≤ src, dst, k < n', 'src ≠ dst'],
  hint: '"At most k stops" means at most k+1 edges. Run k+1 Bellman-Ford rounds; in each round read distances from the previous round (a locked copy) and write into this round\'s copy, so a single round never chains more than one extra edge.',
  solutions: [solution],
};
