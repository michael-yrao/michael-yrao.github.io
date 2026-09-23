import { AlgorithmMeta, Step, StepAnchor, TreeNode, TreeState } from '../../core/models/algorithm.model';

// Traces cse-progress's isSubtree verbatim: a nested dfs(p,q) helper (matching isSameTree's
// three-way null/match/mismatch logic) plus an outer BFS that calls dfs whenever a node's
// value equals subRoot.val — same control flow as the earlier hand simulation, only anchors
// change.

// Root tree: [3, 4, 5, 1, 2]   subRoot = [4, 1, 2]
const NODES: Omit<TreeNode, 'state'>[] = [
  { id: 'n0', value: 3, leftId: 'n1', rightId: 'n2' },
  { id: 'n1', value: 4, leftId: 'n3', rightId: 'n4' },
  { id: 'n2', value: 5, leftId: null, rightId: null },
  { id: 'n3', value: 1, leftId: null, rightId: null },
  { id: 'n4', value: 2, leftId: null, rightId: null },
];

// subRoot tree (not rendered; compared against by value).
const SUB: Record<string, { val: number; left: string | null; right: string | null }> = {
  s0: { val: 4, left: 's1', right: 's2' },
  s1: { val: 1, left: null, right: null },
  s2: { val: 2, left: null, right: null },
};

