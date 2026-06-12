import { AlgorithmMeta, TreeNode, TreeState } from '../../core/models/algorithm.model';

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

// BST: [6, 2, 8, 0, 4, 7, 9]
// n0=6(root), n1=2(leftId='n3',rightId='n4'), n2=8(leftId='n5',rightId='n6'), n3=0(leaf), n4=4(leaf), n5=7(leaf), n6=9(leaf)
// Finding LCA of p=2, q=4
function makeNodes(overrides: Record<string, TreeNode['state']> = {}): TreeNode[] {
  const base: Omit<TreeNode, 'state'>[] = [
    { id: 'n0', value: 6, leftId: 'n1', rightId: 'n2' },
    { id: 'n1', value: 2, leftId: 'n3', rightId: 'n4' },
    { id: 'n2', value: 8, leftId: 'n5', rightId: 'n6' },
    { id: 'n3', value: 0, leftId: null, rightId: null },
    { id: 'n4', value: 4, leftId: null, rightId: null },
    { id: 'n5', value: 7, leftId: null, rightId: null },
    { id: 'n6', value: 9, leftId: null, rightId: null },
  ];
  return base.map(n => ({ ...n, state: overrides[n.id] ?? 'default' }));
}

export function generateSteps() {
  return [
    {
      explanation: 'Find LCA of p=2 and q=4 in the BST. Start at root (6). p=2, q=4 are highlighted.',
      highlightLine: 13,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n1: 'highlighted', n4: 'highlighted' }),
      } as TreeState,
      variables: [{ name: 'p.val', value: 2 }, { name: 'q.val', value: 4 }],
    },
    {
      explanation: 'At node 6: p.val=2 < 6 AND q.val=4 < 6. Both smaller — go left.',
      highlightLine: 17,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n0: 'active', n1: 'highlighted', n4: 'highlighted' }),
      } as TreeState,
      variables: [{ name: 'currentNode.val', value: 6 }, { name: 'p.val', value: 2 }, { name: 'q.val', value: 4 }],
    },
    {
      explanation: 'At node 2: p.val=2 is NOT < 2, so they are not both smaller. Check if both bigger: 2 > 2? No. We are in the else branch — currentNode IS the LCA!',
      highlightLine: 20,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n0: 'visited', n1: 'active', n4: 'highlighted' }),
      } as TreeState,
      variables: [{ name: 'currentNode.val', value: 2 }, { name: 'p.val', value: 2 }, { name: 'q.val', value: 4 }],
    },
    {
      explanation: 'Node 2 is the LCA of p=2 and q=4. p=2 IS node 2 itself, and q=4 is in node 2\'s right subtree. They diverge here.',
      highlightLine: 24,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ n0: 'visited', n1: 'found', n3: 'highlighted', n4: 'highlighted' }),
        counters: [{ label: 'LCA', value: 'node 2' }],
      } as TreeState,
      variables: [{ name: 'LCA', value: 2, highlight: true }],
    },
  ];
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
