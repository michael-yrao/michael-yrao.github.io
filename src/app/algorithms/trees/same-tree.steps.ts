import { AlgorithmMeta, Step, TreeNode, TreeState } from '../../core/models/algorithm.model';

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

// p = [1,2,3], q = [1,2,3] — identical, so we render one shared shape and
// compare p.val vs q.val at each position.
const NODES: Omit<TreeNode, 'state'>[] = [
  { id: 'n0', value: 1, leftId: 'n1', rightId: 'n2' },
  { id: 'n1', value: 2, leftId: null, rightId: null },
  { id: 'n2', value: 3, leftId: null, rightId: null },
];

function generateSteps(): Step[] {
  const steps: Step[] = [];
  const nodeMap = new Map(NODES.map((n) => [n.id, n]));
  const valueOf = (id: string) => nodeMap.get(id)!.value as number;

  const colour: Record<string, TreeNode['state']> = {};
  let stackDepth = 0;

  const makeNodes = (): TreeNode[] =>
    NODES.map((n) => ({ ...n, state: colour[n.id] ?? 'default' }));

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
        pointers: opts.current ? [{ nodeId: opts.current, label: '▶ comparing' }] : [],
        counters: [{ label: 'call stack depth', value: stackDepth }],
      } as TreeState,
      variables: opts.vars,
    });
  };

  push(
    'Two trees are "the same" if they have identical structure AND identical values. We walk both at once with PREorder DFS (check the node first, then its children). Here p = [1,2,3] and q = [1,2,3]. We compare position by position; the first mismatch (value differs, or one side has a node where the other has null) returns False.',
    11,
    { vars: [{ name: 'p', value: '[1,2,3]' }, { name: 'q', value: '[1,2,3]' }] }
  );

  // Returns true if the subtrees rooted here are identical. Since p and q are
  // identical in this example, we drive the walk off the shared node ids.
  function dfs(id: string | null, side: string, parentId: string | null): boolean {
    if (id === null) {
      push(
        `${side}: p and q are BOTH null → base case "if not p and not q: return True". Two empty subtrees are trivially identical.`,
        16,
        { current: parentId, vars: [{ name: 'p', value: 'null' }, { name: 'q', value: 'null' }, { name: 'returns', value: 'True', highlight: true }] }
      );
      return true;
    }

    stackDepth++;
    const v = valueOf(id);
    colour[id] = 'active';
    push(
      `Compare ${side}: p.val = ${v} and q.val = ${v} → equal ✓. Values match, so recurse into BOTH left children next (call stack depth now ${stackDepth}).`,
      18,
      { current: id, vars: [{ name: 'p.val', value: v }, { name: 'q.val', value: v }, { name: 'match', value: 'True', highlight: true }] }
    );

    const leftSame = dfs(nodeMap.get(id)!.leftId, `Left children of ${v}`, id);

    colour[id] = 'active';
    push(
      `Back at node ${v}. Left children matched (${String(leftSame)}). Now recurse into BOTH right children.`,
      19,
      { current: id, vars: [{ name: 'node', value: v }, { name: 'leftSame', value: String(leftSame), highlight: true }] }
    );

    const rightSame = dfs(nodeMap.get(id)!.rightId, `Right children of ${v}`, id);

    const same = leftSame && rightSame;
    colour[id] = 'visited';
    stackDepth--;
    push(
      `Node ${v} fully checked: value matched, leftSame=${String(leftSame)}, rightSame=${String(rightSame)}. Return ${String(leftSame)} AND ${String(rightSame)} = ${String(same)} up to the caller.`,
      19,
      { current: id, vars: [{ name: 'node', value: v }, { name: 'return', value: String(same), highlight: true }] }
    );
    return same;
  }

  const result = dfs('n0', 'root', null);

  NODES.forEach((n) => (colour[n.id] = result ? 'found' : 'visited'));
  push(
    `Every position matched and the recursion returned ${String(result)} all the way to the root, so the trees are identical → isSameTree returns ${String(result)}.`,
    18,
    { vars: [{ name: 'result', value: String(result), highlight: true }] }
  );

  return steps;
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
