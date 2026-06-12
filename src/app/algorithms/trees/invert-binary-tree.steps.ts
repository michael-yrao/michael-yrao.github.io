import { AlgorithmMeta, TreeState } from '../../core/models/algorithm.model';

const PYTHON_CODE = `from typing import Optional

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    def invertTree(self, root: Optional[TreeNode]) -> Optional[TreeNode]:
        # processing children first
        # thus postorder dfs

        # when root is null, return
        if not root:
            return root

        self.invertTree(root.left)
        self.invertTree(root.right)
        temp = root.left
        root.left = root.right
        root.right = temp

        # return the root
        return root`;

function makeInitialNodes(): ReturnType<typeof buildNodes> {
  return buildNodes({
    n0: { value: 4, leftId: 'n1', rightId: 'n2' },
    n1: { value: 2, leftId: 'n3', rightId: 'n4' },
    n2: { value: 7, leftId: 'n5', rightId: 'n6' },
    n3: { value: 1, leftId: null, rightId: null },
    n4: { value: 3, leftId: null, rightId: null },
    n5: { value: 6, leftId: null, rightId: null },
    n6: { value: 9, leftId: null, rightId: null },
  });
}

type NodeDef = { value: number; leftId: string | null; rightId: string | null };

function buildNodes(defs: Record<string, NodeDef & { state?: string }>, stateOverrides?: Record<string, string>) {
  return Object.entries(defs).map(([id, def]) => ({
    id,
    value: def.value,
    state: ((stateOverrides?.[id] ?? def.state ?? 'default') as 'default' | 'active' | 'visited' | 'found' | 'highlighted' | 'comparing'),
    leftId: def.leftId,
    rightId: def.rightId,
  }));
}

