import { AlgorithmMeta, Step, StepAnchor, TreeNode, TreeState } from '../../core/models/algorithm.model';

// Traces cse-progress's isBalanced verbatim: postorder DFS with a nonlocal isBalanced flag,
// left=dfs(root.left) then right=dfs(root.right), and the |left-right| > 1 check flips the
// flag but the recursion still runs to completion (no early exit) and always returns depth.

// Tree: [3, 9, 20, null, null, 15, 7]
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

  const colour: Record<string, TreeNode['state']> = {};
  let stackDepth = 0;
  let isBalanced = true;

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
          { label: 'isBalanced', value: String(isBalanced) },
        ],
      } as TreeState,
      variables: opts.vars,
    });
  };

  push(
    'A tree is height-balanced if at EVERY node |leftDepth − rightDepth| ≤ 1. We reuse the max-depth idea: postorder DFS returns each subtree’s depth, and along the way we flip a shared isBalanced flag to False the moment any node breaks the rule. Start with isBalanced = True.',
    { match: 'isBalanced = True' },
    { vars: [{ name: 'isBalanced', value: 'True' }] }
  );

  function dfs(id: string | null, side: string, parentId: string | null): number {
    if (id === null) {
      push(
        `${side} is null → base case "return 0". A missing subtree has depth 0.`,
        { match: 'if not root:', to: { match: 'return 0' } },
        { current: parentId, vars: [{ name: 'node', value: 'null' }, { name: 'returns', value: 0, highlight: true }] }
      );
      return 0;
    }

    stackDepth++;
    const v = valueOf(id);
    colour[id] = 'active';
    push(
      `Call dfs(node ${v}) — push on the call stack (depth now ${stackDepth}). Recurse LEFT first to get its left subtree’s depth.`,
      { match: 'def dfs(root):' },
      { current: id, vars: [{ name: 'node', value: v }] }
    );

    const left = dfs(nodeMap.get(id)!.leftId, `Left child of ${v}`, id);

    colour[id] = 'active';
    push(
      `Back at node ${v}. Left depth = ${left}. Now recurse RIGHT.`,
      { match: 'right=dfs(root.right)' },
      { current: id, vars: [{ name: 'node', value: v }, { name: 'left', value: left, highlight: true }] }
    );

    const right = dfs(nodeMap.get(id)!.rightId, `Right child of ${v}`, id);

    const diff = Math.abs(left - right);
    const broke = diff > 1;
    if (broke) isBalanced = false;
    const depth = 1 + Math.max(left, right);
    colour[id] = 'visited';
    stackDepth--;
    push(
      `Node ${v}: left=${left}, right=${right}. |${left} − ${right}| = ${diff} ${
        broke ? '> 1 → this node is UNBALANCED, set isBalanced = False.' : '≤ 1 → still balanced here.'
      } Return depth = 1 + max(${left}, ${right}) = ${depth}.`,
      { match: 'if abs(left - right) > 1:', to: { match: 'return 1 + max(left,right)' } },
      {
        current: id,
        vars: [
          { name: 'node', value: v },
          { name: 'left', value: left },
          { name: 'right', value: right },
          { name: '|left−right|', value: diff, highlight: broke },
          { name: 'return', value: depth, highlight: true },
        ],
      }
    );
    return depth;
  }

  dfs('n0', 'root', null);

  NODES.forEach((n) => (colour[n.id] = isBalanced ? 'found' : 'visited'));
  push(
    `Recursion finished. No node ever broke the rule, so isBalanced is still ${String(isBalanced)} — the tree IS height-balanced.`,
    { match: 'return isBalanced' },
    { vars: [{ name: 'isBalanced', value: String(isBalanced), highlight: true }] }
  );

  return steps;
}

export const balancedBinaryTreeMeta: AlgorithmMeta = {
  id: 'balanced-binary-tree',
  lcNumber: 110,
  title: 'Balanced Binary Tree',
  difficulty: 'Easy',
  category: 'trees',
  tags: ['Tree', 'DFS', 'Recursion'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(h)',
  description: 'Given a binary tree, determine if it is height-balanced. A height-balanced binary tree is one in which the depth of the two subtrees of every node never differs by more than one.',
  examples: [
    {
      input: 'root = [3,9,20,null,null,15,7]',
      output: 'true',
      explanation: 'Node 3: |depth(9) - depth(20)| = |1 - 2| = 1 ≤ 1. Balanced.',
    },
  ],
  constraints: [
    'The number of nodes in the tree is in the range [0, 5000].',
    '-10^4 <= Node.val <= 10^4',
  ],
  hint: 'Use postorder DFS. At each node compute left and right depths. If |left - right| > 1, set isBalanced = False. Track the boolean with nonlocal.',
  solutions: [
    {
      label: 'Postorder DFS',
      variant: 'postorder',
      generateSteps,
    },
  ],
};
