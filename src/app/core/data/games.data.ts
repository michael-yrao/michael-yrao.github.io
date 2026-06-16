export type GameCategory = 'recognition' | 'graph-traversal' | 'complexity';

export const GAME_CATEGORY_LABELS: Record<GameCategory, { label: string; blurb: string }> = {
  'recognition': {
    label: 'Pattern Recognition',
    blurb: 'Train the skill that comes before code: reading a problem and knowing which technique it calls for.',
  },
  'graph-traversal': {
    label: 'Graph Traversal',
    blurb: 'BFS and DFS made playable — frontiers, flood fills, and shortest paths you can watch.',
  },
  'complexity': {
    label: 'Complexity Analysis',
    blurb: 'Read real code, name the time and space complexity, and learn why each loop or structure costs what it does.',
  },
};

export interface GameMeta {
  id: string;
  title: string;
  description: string;
  algorithmNote: string;
  algorithms: string[];
  category: GameCategory;
  status: 'available' | 'coming-soon';
  route: string;
}

export const GAMES: GameMeta[] = [
  {
    id: 'pattern-sense',
    title: 'Pattern Sense',
    description: 'Read a real problem with the title hidden — name the technique it calls for. Build the recognition reflex that is half of every interview.',
    algorithmNote: 'Every problem on this site becomes a quiz round: spot the cues (sorted input? contiguous run? hierarchy?) and pick the right tool.',
    algorithms: ['Recognition', 'All techniques'],
    category: 'recognition',
    status: 'available',
    route: '/games/pattern-sense',
  },
  {
    id: 'flood-fill',
    title: 'Flood Fill',
    description: 'Pick a color to flood the board outward from the top-left corner. Conquer the whole grid in 22 moves or fewer.',
    algorithmNote: 'BFS expands the conquered region one level at a time — each wave ripple you see is one BFS frontier round.',
    algorithms: ['BFS', 'Flood Fill', 'Number of Islands'],
    category: 'graph-traversal',
    status: 'available',
    route: '/games/flood-fill',
  },
  {
    id: 'maze',
    title: 'Maze Generator & Solver',
    description: 'A maze carved by randomized DFS, then raced by two solvers — BFS finds the shortest path, DFS finds a path. Watch how differently they explore.',
    algorithmNote: 'Generation is DFS + backtracking; solving shows why "fewest steps" always means BFS in an unweighted graph.',
    algorithms: ['DFS', 'BFS', 'Backtracking'],
    category: 'graph-traversal',
    status: 'available',
    route: '/games/maze',
  },
  {
    id: 'big-o',
    title: 'Big-O Trainer',
    description: 'Read a real code snippet from this site and name both the time and space complexity. The harder questions target common gotchas — recursion stack space, input-vs-output counting, and why O(n log m) is not O(n log n).',
    algorithmNote: '25 questions drawn from problems across all 10 patterns. Each answer includes a line-by-line explanation of the reasoning.',
    algorithms: ['All complexities', 'Time & Space'],
    category: 'complexity',
    status: 'available',
    route: '/games/big-o',
  },
];