function generateSteps(): Step[] {
  const steps: Step[] = [];
  const nodeMap = new Map(NODES.map((n) => [n.id, n]));
  const valueOf = (id: string) => nodeMap.get(id)!.value as number;
  const subVal = 4; // subRoot.val

  const colour: Record<string, TreeNode['state']> = {};
  const queue: string[] = ['n0'];

  const makeNodes = (): TreeNode[] =>
    NODES.map((n) => ({ ...n, state: colour[n.id] ?? 'default' }));

  const queueStr = () => '[' + queue.map((id) => valueOf(id)).join(', ') + ']';

  const push = (
    explanation: string,
    anchor: StepAnchor,
    opts: {
      current?: string | null;
      queueShown?: string;
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
        counters: [{ label: 'BFS queue', value: opts.queueShown ?? queueStr() }],
      } as TreeState,
      variables: opts.vars,
    });
  };

  push(
    'Plan (two phases): (1) BFS through the big tree to find any node whose value equals subRoot.val = 4; (2) from each such candidate, run the nested dfs(p,q) helper to check the WHOLE subtree matches. Start BFS: queue = deque([root]).',
    { match: 'queue = deque([root])' },
    { vars: [{ name: 'subRoot.val', value: subVal }, { name: 'queue', value: '[3]' }] }
  );

  // Phase 2 helper: compare root-tree node id against subRoot node sId.
  function dfs(id: string | null, sId: string | null, side: string, parentId: string | null): boolean {
    const sub = sId ? SUB[sId] : null;
    if (id === null && sub === null) {
      push(
        `dfs — ${side}: both sides are null → base case "if not p and not q: return True". Two empty spots match.`,
        // nth 1: dfs's own base-case return True; the 2nd hit is a comment, the 3rd the outer BFS's return on a full match
        { match: 'if not p and not q:', to: { match: 'return True', nth: 1 } },
        { current: parentId, vars: [{ name: 'p', value: 'null' }, { name: 'q', value: 'null' }, { name: 'match', value: 'True', highlight: true }] }
      );
      return true;
    }
    if (id === null || sub === null) {
      push(
        `dfs — ${side}: one side has a node and the other is null → "if p and q and p.val == q.val:" is False (p and q isn't both truthy) → else: return False.`,
        // nth 1: dfs's own else-branch return False; the 2nd hit is the outer function's final "return False"
        { match: 'if p and q and p.val == q.val:', to: { match: 'return False', nth: 1 } },
        { current: parentId, vars: [{ name: 'match', value: 'False', highlight: true }] }
      );
      return false;
    }
    const v = valueOf(id);
    colour[id] = 'comparing';
    push(
      `dfs — ${side}: compare ${v} (big tree) vs ${sub.val} (subRoot) → ${v === sub.val ? 'equal ✓, if p and q and p.val == q.val: True → recurse into both left and right (dfs(p.left,q.left) and dfs(p.right,q.right)).' : 'differ ✗, condition False → else: return False.'}`,
      v === sub.val
        ? { match: 'if p and q and p.val == q.val:', to: { match: 'return dfs(p.left,q.left) and dfs(p.right,q.right)' } }
        : { match: 'if p and q and p.val == q.val:', to: { match: 'return False', nth: 1 } },
      { current: id, vars: [{ name: 'p.val', value: v }, { name: 'q.val', value: sub.val }, { name: 'match', value: v === sub.val ? 'True' : 'False', highlight: true }] }
    );
    if (v !== sub.val) return false;
    const leftSame = dfs(nodeMap.get(id)!.leftId, sub.left, `left of ${v}`, id);
    const rightSame = dfs(nodeMap.get(id)!.rightId, sub.right, `right of ${v}`, id);
    return leftSame && rightSame;
  }

  let found = false;
  while (queue.length && !found) {
    const id = queue.shift()!;
    const v = valueOf(id);
    const isMatch = v === subVal;

    push(
      `currentNode = queue.popleft() → node ${v}. if currentNode.val == subRoot.val: ${isMatch ? `True (${v} == ${subVal}) — this is a candidate, launch dfs(currentNode, subRoot).` : `False (${v} != ${subVal}), it can't be the subtree root; we'll just enqueue its children and move on.`}`,
      { match: 'currentNode = queue.popleft()', to: { match: 'if currentNode.val == subRoot.val:' } },
      { current: id, queueShown: queueStr(), vars: [{ name: 'currentNode.val', value: v }, { name: 'subRoot.val', value: subVal }] }
    );

    if (isMatch) {
      const same = dfs(id, 's0', 'roots', null);
      if (same) {
        NODES.forEach((n) => {
          if (n.id === 'n1' || n.id === 'n3' || n.id === 'n4') colour[n.id] = 'found';
        });
        push(
          `dfs(currentNode, subRoot) returned True — the subtree rooted at node ${v} matches subRoot [4,1,2] exactly. if dfs(...): True → return True; we can stop searching.`,
          // nth 3: the outer function's "return True" on a full match; the 1st hit is dfs's own
          // base-case return True, the 2nd is a comment above ("...we just return True")
          { match: 'if dfs(currentNode, subRoot):', to: { match: 'return True', nth: 3 } },
          { current: id, vars: [{ name: 'result', value: 'True', highlight: true }] }
        );
        found = true;
        break;
      }
    }

    colour[id] = 'visited';
    const node = nodeMap.get(id)!;
    if (node.leftId) queue.push(node.leftId);
    if (node.rightId) queue.push(node.rightId);
    if (!isMatch) {
      push(
        `Not a candidate. if currentNode.left: queue.append(currentNode.left); if currentNode.right: queue.append(currentNode.right). Queue is now ${queueStr()}, loop again.`,
        { match: 'if currentNode.left:', to: { match: 'queue.append(currentNode.right)' } },
        { vars: [{ name: 'queue', value: queueStr() }] }
      );
    }
  }

  return steps;
}

export const subtreeOfAnotherTreeMeta: AlgorithmMeta = {
  id: 'subtree-of-another-tree',
  lcNumber: 572,
  title: 'Subtree of Another Tree',
  difficulty: 'Easy',
  category: 'trees',
  tags: ['Tree', 'DFS', 'String Matching'],
  timeComplexity: 'O(m·n)',
  spaceComplexity: 'O(m+n)',
  description: 'Given the roots of two binary trees root and subRoot, return true if there is a subtree of root with the same structure and node values as subRoot and false otherwise.',
  examples: [
    {
      input: 'root = [3,4,5,1,2], subRoot = [4,1,2]',
      output: 'true',
      explanation: 'The subtree rooted at node 4 in root matches subRoot exactly.',
    },
  ],
  constraints: [
    'The number of nodes in the root tree is in the range [1, 2000].',
    'The number of nodes in the subRoot tree is in the range [1, 1000].',
    '-10^4 <= root.val, subRoot.val <= 10^4',
  ],
  hint: 'BFS through root to find any node matching subRoot.val, then run isSameTree from that node. If isSameTree returns True, found the subtree.',
  solutions: [
    {
      label: 'BFS + DFS',
      variant: 'bfs-dfs',
      generateSteps,
    },
  ],
};
