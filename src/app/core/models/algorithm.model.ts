export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export type Category =
  | 'arrays-hash'
  | 'two-pointers'
  | 'sliding-window'
  | 'binary-search'
  | 'linked-list'
  | 'trees'
  | 'graphs'
  | 'stack'
  | 'greedy'
  | 'dynamic-programming';

export type CellState = 'default' | 'active' | 'visited' | 'found' | 'eliminated' | 'window' | 'min-ptr' | 'max-ptr';

export interface ArrayCell {
  value: number | string;
  state: CellState;
}

export interface Pointer {
  index: number;
  label: string;
}

export interface ArrayState {
  type: 'array';
  cells: ArrayCell[];
  pointers: Pointer[];
  arrayLabel?: string;
  hashmap?: Record<string | number, number | string>;
  hashmapLabel?: string;
  hashmap2?: Record<string | number, number | string>;
  hashmap2Label?: string;
  stackItems?: (string | number)[];
  counters?: { label: string; value: number | string }[];
}

export type GridCellState = 'water' | 'land' | 'visited' | 'queued' | 'rotten' | 'fresh' | 'empty' | 'active' | 'found';

export interface GridState {
  type: 'grid';
  grid: { state: GridCellState; label?: string }[][];
  counters?: { label: string; value: number | string }[];
  legend?: { state: GridCellState; label: string }[];
}

export interface LinkedListNode {
  id: string;
  value: number | string;
  nextId: string | null;
  state: 'default' | 'active' | 'prev' | 'curr' | 'next-node' | 'done';
}

export interface LinkedListState {
  type: 'linked-list';
  nodes: LinkedListNode[];
  pointers: { nodeId: string | null; label: string }[];
  result?: LinkedListNode[];
}

export type TreeNodeState = 'default' | 'active' | 'visited' | 'found' | 'highlighted' | 'comparing';

export interface TreeNode {
  id: string;
  value: number | string | null;
  state: TreeNodeState;
  leftId: string | null;
  rightId: string | null;
}

export interface TreeState {
  type: 'tree';
  nodes: TreeNode[];
  pointers?: { nodeId: string | null; label: string }[];
  counters?: { label: string; value: string | number }[];
}

export type GraphNodeState = 'default' | 'active' | 'visited' | 'found';
export type GraphEdgeState = 'default' | 'active' | 'visited' | 'found';

export interface GraphNode {
  id: string | number;
  x: number;
  y: number;
  state: GraphNodeState;
}

export interface GraphEdge {
  from: string | number;
  to: string | number;
  state: GraphEdgeState;
}

export interface GraphState {
  type: 'graph';
  nodes: GraphNode[];
  edges: GraphEdge[];
  directed?: boolean;
  hashmap?: Record<string | number, number | string>;
  hashmapLabel?: string;
  hashmap2?: Record<string | number, number | string>;
  hashmap2Label?: string;
  stackItems?: (string | number)[];
  stackLabel?: string;
  counters?: { label: string; value: number | string }[];
}

export type VisualizerState = ArrayState | GridState | LinkedListState | TreeState | GraphState;

export interface StepVariable {
  name: string;
  value: string | number;
  highlight?: boolean;
}

export interface Step {
  explanation: string;
  highlightLine?: number;
  state: VisualizerState;
  variables?: StepVariable[];
}

export interface ProblemExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface SolutionVariant {
  label: string;
  pythonCode: string;
  generateSteps: () => Step[];
  timeComplexity?: string;
  spaceComplexity?: string;
}

export interface AlgorithmMeta {
  id: string;
  lcNumber: number;
  title: string;
  difficulty: Difficulty;
  category: Category;
  tags: string[];
  timeComplexity: string;
  spaceComplexity: string;
  description: string;
  examples: ProblemExample[];
  constraints: string[];
  hint: string;
  solutions: SolutionVariant[];
}

export const CATEGORY_LABELS: Record<Category, string> = {
  'arrays-hash': 'Arrays & Hash',
  'two-pointers': 'Two Pointers',
  'sliding-window': 'Sliding Window',
  'binary-search': 'Binary Search',
  'linked-list': 'Linked List',
  'trees': 'Trees',
  'graphs': 'Graphs',
  'stack': 'Stack',
  'greedy': 'Greedy',
  'dynamic-programming': 'Dynamic Programming',
};

export const CATEGORY_ICONS: Record<Category, string> = {
  'arrays-hash': '▦',
  'two-pointers': '◀▶',
  'sliding-window': '▬',
  'binary-search': '⟨⟩',
  'linked-list': '⬤—⬤',
  'trees': '⧖',
  'graphs': '⬡',
  'stack': '⬒',
  'greedy': '⚡',
  'dynamic-programming': '⊞',
};
