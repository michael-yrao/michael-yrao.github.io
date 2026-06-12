import { AlgorithmMeta, TreeNode, TreeState } from '../../core/models/algorithm.model';

const PYTHON_CODE = `from typing import Optional

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    def isSameTree(self, p: Optional[TreeNode], q: Optional[TreeNode]) -> bool:
        # we return false if at any point, these two are not the same
        # we check parent first, so this is preorder dfs

        # base case
        if not p and not q:
            return True
        # if current node is good, we check the rest
        if p and q and p.val == q.val:
            return self.isSameTree(p.left, q.left) and self.isSameTree(p.right, q.right)
        else:
            return False`;

// Show p tree: [1, 2, 3], q = [1, 2, 3] — same structure, use variables to show comparison
function makeNodes(overrides: Record<string, TreeNode['state']> = {}): TreeNode[] {
  const base: Omit<TreeNode, 'state'>[] = [
    { id: 'pn0', value: 1, leftId: 'pn1', rightId: 'pn2' },
    { id: 'pn1', value: 2, leftId: null, rightId: null },
    { id: 'pn2', value: 3, leftId: null, rightId: null },
  ];
  return base.map(n => ({ ...n, state: overrides[n.id] ?? 'default' }));
}

export function generateSteps() {
  return [
    {
      explanation: 'Preorder DFS: check parent first, then recurse children. p=[1,2,3], q=[1,2,3]. Compare root nodes.',
      highlightLine: 10,
      state: {
        type: 'tree' as const,
        nodes: makeNodes(),
      } as TreeState,
      variables: [{ name: 'p.val', value: 1 }, { name: 'q.val', value: 1 }],
    },
    {
      explanation: 'Root: p.val=1 == q.val=1. Match! Recurse into left children: p.left=2, q.left=2.',
      highlightLine: 18,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ pn0: 'active' }),
      } as TreeState,
      variables: [{ name: 'p.val', value: 1 }, { name: 'q.val', value: 1 }, { name: 'match', value: 'True', highlight: true }],
    },
    {
      explanation: 'Compare left children: p.val=2 == q.val=2. Match! Both have no children — recurse returns True.',
      highlightLine: 18,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ pn0: 'visited', pn1: 'active' }),
      } as TreeState,
      variables: [{ name: 'p.val', value: 2 }, { name: 'q.val', value: 2 }, { name: 'match', value: 'True', highlight: true }],
    },
    {
      explanation: 'Node 2 confirmed same. Now compare right children: p.val=3 == q.val=3.',
      highlightLine: 18,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ pn0: 'visited', pn1: 'found', pn2: 'active' }),
      } as TreeState,
      variables: [{ name: 'p.val', value: 3 }, { name: 'q.val', value: 3 }, { name: 'match', value: 'True', highlight: true }],
    },
    {
      explanation: 'Node 3 confirmed same. Both children of null return True (base case). All nodes match — isSameTree returns True.',
      highlightLine: 15,
      state: {
        type: 'tree' as const,
        nodes: makeNodes({ pn0: 'found', pn1: 'found', pn2: 'found' }),
        counters: [{ label: 'result', value: 'True' }],
      } as TreeState,
      variables: [{ name: 'result', value: 'True', highlight: true }],
    },
  ];
}

export const sameTreeMeta: AlgorithmMeta = {
  id: 'same-tree',
  lcNumber: 100,
  title: 'Same Tree',
  difficulty: 'Easy',
  category: 'trees',
  tags: ['Tree', 'DFS', 'BFS', 'Recursion'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(h)',
  description: 'Given the roots of two binary trees p and q, write a function to check if they are the same or not. Two binary trees are considered the same if they are structurally identical, and the nodes have the same value.',
  examples: [
    {
      input: 'p = [1,2,3], q = [1,2,3]',
      output: 'true',
      explanation: 'Both trees have identical structure and node values.',
    },
    {
      input: 'p = [1,2], q = [1,null,2]',
      output: 'false',
      explanation: 'Different structure: node 2 is on different sides.',
    },
  ],
  constraints: [
    'The number of nodes in both trees is in the range [0, 100].',
    '-10^4 <= Node.val <= 10^4',
  ],
  hint: 'Use preorder DFS. Base case: both null → True. If values match, recurse on both left and right children.',
  solutions: [
    {
      label: 'Preorder DFS (Recursive)',
      pythonCode: PYTHON_CODE,
      generateSteps,
    },
  ],
};
