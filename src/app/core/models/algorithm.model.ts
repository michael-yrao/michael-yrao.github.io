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
  hashmap?: Record<string | number, number | string>;
  stackItems?: (string | number)[];
  counters?: { label: string; value: number | string }[];
}

export type GridCellState = 'water' | 'land' | 'visited' | 'queued' | 'rotten' | 'fresh' | 'empty' | 'active';

export interface GridState {
  type: 'grid';
  grid: { state: GridCellState; label?: string }[][];
  counters?: { label: string; value: number | string }[];
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

export type VisualizerState = ArrayState | GridState | LinkedListState | TreeState;

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
