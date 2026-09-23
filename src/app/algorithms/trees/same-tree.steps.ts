import { AlgorithmMeta, Step, StepAnchor, TreeNode, TreeState } from '../../core/models/algorithm.model';

// Traces cse-progress's isSameTree verbatim: no separate nested helper — self.isSameTree
// recurses directly, and both children are chained in ONE return with `and` (short-circuit:
// the right call only runs if the left one returned True). Same control flow as the earlier
// hand simulation; the "back at node, now recurse right" step is dropped since there's no
// distinct source line for it — everything happens inline in the one return statement.

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
        pointers: opts.current ? [{ nodeId: opts.current, label: '▶ comparing' }] : [],
        counters: [{ label: 'call stack depth', value: stackDepth }],
      } as TreeState,
      variables: opts.vars,
    });
  };

  push(
    'Two trees are "the same" if they have identical structure AND identical values. We walk both at once with PREorder DFS (check the node first, then its children). Here p = [1,2,3] and q = [1,2,3]. self.isSameTree(p.left,q.left) and self.isSameTree(p.right,q.right) — the AND short-circuits, so right is only evaluated if left comes back True. We compare position by position; the first mismatch returns False.',
    { match: 'def isSameTree(self, p: Optional[TreeNode], q: Optional[TreeNode]) -> bool:' },
    { vars: [{ name: 'p', value: '[1,2,3]' }, { name: 'q', value: '[1,2,3]' }] }
  );

  // Returns true if the subtrees rooted here are identical. Since p and q are
  // identical in this example, we drive the walk off the shared node ids.
  function dfs(id: string | null, side: string, parentId: string | null): boolean {
    if (id === null) {
      push(
        `${side}: p and q are BOTH null → base case "if not p and not q: return True". Two empty subtrees are trivially identical.`,
        { match: 'if not p and not q:', to: { match: 'return True' } },
        { current: parentId, vars: [{ name: 'p', value: 'null' }, { name: 'q', value: 'null' }, { name: 'returns', value: 'True', highlight: true }] }
      );
      return true;
    }

    stackDepth++;
    const v = valueOf(id);
    colour[id] = 'active';
    push(
      `Compare ${side}: p.val = ${v} and q.val = ${v} → equal ✓. if p and q and p.val == q.val: True → return self.isSameTree(p.left,q.left) and self.isSameTree(p.right,q.right) — left is evaluated first (call stack depth now ${stackDepth}).`,
      { match: 'if p and q and p.val == q.val:', to: { match: 'return self.isSameTree(p.left, q.left) and self.isSameTree(p.right, q.right)' } },
      { current: id, vars: [{ name: 'p.val', value: v }, { name: 'q.val', value: v }, { name: 'match', value: 'True', highlight: true }] }
    );

    const leftSame = dfs(nodeMap.get(id)!.leftId, `Left children of ${v}`, id);
    const rightSame = dfs(nodeMap.get(id)!.rightId, `Right children of ${v}`, id);

    const same = leftSame && rightSame;
    colour[id] = 'visited';
    stackDepth--;
    push(
      `Both nested calls for node ${v} have returned: leftSame=${String(leftSame)}, rightSame=${String(rightSame)} (evaluated because leftSame was True — AND short-circuits otherwise). Return ${String(leftSame)} and ${String(rightSame)} = ${String(same)} up to the caller.`,
      { match: 'return self.isSameTree(p.left, q.left) and self.isSameTree(p.right, q.right)' },
      { current: id, vars: [{ name: 'node', value: v }, { name: 'return', value: String(same), highlight: true }] }
    );
    return same;
  }

  const result = dfs('n0', 'root', null);

  NODES.forEach((n) => (colour[n.id] = result ? 'found' : 'visited'));
  push(
    `Every position matched and the recursion returned ${String(result)} all the way to the root, so the trees are identical → isSameTree returns ${String(result)}.`,
    { match: 'return self.isSameTree(p.left, q.left) and self.isSameTree(p.right, q.right)' },
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
      variant: 'preorder',
      generateSteps,
    },
  ],
};
