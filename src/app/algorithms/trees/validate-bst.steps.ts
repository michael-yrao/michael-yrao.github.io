import { AlgorithmMeta, Step, TreeNode, TreeState } from '../../core/models/algorithm.model';

const PYTHON_CODE = `from collections import deque
import math
from typing import Optional

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

class Solution:
    def isValidBST(self, root: Optional[TreeNode]) -> bool:
        # valid BST means we need to compare current node's value to it's children or vice versa
        # let's do this with iterative DFS
        # we should keep track of what is allowed in current node
        # from the root, we allow everything, so lower bound of -inf and upper bound of inf
        # when we go left, the upper bound changes to root
        # when we go right, the lower bound changes to root

        stack = deque()
        stack.append([root,-math.inf, math.inf])

        while stack:
            currentNode, low, high = stack.pop()
            if not currentNode:
                continue

            # if current node not within bounds, return false
            # currentNode.val must be greater than low
            # currentNode.val must be less than high
            if currentNode.val <= low or currentNode.val >= high:
                return False

            # current node is valid, update boundaries to children and add to stack
            if currentNode.left:
                stack.append([currentNode.left, low, currentNode.val])
            if currentNode.right:
                stack.append([currentNode.right, currentNode.val, high])
        return True`;

// BST: [5, 3, 6, 2, 4, null, 7]
const NODES: Omit<TreeNode, 'state'>[] = [
  { id: 'n0', value: 5, leftId: 'n1', rightId: 'n2' },
  { id: 'n1', value: 3, leftId: 'n3', rightId: 'n4' },
  { id: 'n2', value: 6, leftId: null, rightId: 'n5' },
  { id: 'n3', value: 2, leftId: null, rightId: null },
  { id: 'n4', value: 4, leftId: null, rightId: null },
  { id: 'n5', value: 7, leftId: null, rightId: null },
];

function generateSteps(): Step[] {
  const steps: Step[] = [];
  const nodeMap = new Map(NODES.map((n) => [n.id, n]));
  const valueOf = (id: string) => nodeMap.get(id)!.value as number;
  const fmt = (n: number) => (n === -Infinity ? '−∞' : n === Infinity ? '+∞' : String(n));

  const colour: Record<string, TreeNode['state']> = {};
  type Frame = [string, number, number];
  const stack: Frame[] = [['n0', -Infinity, Infinity]];

  const makeNodes = (): TreeNode[] =>
    NODES.map((n) => ({ ...n, state: colour[n.id] ?? 'default' }));

  const stackStr = () =>
    '[' + stack.map(([id, lo, hi]) => `(${valueOf(id)}: ${fmt(lo)}<x<${fmt(hi)})`).join(', ') + ']';

  const push = (
    explanation: string,
    line: number,
    opts: {
      current?: string | null;
      vars?: { name: string; value: string | number; highlight?: boolean }[];
    } = {}
  ) => {
    steps.push({
      explanation,
      highlightLine: line,
      state: {
        type: 'tree',
        nodes: makeNodes(),
        pointers: opts.current ? [{ nodeId: opts.current, label: '▶ checking' }] : [],
        counters: [{ label: 'stack', value: stackStr() }],
      } as TreeState,
      variables: opts.vars,
    });
  };

  push(
    'A BST is valid if every node sits inside an allowed range. The trick: carry a (low, high) bound down the tree. Going LEFT tightens the upper bound to the parent; going RIGHT tightens the lower bound to the parent. We do this iteratively with a stack of (node, low, high). Push the root with the widest range (−∞, +∞).',
    21,
    { vars: [{ name: 'stack', value: '[(5: −∞<x<+∞)]' }] }
  );

  let valid = true;
  while (stack.length) {
    const [id, low, high] = stack.pop()!;
    const v = valueOf(id);
    colour[id] = 'active';

    const inBounds = v > low && v < high;
    push(
      `Pop node ${v} with allowed range (${fmt(low)}, ${fmt(high)}). Check ${fmt(low)} < ${v} < ${fmt(high)}? ${
        inBounds ? 'Yes ✓ — this node is valid so far.' : `No ✗ — ${v} violates its range, the tree is NOT a valid BST, return False.`
      }`,
      inBounds ? 31 : 32,
      {
        current: id,
        vars: [
          { name: 'node', value: v },
          { name: 'low', value: fmt(low) },
          { name: 'high', value: fmt(high) },
          { name: 'in range?', value: inBounds ? 'Yes' : 'No', highlight: !inBounds },
        ],
      }
    );

    if (!inBounds) {
      valid = false;
      colour[id] = 'comparing';
      break;
    }

    colour[id] = 'visited';
    const node = nodeMap.get(id)!;
    const pushed: string[] = [];
    if (node.leftId) {
      stack.push([node.leftId, low, v]);
      pushed.push(`left ${valueOf(node.leftId)} gets range (${fmt(low)}, ${v})`);
    }
    if (node.rightId) {
      stack.push([node.rightId, v, high]);
      pushed.push(`right ${valueOf(node.rightId)} gets range (${v}, ${fmt(high)})`);
    }
    if (pushed.length) {
      push(
        `Node ${v} valid. Push its children with tightened bounds: ${pushed.join('; ')}. Stack is now ${stackStr()}.`,
        node.rightId ? 38 : 36,
        { current: id, vars: pushed.map((p, i) => ({ name: `push ${i + 1}`, value: p })) }
      );
    }
  }

  if (valid) {
    NODES.forEach((n) => (colour[n.id] = 'found'));
    push(
      'Stack is empty and no node ever broke its range — the tree is a valid BST, return True.',
      39,
      { vars: [{ name: 'result', value: 'True', highlight: true }] }
    );
  }

  return steps;
}

export const validateBstMeta: AlgorithmMeta = {
  id: 'validate-bst',
  lcNumber: 98,
  title: 'Validate Binary Search Tree',
  difficulty: 'Medium',
  category: 'trees',
  tags: ['Tree', 'DFS', 'BST'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(h)',
  description: 'Given the root of a binary tree, determine if it is a valid binary search tree (BST). A valid BST requires that every node\'s left subtree contains only nodes with values strictly less than the node\'s value, and every node\'s right subtree contains only nodes with values strictly greater.',
  examples: [
    {
      input: 'root = [5,3,6,2,4,null,7]',
      output: 'true',
      explanation: 'Each node satisfies strict BST constraints with tracked lower/upper bounds.',
    },
  ],
  constraints: [
    'The number of nodes in the tree is in the range [1, 10^4].',
    '-2^31 <= Node.val <= 2^31 - 1',
  ],
  hint: 'Use iterative DFS with a stack of (node, low, high) tuples. Start root with (-inf, inf). When going left, upper bound becomes current val; when going right, lower bound becomes current val.',
  solutions: [
    {
      label: 'Iterative DFS with Bounds',
      pythonCode: PYTHON_CODE,
      generateSteps,
    },
  ],
};