export function generateSteps() {
  const steps = [];

  // Step 1: Introduction
  steps.push({
    explanation: 'Intro: postorder DFS — recurse left, recurse right, then swap. We visit leaves first and work back up.',
    highlightLine: 10,
    state: {
      type: 'tree' as const,
      nodes: buildNodes({
        n0: { value: 4, leftId: 'n1', rightId: 'n2' },
        n1: { value: 2, leftId: 'n3', rightId: 'n4' },
        n2: { value: 7, leftId: 'n5', rightId: 'n6' },
        n3: { value: 1, leftId: null, rightId: null },
        n4: { value: 3, leftId: null, rightId: null },
        n5: { value: 6, leftId: null, rightId: null },
        n6: { value: 9, leftId: null, rightId: null },
      }),
    } as TreeState,
  });

  // Step 2: Reach node 1 (leaf, left-most)
  steps.push({
    explanation: 'Recurse all the way down left subtree. We reach node 1 (leaf). No children — return up.',
    highlightLine: 18,
    state: {
      type: 'tree' as const,
      nodes: buildNodes({
        n0: { value: 4, leftId: 'n1', rightId: 'n2' },
        n1: { value: 2, leftId: 'n3', rightId: 'n4' },
        n2: { value: 7, leftId: 'n5', rightId: 'n6' },
        n3: { value: 1, leftId: null, rightId: null },
        n4: { value: 3, leftId: null, rightId: null },
        n5: { value: 6, leftId: null, rightId: null },
        n6: { value: 9, leftId: null, rightId: null },
      }, { n3: 'active' }),
    } as TreeState,
  });

  // Step 3: Reach node 3 (leaf, right child of node 2)
  steps.push({
    explanation: 'Recurse down right of node 2. We reach node 3 (leaf). No children — return up.',
    highlightLine: 18,
    state: {
      type: 'tree' as const,
      nodes: buildNodes({
        n0: { value: 4, leftId: 'n1', rightId: 'n2' },
        n1: { value: 2, leftId: 'n3', rightId: 'n4' },
        n2: { value: 7, leftId: 'n5', rightId: 'n6' },
        n3: { value: 1, leftId: null, rightId: null },
        n4: { value: 3, leftId: null, rightId: null },
        n5: { value: 6, leftId: null, rightId: null },
        n6: { value: 9, leftId: null, rightId: null },
      }, { n3: 'visited', n4: 'active' }),
    } as TreeState,
  });

  // Step 4: Back at node 2, swap children (n3 and n4 swap positions)
  steps.push({
    explanation: "Back at node 2. Left=1, right=3. Swap children: node 2's left becomes 3, right becomes 1.",
    highlightLine: 21,
    state: {
      type: 'tree' as const,
      nodes: [
        { id: 'n0', value: 4, state: 'default' as const, leftId: 'n1', rightId: 'n2' },
        { id: 'n1', value: 2, state: 'active' as const, leftId: 'n4', rightId: 'n3' },
        { id: 'n2', value: 7, state: 'default' as const, leftId: 'n5', rightId: 'n6' },
        { id: 'n3', value: 1, state: 'visited' as const, leftId: null, rightId: null },
        { id: 'n4', value: 3, state: 'visited' as const, leftId: null, rightId: null },
        { id: 'n5', value: 6, state: 'default' as const, leftId: null, rightId: null },
        { id: 'n6', value: 9, state: 'default' as const, leftId: null, rightId: null },
      ],
    } as TreeState,
  });

  // Step 5: Reach node 6 (leaf, left child of node 7)
  steps.push({
    explanation: "Recurse down left of root's right child (node 7). Reach node 6 (leaf).",
    highlightLine: 18,
    state: {
      type: 'tree' as const,
      nodes: [
        { id: 'n0', value: 4, state: 'default' as const, leftId: 'n1', rightId: 'n2' },
        { id: 'n1', value: 2, state: 'visited' as const, leftId: 'n4', rightId: 'n3' },
        { id: 'n2', value: 7, state: 'default' as const, leftId: 'n5', rightId: 'n6' },
        { id: 'n3', value: 1, state: 'visited' as const, leftId: null, rightId: null },
        { id: 'n4', value: 3, state: 'visited' as const, leftId: null, rightId: null },
        { id: 'n5', value: 6, state: 'active' as const, leftId: null, rightId: null },
        { id: 'n6', value: 9, state: 'default' as const, leftId: null, rightId: null },
      ],
    } as TreeState,
  });

  // Step 6: Reach node 9 (leaf, right child of node 7)
  steps.push({
    explanation: 'Recurse down right of node 7. Reach node 9 (leaf).',
    highlightLine: 18,
    state: {
      type: 'tree' as const,
      nodes: [
        { id: 'n0', value: 4, state: 'default' as const, leftId: 'n1', rightId: 'n2' },
        { id: 'n1', value: 2, state: 'visited' as const, leftId: 'n4', rightId: 'n3' },
        { id: 'n2', value: 7, state: 'default' as const, leftId: 'n5', rightId: 'n6' },
        { id: 'n3', value: 1, state: 'visited' as const, leftId: null, rightId: null },
        { id: 'n4', value: 3, state: 'visited' as const, leftId: null, rightId: null },
        { id: 'n5', value: 6, state: 'visited' as const, leftId: null, rightId: null },
        { id: 'n6', value: 9, state: 'active' as const, leftId: null, rightId: null },
      ],
    } as TreeState,
  });

  // Step 7: Back at node 7, swap children (n5 and n6 swap)
  steps.push({
    explanation: "Back at node 7. Swap children: node 7's left becomes 9, right becomes 6.",
    highlightLine: 21,
    state: {
      type: 'tree' as const,
      nodes: [
        { id: 'n0', value: 4, state: 'default' as const, leftId: 'n1', rightId: 'n2' },
        { id: 'n1', value: 2, state: 'visited' as const, leftId: 'n4', rightId: 'n3' },
        { id: 'n2', value: 7, state: 'active' as const, leftId: 'n6', rightId: 'n5' },
        { id: 'n3', value: 1, state: 'visited' as const, leftId: null, rightId: null },
        { id: 'n4', value: 3, state: 'visited' as const, leftId: null, rightId: null },
        { id: 'n5', value: 6, state: 'visited' as const, leftId: null, rightId: null },
        { id: 'n6', value: 9, state: 'visited' as const, leftId: null, rightId: null },
      ],
    } as TreeState,
  });

  // Step 8: Back at root, swap children (n1 and n2 swap)
  steps.push({
    explanation: 'Back at root (4). Swap children: left becomes node 7, right becomes node 2. Tree fully inverted.',
    highlightLine: 21,
    state: {
      type: 'tree' as const,
      nodes: [
        { id: 'n0', value: 4, state: 'active' as const, leftId: 'n2', rightId: 'n1' },
        { id: 'n1', value: 2, state: 'found' as const, leftId: 'n4', rightId: 'n3' },
        { id: 'n2', value: 7, state: 'found' as const, leftId: 'n6', rightId: 'n5' },
        { id: 'n3', value: 1, state: 'found' as const, leftId: null, rightId: null },
        { id: 'n4', value: 3, state: 'found' as const, leftId: null, rightId: null },
        { id: 'n5', value: 6, state: 'found' as const, leftId: null, rightId: null },
        { id: 'n6', value: 9, state: 'found' as const, leftId: null, rightId: null },
      ],
    } as TreeState,
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
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(h)',
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
      pythonCode: PYTHON_CODE,
      generateSteps,
    },
  ],
};
