import { AlgorithmMeta, SolutionVariant, Step, TreeNode, TreeNodeState, ProblemExample } from '../../core/models/algorithm.model';

// Traces cse-progress's maxPathSum verbatim: postorder DFS with a nonlocal maxPath, clamping
// each side to 0 before computing the through-node candidate, same control flow as the
// earlier hand simulation — only anchors and the odd `leftPath = max(dfs(node.left),0)`
// (no space before the 0) spacing change here.

type NodeDef = { val: number; left: string | null; right: string | null };
const NODES: Record<string, NodeDef> = {
  a: { val: -10, left: 'b', right: 'c' },
  b: { val: 9, left: null, right: null },
  c: { val: 20, left: 'd', right: 'e' },
  d: { val: 15, left: null, right: null },
  e: { val: 7, left: null, right: null },
};
const ROOT = 'a';
const BEST_PATH = new Set(['d', 'c', 'e']); // 15 -> 20 -> 7

function generateSteps(): Step[] {
  const steps: Step[] = [];
  const stateMap: Record<string, TreeNodeState> = {};
  Object.keys(NODES).forEach((id) => (stateMap[id] = 'default'));
  let maxPath = -Infinity;

  const treeNodes = (): TreeNode[] =>
    Object.entries(NODES).map(([id, d]) => ({
      id,
      value: d.val,
      state: stateMap[id],
      leftId: d.left,
      rightId: d.right,
    }));

  const buildState = (counters: { label: string; value: number | string }[]): Step['state'] => ({
    type: 'tree',
    nodes: treeNodes(),
    counters,
  });

  const fmtMax = () => (maxPath === -Infinity ? '-∞' : `${maxPath}`);

  steps.push({
    explanation:
      'Maximum path sum — a path is any node-to-node route (need not pass the root). Postorder DFS: each node computes the best downward path from its left and right (clamping negatives to 0). It updates a global max with node.val + left + right (a path that "peaks" here), but only returns node.val + max(left, right) up, since a parent can extend just one side.',
    anchor: { match: 'maxPath = -math.inf' },
    state: buildState([{ label: 'maxPath', value: fmtMax() }]),
    variables: [],
  });

  const dfs = (id: string | null, label: string): number => {
    if (id === null) {
      steps.push({
        explanation: `${label}: null child → return 0 (contributes nothing).`,
        anchor: { match: 'if not node:', to: { match: 'return 0' } },
        state: buildState([{ label: 'maxPath', value: fmtMax() }]),
        variables: [{ name: 'return', value: 0 }],
      });
      return 0;
    }

    const d = NODES[id];
    stateMap[id] = 'active';
    steps.push({
      explanation: `${label}: enter node ${d.val}. Recurse left, then right (postorder — children before parent).`,
      anchor: { match: 'def dfs(node):' },
      state: buildState([{ label: 'maxPath', value: fmtMax() }, { label: 'at node', value: d.val }]),
      variables: [{ name: 'node.val', value: d.val, highlight: true }],
    });

    const rawLeft = dfs(d.left, `${d.val}.left`);
    const rawRight = dfs(d.right, `${d.val}.right`);
    const leftPath = Math.max(rawLeft, 0);
    const rightPath = Math.max(rawRight, 0);

    stateMap[id] = 'active';
    const candidate = d.val + leftPath + rightPath;
    const prevMax = maxPath;
    maxPath = Math.max(maxPath, candidate);
    const ret = d.val + Math.max(leftPath, rightPath);
    stateMap[id] = 'visited';

    steps.push({
      explanation: `${label}: leftPath = max(${rawLeft}, 0) = ${leftPath}, rightPath = max(${rawRight}, 0) = ${rightPath}. Split candidate = ${d.val} + ${leftPath} + ${rightPath} = ${candidate}. maxPath = max(${prevMax === -Infinity ? '-∞' : prevMax}, ${candidate}) = ${fmtMax()}. Return ${d.val} + max(${leftPath}, ${rightPath}) = ${ret} (only one side goes up).`,
      anchor: { match: 'leftPath = max(dfs(node.left),0)', to: { match: 'return node.val + max(leftPath, rightPath)' } },
      state: buildState([
        { label: 'maxPath', value: fmtMax() },
        { label: 'candidate', value: candidate },
        { label: 'return', value: ret },
      ]),
      variables: [
        { name: 'leftPath', value: leftPath },
        { name: 'rightPath', value: rightPath },
        { name: 'candidate', value: candidate, highlight: candidate === maxPath },
        { name: 'return', value: ret, highlight: true },
      ],
    });

    return ret;
  };

  dfs(ROOT, 'root');

  // Highlight the winning path.
  Object.keys(NODES).forEach((id) => (stateMap[id] = BEST_PATH.has(id) ? 'found' : 'visited'));
  steps.push({
    explanation: `DFS complete. maxPath = ${fmtMax()}, achieved by the highlighted path 15 → 20 → 7 (peaking at node 20: 15 + 20 + 7 = 42). Return ${fmtMax()}.`,
    anchor: { match: 'return maxPath # type: ignore' },
    state: buildState([{ label: 'answer', value: fmtMax() }]),
    variables: [{ name: 'return', value: maxPath, highlight: true }],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Postorder DFS (global max)',
  variant: 'postorder',
  generateSteps,
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(h)',
};

export const binaryTreeMaximumPathSumMeta: AlgorithmMeta = {
  id: 'binary-tree-maximum-path-sum',
  lcNumber: 124,
  title: 'Binary Tree Maximum Path Sum',
  difficulty: 'Hard',
  category: 'trees',
  tags: ['Tree', 'DFS', 'Dynamic Programming', 'Recursion'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(h)',
  description:
    'A path is a sequence of nodes connected by edges, each node used at most once; it need not pass through the root. Return the maximum path sum of any non-empty path.',
  examples: [
    { input: 'root = [1,2,3]', output: '6', explanation: '2 → 1 → 3' },
    { input: 'root = [-10,9,20,null,null,15,7]', output: '42', explanation: '15 → 20 → 7' },
  ] as ProblemExample[],
  constraints: ['The number of nodes is in [1, 3×10⁴].', '-1000 ≤ Node.val ≤ 1000'],
  hint: 'Postorder DFS. Each call returns the best single downward extension (node.val + max(left, right), negatives clamped to 0), but updates a global answer with the through-path node.val + left + right that peaks at this node.',
  solutions: [solution],
};
