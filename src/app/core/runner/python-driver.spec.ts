/// <reference types="node" />
import { spawnSync } from 'node:child_process';

import { PracticeEntry, ResultSpec, TypeSpec } from '../models/practice.model';
import { PYTHON_DRIVER } from './python-driver';
import { CaseOutcome, RunCase, buildCaseSpec } from './runner.model';

/** Loads the driver exactly as the worker does, defines the solution, runs one case. */
const HARNESS = [
  'import json, sys',
  'payload = json.load(sys.stdin)',
  'exec(payload["driver"], globals())',
  'error = define_solution(payload["code"])',
  'print(json.dumps({"status": "error", "kind": "exception", "message": error, "stdout": ""}) if error else run_case(payload["spec"]))',
].join('\n');

/** Loads the driver exactly as the worker does and runs `code` through `run_free`. */
const FREE_HARNESS = [
  'import json, sys',
  'payload = json.load(sys.stdin)',
  'exec(payload["driver"], globals())',
  'print(run_free(payload["code"]))',
].join('\n');

/** Like HARNESS, but runs several cases in one process, one outcome per output line. */
const SEQUENCE_HARNESS = [
  'import json, sys',
  'payload = json.load(sys.stdin)',
  'exec(payload["driver"], globals())',
  'error = define_solution(payload["code"])',
  'assert not error, error',
  'for spec in payload["specs"]:',
  '    print(run_case(spec))',
].join('\n');

const IS_PYTHON_AVAILABLE = spawnSync('python', ['--version']).status === 0;

function runCase(code: string, spec: string): CaseOutcome {
  const run = spawnSync('python', ['-c', HARNESS], {
    input: JSON.stringify({ driver: PYTHON_DRIVER, code, spec }),
    encoding: 'utf8',
  });
  if (run.status !== 0) throw new Error(run.stderr);
  return JSON.parse(run.stdout) as CaseOutcome;
}

function runCaseSequence(code: string, specs: readonly string[]): CaseOutcome[] {
  const run = spawnSync('python', ['-c', SEQUENCE_HARNESS], {
    input: JSON.stringify({ driver: PYTHON_DRIVER, code, specs }),
    encoding: 'utf8',
  });
  if (run.status !== 0) throw new Error(run.stderr);
  return run.stdout
    .trim()
    .split('\n')
    .map((line) => JSON.parse(line) as CaseOutcome);
}

function runFree(code: string): { stdout: string; error: string } {
  const run = spawnSync('python', ['-c', FREE_HARNESS], {
    input: JSON.stringify({ driver: PYTHON_DRIVER, code }),
    encoding: 'utf8',
  });
  if (run.status !== 0) throw new Error(run.stderr);
  return JSON.parse(run.stdout) as { stdout: string; error: string };
}

interface Row {
  readonly name: string;
  readonly code: string;
  readonly entry: PracticeEntry;
  readonly testCase: RunCase;
  readonly expected: unknown;
  readonly types?: TypeSpec;
  readonly result?: ResultSpec;
}

const LIST_NODE_CLASS = `
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next
`;

const TREE_NODE_CLASS = `
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right
`;

