import { AlgorithmMeta, Step, StepAnchor, TreeNode, TreeState } from '../../core/models/algorithm.model';

// Traces cse-progress's maxDepth verbatim: this attempt has NO separate nested `dfs` helper —
// `self.maxDepth` recurses directly, and both children plus the max()+1 combine all happen
// INLINE in one return statement, so there is no distinct source line for "left is back, now
// go right" — that step is dropped and both the entry and the resolved-depth narration anchor
// to the two lines that actually exist: the def line and the one return line.

// Tree: [3,9,20,null,null,15,7]
const NODES: Omit<TreeNode, 'state'>[] = [
  { id: 'n0', value: 3, leftId: 'n1', rightId: 'n2' },
  { id: 'n1', value: 9, leftId: null, rightId: null },
  { id: 'n2', value: 20, leftId: 'n3', rightId: 'n4' },
  { id: 'n3', value: 15, leftId: null, rightId: null },
  { id: 'n4', value: 7, leftId: null, rightId: null },
];

function generateSteps(): Step[] {
  const steps: Step[] = [];
  const nodeMap = new Map(NODES.map((n) => [n.id, n]));
  const valueOf = (id: string) => nodeMap.get(id)!.value as number;

  // Live node colouring. 'active' = currently on the call stack,
  // 'visited' = finished and returned, 'found' = final answer path.
  const colour: Record<string, TreeNode['state']> = {};
  let stackDepth = 0;

  const makeNodes = (): TreeNode[] =>
    NODES.map((n) => ({ ...n, state: colour[n.id] ?? 'default' }));

  const push = (
    explanation: string,
    anchor: StepAnchor,
    opts: {
      current?: string | null;
      vars?: { name: string; value: string | number; highlight?: boolean }[];
      counters?: { label: string; value: string | number }[];
    } = {}
  ) => {
    steps.push({
      explanation,
      anchor,
      state: {
        type: 'tree',
        nodes: makeNodes(),
        pointers: opts.current ? [{ nodeId: opts.current, label: '▶ here' }] : [],
        counters: [{ label: 'call stack depth', value: stackDepth }, ...(opts.counters ?? [])],
      } as TreeState,
      variables: opts.vars,
    });
  };

  push(
    'Goal: max depth = the number of nodes on the longest root→leaf path. This attempt has no separate helper — self.maxDepth recurses directly, and both children plus 1+max(...) are combined INLINE in one return statement (left evaluates fully before right starts, since Python evaluates call arguments left to right). A null (missing) child counts as depth 0. Watch the "call stack depth" counter grow as we dive and shrink as we return.',
    { match: 'def maxDepth(self, root: Optional[TreeNode]) -> int:' },
    { vars: [{ name: 'root', value: 3 }] }
  );

  function dfs(id: string | null, side: string, parentId: string | null): number {
    // Base case: a null child contributes depth 0.
    if (id === null) {
      push(
        `${side} is null → base case "if not root: return 0". A missing node has depth 0, so we return 0 right away without recursing deeper.`,
        // nth 2: the actual return-0 statement; the 1st hit is a comment above ("...we return 0")
        { match: 'if not root:', to: { match: 'return 0', nth: 2 } },
        { current: parentId, vars: [{ name: 'node', value: 'null' }, { name: 'returns', value: 0, highlight: true }] }
      );
      return 0;
    }

    stackDepth++;
    const v = valueOf(id);
    colour[id] = 'active';
    push(
      `Call maxDepth(node ${v}) — push it on the call stack (depth now ${stackDepth}). Everything from here happens inline in one return: self.maxDepth(root.left) is evaluated first.`,
      { match: 'def maxDepth(self, root: Optional[TreeNode]) -> int:' },
      { current: id, vars: [{ name: 'node', value: v }] }
    );

    const left = dfs(nodeMap.get(id)!.leftId, `Left child of ${v}`, id);
    const right = dfs(nodeMap.get(id)!.rightId, `Right child of ${v}`, id);

    const depth = 1 + Math.max(left, right);
    colour[id] = 'visited';
    stackDepth--;
    push(
      `Both nested calls for node ${v} have returned: self.maxDepth(root.left)=${left}, self.maxDepth(root.right)=${right}. return 1+max(${left},${right}) = ${depth}. Pop it off the stack (depth now ${stackDepth}).`,
      { match: 'return 1+max(self.maxDepth(root.left),self.maxDepth(root.right))' },
      {
        current: id,
        vars: [
          { name: 'node', value: v },
          { name: 'left', value: left },
          { name: 'right', value: right },
          { name: 'return', value: depth, highlight: true },
        ],
      }
    );
    return depth;
  }

  const answer = dfs('n0', 'root', null);

  NODES.forEach((n) => (colour[n.id] = 'found'));
  push(
    `Every node has been visited and the recursion has fully unwound. The root returned ${answer}, so the maximum depth is ${answer} — the longest path 3 → 20 → 15 (or 7).`,
    { match: 'return 1+max(self.maxDepth(root.left),self.maxDepth(root.right))' },
    { vars: [{ name: 'maxDepth', value: answer, highlight: true }] }
  );

  return steps;
}

export const maximumDepthBinaryTreeMeta: AlgorithmMeta = {
  id: 'max-depth-of-binary-tree',
  lcNumber: 104,
  title: 'Maximum Depth of Binary Tree',
  difficulty: 'Easy',
  category: 'trees',
  tags: ['Tree', 'DFS', 'BFS', 'Recursion'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(h)',
  description: 'Given the root of a binary tree, return its maximum depth. The maximum depth is the number of nodes along the longest path from the root node down to the farthest leaf node.',
  examples: [
    {
      input: 'root = [3,9,20,null,null,15,7]',
      output: '3',
      explanation: 'The longest path is 3 → 20 → 15 (or 7), which has depth 3.',
    },
  ],
  constraints: [
    'The number of nodes in the tree is in the range [0, 10^4].',
    '-100 <= Node.val <= 100',
  ],
  hint: 'Use postorder DFS: recurse left and right children first, then return 1 + max(leftDepth, rightDepth). Base case: null node returns 0.',
  solutions: [
    {
      label: 'Postorder DFS (Recursive)',
      variant: 'postorder',
      generateSteps,
    },
  ],
};
