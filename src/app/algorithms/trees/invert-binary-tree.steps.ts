import { AlgorithmMeta, Step, TreeNodeState, TreeState } from '../../core/models/algorithm.model';
import { TreeNodeInput, treeState } from '../../core/steps';

// Traces cse-progress's invertTree verbatim: `if not root: return root` (returns root itself,
// i.e. None, not a bare `return`), then postorder — recurse left, recurse right, THEN swap via
// a temp variable — matches this file's earlier hand simulation exactly, only anchors change.

const ORIGINAL: TreeNodeInput[] = [
  { id: 'n0', value: 4, leftId: 'n1', rightId: 'n2' },
  { id: 'n1', value: 2, leftId: 'n3', rightId: 'n4' },
  { id: 'n2', value: 7, leftId: 'n5', rightId: 'n6' },
  { id: 'n3', value: 1, leftId: null, rightId: null },
  { id: 'n4', value: 3, leftId: null, rightId: null },
  { id: 'n5', value: 6, leftId: null, rightId: null },
  { id: 'n6', value: 9, leftId: null, rightId: null },
];

function swapChildren(nodes: TreeNodeInput[], ids: string[]): TreeNodeInput[] {
  return nodes.map((node) => (ids.includes(node.id) ? { ...node, leftId: node.rightId, rightId: node.leftId } : node));
}

const AFTER_N1_SWAP = swapChildren(ORIGINAL, ['n1']);
const AFTER_N1_N2_SWAP = swapChildren(ORIGINAL, ['n1', 'n2']);
const FULLY_INVERTED = swapChildren(ORIGINAL, ['n1', 'n2', 'n0']);

/** Tree over `nodes` where each id in `states` takes its mapped state and every other node is default. */
function tree(nodes: TreeNodeInput[], states: Record<string, TreeNodeState> = {}): TreeState {
  return treeState(nodes, { nodeState: (node) => states[node.id] ?? 'default' });
}

export function generateSteps(): Step[] {
  const steps: Step[] = [];

  // Step 1: Introduction
  steps.push({
    explanation: 'Intro: postorder DFS — recurse left, recurse right, then swap. We visit leaves first and work back up.',
    anchor: { match: 'def invertTree(self, root: Optional[TreeNode]) -> Optional[TreeNode]:' },
    state: tree(ORIGINAL),
  });

  // Step 2: Reach node 1 (leaf, left-most)
  steps.push({
    explanation: 'Recurse all the way down left subtree. We reach node 1 (leaf); recursing into its null children hits if not root: return root. No children — return up.',
    anchor: { match: 'if not root:' },
    state: tree(ORIGINAL, { n3: 'active' }),
  });

  // Step 3: Reach node 3 (leaf, right child of node 2)
  steps.push({
    explanation: 'Recurse down right of node 2. We reach node 3 (leaf); if not root: return root fires on its null children. No children — return up.',
    anchor: { match: 'if not root:' },
    state: tree(ORIGINAL, { n3: 'visited', n4: 'active' }),
  });

  // Step 4: Back at node 2, swap children (n3 and n4 swap positions)
  steps.push({
    explanation: "Back at node 2, both recursive calls done. temp = root.left; root.left = root.right; root.right = temp. Left=1, right=3 → node 2's left becomes 3, right becomes 1.",
    anchor: { match: 'temp = root.left', to: { match: 'root.right = temp' } },
    state: tree(AFTER_N1_SWAP, { n1: 'active', n3: 'visited', n4: 'visited' }),
  });

  // Step 5: Reach node 6 (leaf, left child of node 7)
  steps.push({
    explanation: "Recurse down left of root's right child (node 7). Reach node 6 (leaf); if not root: return root fires on its null children.",
    anchor: { match: 'if not root:' },
    state: tree(AFTER_N1_SWAP, { n1: 'visited', n3: 'visited', n4: 'visited', n5: 'active' }),
  });

  // Step 6: Reach node 9 (leaf, right child of node 7)
  steps.push({
    explanation: 'Recurse down right of node 7. Reach node 9 (leaf); if not root: return root fires on its null children.',
    anchor: { match: 'if not root:' },
    state: tree(AFTER_N1_SWAP, { n1: 'visited', n3: 'visited', n4: 'visited', n5: 'visited', n6: 'active' }),
  });

  // Step 7: Back at node 7, swap children (n5 and n6 swap)
  steps.push({
    explanation: "Back at node 7, both recursive calls done. temp = root.left; root.left = root.right; root.right = temp → node 7's left becomes 9, right becomes 6.",
    anchor: { match: 'temp = root.left', to: { match: 'root.right = temp' } },
    state: tree(AFTER_N1_N2_SWAP, { n1: 'visited', n2: 'active', n3: 'visited', n4: 'visited', n5: 'visited', n6: 'visited' }),
  });

  // Step 8: Back at root, swap children (n1 and n2 swap)
  steps.push({
    explanation: 'Back at root (4), both recursive calls done. temp = root.left; root.left = root.right; root.right = temp → left becomes node 7, right becomes node 2. Tree fully inverted. return root.',
    anchor: { match: 'temp = root.left', to: { match: 'root.right = temp' } },
    state: tree(FULLY_INVERTED, { n0: 'active', n1: 'found', n2: 'found', n3: 'found', n4: 'found', n5: 'found', n6: 'found' }),
  });

  return steps;
}

export const invertBinaryTreeMeta: AlgorithmMeta = {
  id: 'invert-binary-tree',
  lcNumber: 226,
  title: 'Invert Binary Tree',
  difficulty: 'Easy',
  category: 'trees',
  tags: ['Tree', 'DFS', 'BFS', 'Recursion'],
  description: 'Given the root of a binary tree, invert the tree, and return its root.',
  examples: [
    {
      input: 'root = [4,2,7,1,3,6,9]',
      output: '[4,7,2,9,6,3,1]',
      explanation: 'Swap every left and right child recursively (postorder DFS).',
    },
  ],
  constraints: [
    'The number of nodes in the tree is in the range [0, 100].',
    '-100 <= Node.val <= 100',
  ],
  hint: 'Use postorder DFS: recurse left, recurse right, then swap the two children. This ensures children are already inverted before the parent swaps them.',
  solutions: [
    {
      label: 'Postorder DFS (Recursive)',
      variant: 'postorder',
      generateSteps,
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(h)',
    },
  ],
};
