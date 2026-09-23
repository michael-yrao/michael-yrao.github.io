import { AlgorithmMeta, Step, StepAnchor, TreeNode, TreeState } from '../../core/models/algorithm.model';

// Traces cse-progress's diameterOfBinaryTree_20260614 verbatim: postorder DFS with a nonlocal
// maxDiameter — same control flow as the earlier hand simulation, but this attempt names its
// locals leftSize/rightSize (not left/right), so the explanations and variables panel below
// use those names.

// Tree: [1, 2, 3, 4, 5]
const NODES: Omit<TreeNode, 'state'>[] = [
  { id: 'n0', value: 1, leftId: 'n1', rightId: 'n2' },
  { id: 'n1', value: 2, leftId: 'n3', rightId: 'n4' },
  { id: 'n2', value: 3, leftId: null, rightId: null },
  { id: 'n3', value: 4, leftId: null, rightId: null },
  { id: 'n4', value: 5, leftId: null, rightId: null },
];

function generateSteps(): Step[] {
  const steps: Step[] = [];
  const nodeMap = new Map(NODES.map((n) => [n.id, n]));
  const valueOf = (id: string) => nodeMap.get(id)!.value as number;

  const colour: Record<string, TreeNode['state']> = {};
  let stackDepth = 0;
  let maxDiameter = 0;

  const makeNodes = (): TreeNode[] =>
    NODES.map((n) => ({ ...n, state: colour[n.id] ?? 'default' }));

  const push = (
    explanation: string,
    anchor: StepAnchor,
    opts: {
      current?: string | null;
      vars?: { name: string; value: string | number; highlight?: boolean }[];
    } = {}
  ) => {
    steps.push({
      explanation,
      anchor,
      state: {
        type: 'tree',
        nodes: makeNodes(),
        pointers: opts.current ? [{ nodeId: opts.current, label: '▶ here' }] : [],
        counters: [
          { label: 'call stack depth', value: stackDepth },
          { label: 'maxDiameter', value: maxDiameter },
        ],
      } as TreeState,
      variables: opts.vars,
    });
  };

  push(
    'Diameter = longest path (counted in edges) between any two nodes. Key insight: the longest path that bends at a given node = leftSize + rightSize of that node. So we run a postorder DFS that returns each subtree’s depth, and at every node we update a shared maxDiameter with leftSize+rightSize. Start maxDiameter = 0.',
    { match: 'maxDiameter = 0' },
    { vars: [{ name: 'maxDiameter', value: 0 }] }
  );

  function dfs(id: string | null, side: string, parentId: string | null): number {
    if (id === null) {
      push(
        `${side} is null → base case "return 0". A missing subtree has depth 0.`,
        { match: 'if not node:', to: { match: 'return 0' } },
        { current: parentId, vars: [{ name: 'node', value: 'null' }, { name: 'returns', value: 0, highlight: true }] }
      );
      return 0;
    }

    stackDepth++;
    const v = valueOf(id);
    colour[id] = 'active';
    push(
      `Call dfs(node ${v}) — push on the call stack (depth now ${stackDepth}). Recurse LEFT first.`,
      { match: 'def dfs(node):' },
      { current: id, vars: [{ name: 'node', value: v }] }
    );

    const left = dfs(nodeMap.get(id)!.leftId, `Left child of ${v}`, id);

    colour[id] = 'active';
    push(
      `Back at node ${v}. leftSize = ${left}. Now recurse RIGHT.`,
      { match: 'rightSize = dfs(node.right)' },
      { current: id, vars: [{ name: 'node', value: v }, { name: 'leftSize', value: left, highlight: true }] }
    );

    const right = dfs(nodeMap.get(id)!.rightId, `Right child of ${v}`, id);

    const through = left + right;
    const prev = maxDiameter;
    maxDiameter = Math.max(maxDiameter, through);
    const depth = 1 + Math.max(left, right);
    colour[id] = 'visited';
    stackDepth--;
    push(
      `Node ${v}: leftSize=${left}, rightSize=${right}. Longest path bending at ${v} = ${left}+${right} = ${through}. maxDiameter = max(${prev}, ${through}) = ${maxDiameter}. Then return this subtree’s depth = 1 + max(${left}, ${right}) = ${depth} to the parent.`,
      { match: 'maxDiameter = max(maxDiameter, leftSize + rightSize)', to: { match: 'return 1 + max(leftSize, rightSize)' } },
      {
        current: id,
        vars: [
          { name: 'node', value: v },
          { name: 'leftSize', value: left },
          { name: 'rightSize', value: right },
          { name: 'leftSize+rightSize', value: through, highlight: maxDiameter === through && through > prev },
          { name: 'return', value: depth, highlight: true },
        ],
      }
    );
    return depth;
  }

  dfs('n0', 'root', null);

  NODES.forEach((n) => (colour[n.id] = 'found'));
  push(
    `Recursion finished. The largest leftSize+rightSize seen at any node was ${maxDiameter}, so the diameter is ${maxDiameter} (path 4 → 2 → 1 → 3).`,
    { match: 'return maxDiameter' },
    { vars: [{ name: 'maxDiameter', value: maxDiameter, highlight: true }] }
  );

  return steps;
}

export const diameterOfBinaryTreeMeta: AlgorithmMeta = {
  id: 'diameter-of-binary-tree',
  lcNumber: 543,
  title: 'Diameter of Binary Tree',
  difficulty: 'Easy',
  category: 'trees',
  tags: ['Tree', 'DFS'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(h)',
  description: 'Given the root of a binary tree, return the length of the diameter of the tree. The diameter is the length of the longest path between any two nodes — this path may or may not pass through the root.',
  examples: [
    {
      input: 'root = [1,2,3,4,5]',
      output: '3',
      explanation: 'Longest path: 4 → 2 → 1 → 3 (length 3), or 5 → 2 → 1 → 3 (length 3).',
    },
  ],
  constraints: [
    'The number of nodes in the tree is in the range [1, 10^4].',
    '-100 <= Node.val <= 100',
  ],
  hint: 'At each node, the diameter through it equals leftSize + rightSize. Use postorder DFS, track maxDiameter as a non-local variable, and return 1 + max(leftSize, rightSize) to the caller.',
  solutions: [
    {
      label: 'Postorder DFS',
      variant: 'postorder',
      generateSteps,
    },
  ],
};
