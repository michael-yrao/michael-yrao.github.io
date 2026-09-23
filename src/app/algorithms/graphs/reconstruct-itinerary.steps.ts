// Walkthrough pending — grounded code only. Variant 'hierholzer-stack' joins cse-progress 332:hierholzer-stack
// (symbol findItinerary_stack_20260915); the site renders that attempt verbatim from dashboard/showcase.json.

import { AlgorithmMeta, SolutionVariant, ProblemExample } from '../../core/models/algorithm.model';

const solution: SolutionVariant = {
  label: 'Hierholzer (Iterative Stack)',
  variant: 'hierholzer-stack',
  generateSteps: () => [],
  timeComplexity: 'O(E log E)',
  spaceComplexity: 'O(E)',
};

export const reconstructItineraryMeta: AlgorithmMeta = {
  id: 'reconstruct-itinerary',
  lcNumber: 332,
  title: 'Reconstruct Itinerary',
  difficulty: 'Hard',
  category: 'graphs',
  tags: ['Graph', 'Eulerian Path', 'DFS'],
  timeComplexity: 'O(E log E)',
  spaceComplexity: 'O(E)',
  description:
    'Given tickets[i] = [from, to] representing flights, reconstruct the itinerary that uses every ticket exactly once, starting from "JFK", returning the lexicographically smallest valid itinerary.',
  examples: [
    {
      input: 'tickets = [["MUC","LHR"],["JFK","MUC"],["SFO","SJC"],["LHR","SFO"]]',
      output: '["JFK","MUC","LHR","SFO","SJC"]',
    },
  ] as ProblemExample[],
  constraints: ['1 ≤ tickets.length ≤ 300', 'Airport codes are 3 uppercase letters.'],
  hint: "Visiting every ticket (edge) exactly once from a fixed start, with no guarantee of returning to it, is the Eulerian path shape — walk it with Hierholzer's algorithm.",
  solutions: [solution],
};