const ROWS: readonly Row[] = [
  {
    name: 'list-node round trip, on the driver class when the code defines none',
    code: `
class Solution:
    def reverseList(self, head):
        previous = None
        while head:
            head.next, previous, head = previous, head, head.next
        return previous
`,
    entry: { className: 'Solution', method: 'reverseList' },
    types: { args: ['list-node'], result: 'list-node' },
    testCase: { args: [[1, 2, 3]] },
    expected: [3, 2, 1],
  },
  {
    name: "the learner's own ListNode class is the one built",
    code: `${LIST_NODE_CLASS}
class Solution:
    def isOwnClass(self, head):
        return isinstance(head, ListNode) and isinstance(head.next, ListNode)
`,
    entry: { className: 'Solution', method: 'isOwnClass' },
    types: { args: ['list-node'], result: null },
    testCase: { args: [[1, 2]] },
    expected: true,
  },
  {
    name: 'a signature annotating Optional[ListNode] runs without the code defining ListNode',
    code: `
from typing import Optional

class Solution:
    def firstValue(self, head: Optional[ListNode]) -> int:
        return head.val
`,
    entry: { className: 'Solution', method: 'firstValue' },
    types: { args: ['list-node'], result: null },
    testCase: { args: [[7, 8]] },
    expected: 7,
  },
  {
    name: 'list-node-cycle: the tail points at node pos',
    code: `${LIST_NODE_CLASS}
class Solution:
    def hasCycle(self, head):
        slow = fast = head
        while fast and fast.next:
            slow, fast = slow.next, fast.next.next
            if slow is fast:
                return True
        return False
`,
    entry: { className: 'Solution', method: 'hasCycle' },
    types: { args: ['list-node-cycle'], result: null },
    testCase: { args: [[[3, 2, 0, -4], 1]] },
    expected: true,
  },
  {
    name: 'random-list: random pointers go in and come out as indexes',
    code: `
class Node:
    def __init__(self, x, next=None, random=None):
        self.val = x
        self.next = next
        self.random = random

class Solution:
    def copyRandomList(self, head):
        copies = {None: None}
        node = head
        while node:
            copies[node] = Node(node.val)
            node = node.next
        node = head
        while node:
            copies[node].next = copies[node.next]
            copies[node].random = copies[node.random]
            node = node.next
        return copies[head]
`,
    entry: { className: 'Solution', method: 'copyRandomList' },
    types: { args: ['random-list'], result: 'random-list' },
    testCase: { args: [[[7, null], [13, 0], [11, 4], [10, 2], [1, 0]]] },
    expected: [[7, null], [13, 0], [11, 4], [10, 2], [1, 0]],
  },
  {
    name: 'tree-node round trip keeps null gaps and trims trailing nulls',
    code: `${TREE_NODE_CLASS}
class Solution:
    def invertTree(self, root):
        if root:
            root.left, root.right = self.invertTree(root.right), self.invertTree(root.left)
        return root
`,
    entry: { className: 'Solution', method: 'invertTree' },
    types: { args: ['tree-node'], result: 'tree-node' },
    testCase: { args: [[1, null, 2, 3]] },
    expected: [1, 2, null, null, 3],
  },
  {
    name: 'tree-node: two parents sharing one child is a DAG, not a cycle',
    code: `${TREE_NODE_CLASS}
class Solution:
    def shared(self):
        child = TreeNode(0)
        return TreeNode(0, child, child)
`,
    entry: { className: 'Solution', method: 'shared' },
    types: { args: [], result: 'tree-node' },
    testCase: { args: [] },
    expected: [0, 0, 0],
  },
  {
    name: 'tree-value: arguments name nodes by value, the result decodes to .val',
    code: `${TREE_NODE_CLASS}
class Solution:
    def lowestCommonAncestor(self, root, p, q):
        if root is None or root is p or root is q:
            return root
        left = self.lowestCommonAncestor(root.left, p, q)
        right = self.lowestCommonAncestor(root.right, p, q)
        return root if left and right else left or right
`,
    entry: { className: 'Solution', method: 'lowestCommonAncestor' },
    types: { args: ['tree-node', 'tree-value', 'tree-value'], result: 'tree-value' },
    testCase: { args: [[3, 5, 1, 6, 2, 0, 8, null, null, 7, 4], 5, 1] },
    expected: 3,
  },
  {
    name: 'graph-node: a cloned graph decodes to an equal adjacency list',
    code: `
class Solution:
    def cloneGraph(self, node):
        if node is None:
            return None
        copies = {node: type(node)(node.val)}
        stack = [node]
        while stack:
            current = stack.pop()
            for neighbour in current.neighbors:
                if neighbour not in copies:
                    copies[neighbour] = type(neighbour)(neighbour.val)
                    stack.append(neighbour)
                copies[current].neighbors.append(copies[neighbour])
        return copies[node]
`,
    entry: { className: 'Solution', method: 'cloneGraph' },
    types: { args: ['graph-node'], result: 'graph-node' },
    testCase: { args: [[[2, 4], [1, 3], [2, 4], [1, 3]]] },
    expected: [[2, 4], [1, 3], [2, 4], [1, 3]],
  },
  {
    name: 'number-inf: infinities in the result decode to strings, nested lists included',
    code: `
class Solution:
    def distances(self, n):
        return [-inf, 2, [inf, True]]
`,
    entry: { className: 'Solution', method: 'distances' },
    types: { args: [null], result: 'number-inf' },
    testCase: { args: [3] },
    expected: ['-Infinity', 2, ['Infinity', true]],
  },
  {
    name: 'result arg: the mutated argument is what is compared',
    code: `
class Solution:
    def sortColors(self, nums):
        nums.sort()
`,
    entry: { className: 'Solution', method: 'sortColors' },
    result: { kind: 'arg', index: 0 },
    testCase: { args: [[2, 0, 2, 1, 1, 0]] },
    expected: [0, 0, 1, 1, 2, 2],
  },
  {
    name: 'result arg-prefix: only the first k items of the argument are compared',
    code: `
class Solution:
    def removeDuplicates(self, nums):
        write = 0
        for value in nums:
            if write == 0 or value != nums[write - 1]:
                nums[write] = value
                write += 1
        return write
`,
    entry: { className: 'Solution', method: 'removeDuplicates' },
    result: { kind: 'arg-prefix', index: 0 },
    testCase: { args: [[0, 0, 1, 1, 1, 2, 2, 3, 3, 4]] },
    expected: [0, 1, 2, 3, 4],
  },
  {
    name: 'ops: the first op constructs, the outputs of the rest come back as a list',
    code: `
class MinStack:
    def __init__(self):
        self.items = []

    def push(self, value):
        self.items.append(value)

    def pop(self):
        self.items.pop()

    def getMin(self):
        return min(self.items)
`,
    entry: { className: 'MinStack', method: 'push', kind: 'ops' },
    testCase: {
      ops: ['MinStack', 'push', 'push', 'getMin', 'pop', 'getMin'],
      args: [[], [3], [1], [], [], []],
    },
    expected: [null, null, null, 1, null, 3],
  },
  {
    name: 'list-node-list: each inner array becomes a linked list',
    code: `${LIST_NODE_CLASS}
class Solution:
    def mergeKLists(self, lists):
        values = sorted(node.val for head in lists for node in self.walk(head))
        dummy = tail = ListNode()
        for value in values:
            tail.next = ListNode(value)
            tail = tail.next
        return dummy.next

    def walk(self, head):
        while head:
            yield head
            head = head.next
`,
    entry: { className: 'Solution', method: 'mergeKLists' },
    types: { args: ['list-node-list'], result: 'list-node' },
    testCase: { args: [[[1, 4, 5], [1, 3, 4], [2, 6]]] },
    expected: [1, 1, 2, 3, 4, 4, 5, 6],
  },
  ...[
    { name: 'list-node-ref: the cycle entry node decodes to its index', pos: 1, expected: 1 },
    { name: 'list-node-ref: no cycle decodes None to null', pos: -1, expected: null },
  ].map(({ name, pos, expected }) => ({
    name,
    code: `${LIST_NODE_CLASS}
class Solution:
    def detectCycle(self, head):
        seen = set()
        while head:
            if head in seen:
                return head
            seen.add(head)
            head = head.next
        return None
`,
    entry: { className: 'Solution', method: 'detectCycle' },
    types: { args: ['list-node-cycle'], result: 'list-node-ref' } as TypeSpec,
    testCase: { args: [pos === 1 ? [[3, 2, 0, -4], 1] : [[1, 2], -1]] },
    expected,
  })),
  {
    name: 'judge: isBadVersion is bound for the case from the registry',
    code: `
class Solution:
    def firstBadVersion(self, n):
        low, high = 1, n
        while low < high:
            mid = (low + high) // 2
            if isBadVersion(mid):
                high = mid
            else:
                low = mid + 1
        return low
`,
    entry: { className: 'Solution', method: 'firstBadVersion' },
    testCase: { args: [5], judge: { isBadVersion: 4 } },
    expected: 4,
  },
  {
    name: "nary-node: built with the learner's positional Node, children come back in level order",
    code: `
class Node:
    def __init__(self, val, children=None):
        self.val = val
        self.children = children

class Solution:
    def cloneTree(self, root):
        if root is None:
            return None
        return Node(root.val, [self.cloneTree(child) for child in root.children or []])
`,
    entry: { className: 'Solution', method: 'cloneTree' },
    types: { args: ['nary-node'], result: 'nary-node' },
    testCase: { args: [[1, null, 3, 2, 4, null, 5, 6]] },
    expected: [1, null, 3, 2, 4, null, 5, 6],
  },
  {
    name: 'tree-node-next: each level is read along .next and closed with "#"',
    code: `
class Node:
    def __init__(self, val=0, left=None, right=None, next=None):
        self.val = val
        self.left = left
        self.right = right
        self.next = next

class Solution:
    def connect(self, root):
        level = root
        while level and level.left:
            node = level
            while node:
                node.left.next = node.right
                if node.next:
                    node.right.next = node.next.left
                node = node.next
            level = level.left
        return root
`,
    entry: { className: 'Solution', method: 'connect' },
    types: { args: ['tree-node-next'], result: 'tree-node-next' },
    testCase: { args: [[1, 2, 3, 4, 5, 6, 7]] },
    expected: [1, '#', 2, 3, '#', 4, 5, 6, 7, '#'],
  },
  {
    name: 'tree-node-list: a returned list of trees decodes each root as a tree-node',
    code: `${TREE_NODE_CLASS}
class Solution:
    def generateTrees(self, n):
        def build(low, high):
            if low > high:
                return [None]
            return [TreeNode(i, left, right) for i in range(low, high + 1) for left in build(low, i - 1) for right in build(i + 1, high)]
        return build(1, n)
`,
    entry: { className: 'Solution', method: 'generateTrees' },
    types: { args: [null], result: 'tree-node-list' },
    testCase: { args: [2] },
    expected: [[1, null, 2], [2, 1]],
  },
  {
    name: 'list-node-list as a result: each returned head decodes, None becomes []',
    code: `${LIST_NODE_CLASS}
class Solution:
    def splitListToParts(self, head, k):
        length, node = 0, head
        while node:
            length, node = length + 1, node.next
        size, extra = divmod(length, k)
        parts, node = [], head
        for i in range(k):
            part = node
            for _ in range(size - 1 + (i < extra)):
                node = node.next
            if node:
                node.next, node = None, node.next
            parts.append(part)
        return parts
`,
    entry: { className: 'Solution', method: 'splitListToParts' },
    types: { args: ['list-node', null], result: 'list-node-list' },
    testCase: { args: [[1, 2, 3], 5] },
    expected: [[1], [2], [3], [], []],
  },
  {
    name: 'ops types: the constructor argument goes through types.args, method args stay raw',
    code: `${LIST_NODE_CLASS}
class Solution:
    def __init__(self, head):
        self.head = head

    def getRandom(self):
        return self.head.val
`,
    entry: { className: 'Solution', method: 'getRandom', kind: 'ops' },
    types: { args: ['list-node'], result: null },
    testCase: { ops: ['Solution', 'getRandom'], args: [[[1, 2, 3]], []] },
    expected: [null, 1],
  },
  {
    name: 'round-trip: decode(encode(...)), through dated method names and tree codecs',
    code: `${TREE_NODE_CLASS}
class Codec:
    def serialize_20261001(self, root):
        if root is None:
            return "#"
        return ",".join([str(root.val), self.serialize_20261001(root.left), self.serialize_20261001(root.right)])

    def deserialize(self, data):
        tokens = iter(data.split(","))
        def build():
            token = next(tokens)
            if token == "#":
                return None
            node = TreeNode(int(token))
            node.left = build()
            node.right = build()
            return node
        return build()
`,
    entry: { className: 'Codec', method: 'serialize', kind: 'round-trip', encode: 'serialize', decode: 'deserialize' },
    types: { args: ['tree-node'], result: 'tree-node' },
    testCase: { args: [[1, 2, 3, null, null, 4, 5]] },
    expected: [1, 2, 3, null, null, 4, 5],
  },
  {
    name: "the prelude imports LeetCode's modules without shadowing a builtin",
    code: `
class Solution:
    def usePrelude(self, nums: List[int]) -> int:
        queue = deque(nums)
        counts = defaultdict(int)
        for value in nums:
            counts[value] += 1
        heap = []
        for value in nums:
            heappush(heap, value)

        @lru_cache(None)
        def double(value):
            return value * 2

        first = queue.popleft()
        return [double(first), counts[first], heap[0], bisect_left([1, 3, 5], 3), inf > 10**9, pow(2, 10, 1000)]
`,
    entry: { className: 'Solution', method: 'usePrelude' },
    testCase: { args: [[4, 2, 4]] },
    expected: [8, 2, 2, 1, true, 24],
  },
];

