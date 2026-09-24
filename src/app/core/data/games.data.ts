export type GameCategory = 'graph-traversal' | 'optimization';

export const GAME_CATEGORY_LABELS: Record<GameCategory, { label: string; blurb: string }> = {
  'graph-traversal': {
    label: 'Graph Traversal',
    blurb: 'BFS and DFS made playable — frontiers, flood fills, and shortest paths you can watch.',
  },
  'optimization': {
    label: 'Optimization',
    blurb: 'Make the moves yourself, then watch the optimal algorithm and see where you diverged.',
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
    id: 'bisect-it',
    title: 'Bisect It',
    description: 'A hidden threshold sits somewhere on a monotone yes/no answer space. Probe values, read feasible or not feasible, and corner the exact boundary in as few probes as binary search would take.',
    algorithmNote: 'Every round is "binary search on the answer": Koko Eating Bananas (can Koko finish at speed k?), Capacity to Ship Packages (can capacity c ship in time?), and Magnetic Force Between Two Balls (can balls sit d apart?) — same monotone-predicate halving, three different feasibility checks.',
    algorithms: ['Binary Search on the Answer', 'Monotone Predicate'],
    category: 'optimization',
    status: 'available',
    route: '/games/bisect-it',
  },
  {
    id: 'connect-cities',
    title: 'Connect the Cities',
    description: 'Cities sit scattered on a grid — connect every one at the minimum total Manhattan cost, one edge at a time. Close a cycle and it gets rejected; match the optimal spanning tree to win.',
    algorithmNote: "Prim's grows the tree outward from city 0 with a running distance array (LC 1584, Min Cost to Connect All Points); union-find is what catches a cycle the instant you'd close one (LC 684, Redundant Connection).",
    algorithms: ["Prim's", 'MST', 'Union-Find'],
    category: 'optimization',
    status: 'available',
    route: '/games/connect-cities',
  },
  {
    id: 'one-stroke',
    title: 'One-Stroke Tour',
    description: 'Trace every edge exactly once without lifting your pen — a directed or undirected Eulerian path. Pick a start node, then click along unused edges until the board is fully toured.',
    algorithmNote: 'The degree rule says where the tour may start (either odd-degree node; the node with out-degree minus in-degree = 1 when directed — LC 2097, Valid Arrangement of Pairs; anywhere on a circuit); iterative stack Hierholzer builds the tour by consuming edges until none remain (LC 332, Reconstruct Itinerary).',
    algorithms: ['Hierholzer', 'Euler Path', 'DFS'],
    category: 'optimization',
    status: 'available',
    route: '/games/one-stroke',
  },
];
