import { AlgorithmMeta, Step, TreeNode, TreeState } from '../../core/models/algorithm.model';

const PYTHON_CODE = `class TreeNode:
    def __init__(self, x):
        self.val = x
        self.left = None
        self.right = None

class Solution:
    def lowestCommonAncestor(self, root: 'TreeNode', p: 'TreeNode', q: 'TreeNode') -> 'TreeNode':
        # While we can generate the BST with inorder DFS
        # it isn't the right way to find the answer
        # this is preorder DFS since the direction we go depends on the currentNode.val
        # since we are making a decision based on currentNode to go left or right, this is preorder
        currentNode = root

        while currentNode:
            # if both are smaller, we go left
            if p.val < currentNode.val and q.val < currentNode.val:
                currentNode = currentNode.left
            # if both are bigger, we go right
            elif p.val > currentNode.val and q.val > currentNode.val:
                currentNode = currentNode.right
            # if in separate sub-trees, it's currentNode
            else:
                return currentNode`;

// BST: [6, 2, 8, 0, 4, 7, 9], find LCA of p=2, q=4
const NODES: Omit<TreeNode, 'state'>[] = [
  { id: 'n0', value: 6, leftId: 'n1', rightId: 'n2' },
  { id: 'n1', value: 2, leftId: 'n3', rightId: 'n4' },
  { id: 'n2', value: 8, leftId: 'n5', rightId: 'n6' },
  { id: 'n3', value: 0, leftId: null, rightId: null },
  { id: 'n4', value: 4, leftId: null, rightId: null },
  { id: 'n5', value: 7, leftId: null, rightId: null },
  { id: 'n6', value: 9, leftId: null, rightId: null },
];

function generateSteps(): Step[] {
  const steps: Step[] = [];
  const nodeMap = new Map(NODES.map((n) => [n.id, n]));
  const valueOf = (id: string) => nodeMap.get(id)!.value as number;
  const p = 2;
  const q = 4;

  // Mark the two target nodes throughout so the viewer can see what we are seeking.
  const colour: Record<string, TreeNode['state']> = { n1: 'highlighted', n4: 'highlighted' };

  const makeNodes = (): TreeNode[] =>
    NODES.map((n) => ({ ...n, state: colour[n.id] ?? 'default' }));

  const push = (
    explanation: string,
    line: number,
    opts: { current?: string | null; vars?: { name: string; value: string | number; highlight?: boolean }[] } = {}
  ) => {
    steps.push({
      explanation,
      highlightLine: line,
      state: {
        type: 'tree',
        nodes: makeNodes(),
        pointers: opts.current ? [{ nodeId: opts.current, label: '▶ here' }] : [],
        counters: [{ label: 'p', value: p }, { label: 'q', value: q }],
      } as TreeState,
      variables: opts.vars,
    });
  };

  push(
    `We want the lowest common ancestor of p=${p} and q=${q}. We exploit the BST ordering instead of searching blindly: from the current node, if BOTH targets are smaller we go left, if BOTH are larger we go right. The instant they fall on different sides (or one equals the current node) we have found the split point — that node is the LCA. Start at the root.`,
    13,
    { vars: [{ name: 'p.val', value: p }, { name: 'q.val', value: q }] }
  );

  let id: string | null = 'n0';
  while (id) {
    const cur: string = id;
    const v = valueOf(cur);
    colour[cur] = colour[cur] === 'highlighted' ? 'highlighted' : 'active';
    const node = nodeMap.get(cur)!;

    const bothSmaller = p < v && q < v;
    const bothBigger = p > v && q > v;

    if (bothSmaller) {
      push(
        `At node ${v}: is p (${p}) < ${v} AND q (${q}) < ${v}? Yes — both targets are in the LEFT subtree, so move left.`,
        18,
        { current: cur, vars: [{ name: 'currentNode.val', value: v }, { name: 'p<node', value: 'True' }, { name: 'q<node', value: 'True', highlight: true }] }
      );
      if (colour[cur] === 'active') colour[cur] = 'visited';
      id = node.leftId;
    } else if (bothBigger) {
      push(
        `At node ${v}: both smaller? No. Is p (${p}) > ${v} AND q (${q}) > ${v}? Yes — both targets are in the RIGHT subtree, so move right.`,
        21,
        { current: cur, vars: [{ name: 'currentNode.val', value: v }, { name: 'p>node', value: 'True' }, { name: 'q>node', value: 'True', highlight: true }] }
      );
      if (colour[cur] === 'active') colour[cur] = 'visited';
      id = node.rightId;
    } else {
      colour[cur] = 'found';
      push(
        `At node ${v}: both smaller? No (p=${p} is not < ${v}). Both bigger? No. So p and q split here — one is on each side, or one equals this node. Node ${v} is the LCA. Return it.`,
        24,
        { current: cur, vars: [{ name: 'currentNode.val', value: v }, { name: 'LCA', value: v, highlight: true }] }
      );
      break;
    }
  }

  return steps;
}

export const lowestCommonAncestorBstMeta: AlgorithmMeta = {
  id: 'lowest-common-ancestor-bst',
  lcNumber: 235,
  title: 'Lowest Common Ancestor of BST',
  difficulty: 'Medium',
  category: 'trees',
  tags: ['Tree', 'DFS', 'BST'],
  timeComplexity: 'O(h)',
  spaceComplexity: 'O(1)',
  description: 'Given a binary search tree (BST), find the lowest common ancestor (LCA) node of two given nodes in the BST. The LCA is defined as the lowest node that has both p and q as descendants (a node can be a descendant of itself).',
  examples: [
    {
      input: 'root = [6,2,8,0,4,7,9], p = 2, q = 4',
      output: '2',
      explanation: 'Node 2 is the LCA since p=2 is node 2 itself and q=4 is in its right subtree.',
    },
  ],
  constraints: [
    'The number of nodes in the tree is in the range [2, 10^5].',
    '-10^9 <= Node.val <= 10^9',
    'All Node.val are unique.',
    'p != q, p and q will exist in the BST.',
  ],
  hint: 'Use the BST property: if both p and q are less than current node, LCA is in the left subtree. If both are greater, go right. Otherwise, the current node is the LCA.',
  solutions: [
    {
      label: 'Iterative BST Traversal',
      pythonCode: PYTHON_CODE,
      generateSteps,
    },
  ],
};