describe('PYTHON_DRIVER', () => {
  it.skipIf(!IS_PYTHON_AVAILABLE).each(ROWS)('$name', ({ code, entry, types, result, testCase, expected }) => {
    const request = { id: 0, code, entry, types, result, cases: [] };

    const outcome = runCase(code, buildCaseSpec(request, testCase));

    expect(outcome).toMatchObject({ status: 'ok', hasJson: true });
    expect(outcome.status === 'ok' ? outcome.gotJson : null).toEqual(expected);
  });
});

describe('run_case errors', () => {
  const ERROR_ROWS: readonly {
    name: string;
    code: string;
    method: string;
    types?: TypeSpec;
    contains: readonly string[];
    excludes: readonly string[];
    endsWith: string;
  }[] = [
    {
      name: 'an exception in learner code shows the learner traceback',
      code: 'class Solution:\n    def m(self):\n        for a, b in range(3): pass',
      method: 'm',
      contains: ['Traceback (most recent call last):', 'File "solution.py", line 3, in m', 'for a, b in range(3)'],
      excludes: ['_invoke'],
      endsWith: 'TypeError: cannot unpack non-iterable int object',
    },
    {
      name: 'an error with no learner frame shows only the exception line',
      code: 'class Solution:\n    pass',
      method: 'missing',
      contains: [],
      excludes: ['Traceback'],
      endsWith: 'AttributeError: Solution has no method missing',
    },
    {
      name: 'tree-node: a returned tree that loops back is a codec error',
      code: 'class Node:\n    def __init__(self):\n        self.val = 1\n        self.left = self\n        self.right = None\n\nclass Solution:\n    def m(self):\n        return Node()',
      method: 'm',
      types: { args: [], result: 'tree-node' },
      contains: ['tree-node: the returned tree loops back'],
      excludes: [],
      endsWith: 'the returned tree loops back',
    },
    {
      name: 'tree-node-next: a returned tree that loops back is a codec error',
      code: 'class Node:\n    def __init__(self):\n        self.val = 1\n        self.left = self\n        self.right = None\n        self.next = None\n\nclass Solution:\n    def m(self):\n        return Node()',
      method: 'm',
      types: { args: [], result: 'tree-node-next' },
      contains: ['tree-node-next: the returned tree loops back'],
      excludes: [],
      endsWith: 'the returned tree loops back',
    },
  ];

  it.skipIf(!IS_PYTHON_AVAILABLE).each(ERROR_ROWS)('$name', ({ code, method, types, contains, excludes, endsWith }) => {
    const entry: PracticeEntry = { className: 'Solution', method };
    const request = { id: 0, code, entry, types, result: undefined, cases: [] };

    const outcome = runCase(code, buildCaseSpec(request, { args: [] }));

    expect(outcome.status).toBe('error');
    const message = outcome.status === 'error' ? outcome.message : '';
    contains.forEach((text) => expect(message).toContain(text));
    excludes.forEach((text) => expect(message).not.toContain(text));
    expect(message.endsWith(endsWith)).toBe(true);
  });
});

describe('codec errors and state between cases', () => {
  const NEXT_NODE_CLASS = `
class Node:
    def __init__(self, val=0, left=None, right=None, next=None):
        self.val = val
        self.left = left
        self.right = right
        self.next = next
`;

  it.skipIf(!IS_PYTHON_AVAILABLE)('tree-node-next: a next chain that loops back is a codec error', () => {
    const code = `${NEXT_NODE_CLASS}
class Solution:
    def connect(self, root):
        root.next = root
        return root
`;
    const entry: PracticeEntry = { className: 'Solution', method: 'connect' };
    const types: TypeSpec = { args: ['tree-node-next'], result: 'tree-node-next' };
    const request = { id: 0, code, entry, types, result: undefined, cases: [] };

    const outcome = runCase(code, buildCaseSpec(request, { args: [[1, 2, 3]] }));

    expect(outcome.status).toBe('error');
    expect(outcome.status === 'error' ? outcome.message : '').toContain('tree-node-next: the next pointers loop back');
  });

  it.skipIf(!IS_PYTHON_AVAILABLE)('judge: a case with no judge does not see the previous case isBadVersion', () => {
    const code = `
class Solution:
    def firstBadVersion(self, n):
        return n if isBadVersion(n) else 0
`;
    const entry: PracticeEntry = { className: 'Solution', method: 'firstBadVersion' };
    const request = { id: 0, code, entry, types: undefined, result: undefined, cases: [] };
    const specs = [
      buildCaseSpec(request, { args: [5], judge: { isBadVersion: 4 } }),
      buildCaseSpec(request, { args: [5] }),
    ];

    const [first, second] = runCaseSequence(code, specs);

    expect(first.status).toBe('ok');
    expect(second.status).toBe('error');
    expect(second.status === 'error' ? second.message : '').toContain('NameError');
  });
});

describe('run_free', () => {
  const FREE_ROWS: readonly { name: string; code: string; stdout: string; error: RegExp | null }[] = [
    { name: 'prints go to stdout with no error', code: 'print("hi")\nprint(sum(range(4)))', stdout: 'hi\n6\n', error: null },
    {
      name: 'an exception reports the error with the stdout printed so far',
      code: 'print("before")\nraise ValueError("boom")',
      stdout: 'before\n',
      error: /ValueError: boom/,
    },
    { name: 'a syntax error reports the error', code: 'def broken(:\n    pass', stdout: '', error: /SyntaxError/ },
    {
      name: 'a raise inside a function shows the learner source line',
      code: 'def f():\n    raise ValueError("deep")\nf()',
      stdout: '',
      error: /raise ValueError\("deep"\)/,
    },
  ];

  it.skipIf(!IS_PYTHON_AVAILABLE).each(FREE_ROWS)('$name', ({ code, stdout, error }) => {
    const outcome = runFree(code);

    expect(outcome.stdout).toBe(stdout);
    if (error === null) {
      expect(outcome.error).toBe('');
      return;
    }
    expect(outcome.error).toMatch(error);
  });
});
