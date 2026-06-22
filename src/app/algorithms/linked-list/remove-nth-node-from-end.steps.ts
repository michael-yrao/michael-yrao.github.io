import { AlgorithmMeta, SolutionVariant, Step, ProblemExample, LinkedListNode } from '../../core/models/algorithm.model';

// Solutions sourced from cse-review: dsa/leetcode/linked_list/19_remove_nth_node_from_end_of_list.py
// (removeNthFromEndTwoIteration = Two-Pass, removeNthFromEnd = One-Pass Two-Pointer, removeNthFromEndRecursion = Recursion)

const PYTHON_CODE = `class Solution:
    def removeNthFromEnd(self, head, n):
        # nth node from the end is length - n node from the front
        # so we want to point node at length - n - 1 to node at length - n + 1
        # since we are removing, we might be removing head, so let's create a dummy node to keep track

        length = 0
        dummy = ListNode(0)
        dummy.next = head
        ptr = dummy

        # [1,2,3,4,5]; n = 2; index = 3 -> length - n to be removed
        # [0,1,2,3,4,5]; n = 2; index = 4 -> length - n to be removed

        while ptr:
            length += 1
            ptr = ptr.next

        indexToRepoint = length - n - 1

        # now we traverse again until we get to indexToRepoint

        ptr = dummy

        for i in range(indexToRepoint + 1):
            if i == indexToRepoint:
                ptr.next = ptr.next.next
            ptr = ptr.next

        return dummy.next`;

function makeNodes(
  vals: number[],
  activeIdx: number | null,
  removedIdx: number | null
): LinkedListNode[] {
  return vals.map((v, i) => ({
    id: `n${i}`,
    value: v,
    nextId: i < vals.length - 1 ? `n${i + 1}` : null,
    state:
      i === removedIdx
        ? ('active' as const)
        : i === activeIdx
        ? ('curr' as const)
        : ('default' as const),
  }));
}

function generateSteps(): Step[] {
  const vals = [1, 2, 3, 4, 5];
  const n = 2;
  const dummyVals = [0, ...vals];
  const steps: Step[] = [];

  steps.push({
    explanation: `Remove the ${n}nd node from the end of [${vals.join('→')}]. Prepend a dummy node (0) so removing the head is handled the same as any other removal.`,
    highlightLine: 2,
    state: {
      type: 'linked-list',
      nodes: makeNodes(dummyVals, 0, null),
      pointers: [],
    },
    variables: [
      { name: 'n', value: n },
      { name: 'dummy', value: '0 → head' },
    ],
  });

  // Phase 1: count length
  let length = 0;
  for (let i = 0; i < dummyVals.length; i++) {
    length++;
    steps.push({
      explanation: `Pass 1 — ptr at index ${i} (val=${dummyVals[i]}). length = ${length}.`,
      highlightLine: 5,
      state: {
        type: 'linked-list',
        nodes: makeNodes(dummyVals, i, null),
        pointers: [{ nodeId: `n${i}`, label: 'ptr' }],
      },
      variables: [
        { name: 'ptr', value: `index ${i}` },
        { name: 'length', value: length },
      ],
    });
  }

  const idx = length - n - 1;

  steps.push({
    explanation: `Pass 1 done. length=${length} (includes dummy). Repoint index = ${length} − ${n} − 1 = ${idx}. Node to remove is at index ${idx + 1} (val=${dummyVals[idx + 1]}).`,
    highlightLine: 9,
    state: {
      type: 'linked-list',
      nodes: makeNodes(dummyVals, null, null),
      pointers: [],
    },
    variables: [
      { name: 'length', value: length },
      { name: 'repoint idx', value: idx, highlight: true },
      { name: 'remove val', value: dummyVals[idx + 1] },
    ],
  });

  // Phase 2: traverse to idx
  for (let i = 0; i <= idx; i++) {
    const atTarget = i === idx;
    steps.push({
      explanation: atTarget
        ? `i=${i}: at repoint node (val=${dummyVals[i]}). Set ptr.next = ptr.next.next → skips val=${dummyVals[i + 1]}.`
        : `Pass 2 — i=${i}: advancing ptr to index ${i} (val=${dummyVals[i]}).`,
      highlightLine: atTarget ? 12 : 11,
      state: {
        type: 'linked-list',
        nodes: makeNodes(dummyVals, i, atTarget ? i + 1 : null),
        pointers: [{ nodeId: `n${i}`, label: 'ptr' }],
      },
      variables: [
        { name: 'i', value: i },
        { name: 'ptr val', value: dummyVals[i], highlight: atTarget },
      ],
    });
  }

  // Final result
  const resultVals = dummyVals.filter((_, i) => i !== idx + 1).slice(1);
  steps.push({
    explanation: `val=${dummyVals[idx + 1]} removed. Return dummy.next → [${resultVals.join('→')}]. O(n) time, O(1) space — two passes.`,
    highlightLine: 30,
    state: {
      type: 'linked-list',
      nodes: resultVals.map((v, i) => ({
        id: `r${i}`,
        value: v,
        nextId: i < resultVals.length - 1 ? `r${i + 1}` : null,
        state: 'done' as const,
      })),
      pointers: [],
    },
    variables: [{ name: 'return', value: `[${resultVals.join('→')}]`, highlight: true }],
  });

  return steps;
}

// ── Solution 2: One-Pass Two-Pointer ──────────────────────────────────────────

const PYTHON_CODE_ONEPASS = `class Solution:
    def removeNthFromEnd(self, head, n):
        # so we know from our previous implementation that we want to remove len - n node from the start
        # we can use a two pointer approach where l and r are n apart
        # l will be the element to remove when r becomes None
        # so we want to re-link when r.next is None since we are removing l
        # since we are removing a node, we should use a dummy node

        dummy = ListNode(0)
        dummy.next = head

        l = dummy
        r = head

        # move r to l + n
        while n > 0 and r:
            r = r.next
            n-=1

        # now we just move l and r together
        while r:
            l = l.next
            r = r.next

        l.next = l.next.next

        return dummy.next`;

function generateStepsOnePass(): Step[] {
  const vals = [1, 2, 3, 4, 5];
  const n = 2;
  const dummyVals = [0, ...vals]; // n0=dummy, n1..n5 = head..
  const steps: Step[] = [];

  const mk = (lIdx: number | null, rIdx: number | null, removedIdx: number | null = null) => ({
    type: 'linked-list' as const,
    nodes: dummyVals.map((v, i) => ({
      id: `n${i}`,
      value: v,
      nextId: i < dummyVals.length - 1 ? `n${i + 1}` : null,
      state:
        i === removedIdx ? ('active' as const)
        : i === lIdx ? ('curr' as const)
        : i === rIdx ? ('next-node' as const)
        : ('default' as const),
    })),
    pointers: [
      ...(lIdx !== null ? [{ nodeId: `n${lIdx}`, label: 'l' }] : []),
      ...(rIdx !== null ? [{ nodeId: `n${rIdx}`, label: 'r' }] : [{ nodeId: null, label: 'r=None' }]),
    ],
  });

  steps.push({
    explanation: `One pass: hold two pointers l and r exactly n=${n} apart. When r runs off the end, l will be sitting just before the node to remove. The dummy(0) makes head-removal uniform.`,
    highlightLine: 9,
    state: mk(0, 1),
    variables: [{ name: 'l', value: 'dummy(0)' }, { name: 'r', value: 'head(1)' }, { name: 'n', value: n }],
  });

  let r = 1;
  for (let k = 0; k < n; k++) {
    r++;
    steps.push({
      explanation: `Open the gap: advance r by 1 → val=${dummyVals[r]}. ${n - 1 - k} more step(s) so r is n=${n} ahead of l.`,
      highlightLine: 16,
      state: mk(0, r),
      variables: [{ name: 'r', value: `val ${dummyVals[r]}`, highlight: true }, { name: 'gap', value: k + 1 }],
    });
  }

  let l = 0;
  while (r < dummyVals.length) {
    l++; r++;
    const rNull = r >= dummyVals.length;
    steps.push({
      explanation: rNull
        ? `Move both: l→val=${dummyVals[l]}, r→None. r reached the end, so l is exactly one node before the target.`
        : `Move both forward together (gap stays ${n}): l→val=${dummyVals[l]}, r→val=${dummyVals[r]}.`,
      highlightLine: 21,
      state: mk(l, rNull ? null : r),
      variables: [
        { name: 'l', value: `val ${dummyVals[l]}`, highlight: rNull },
        { name: 'r', value: rNull ? 'None' : `val ${dummyVals[r]}` },
      ],
    });
  }

  const removeIdx = l + 1;
  steps.push({
    explanation: `l is at val=${dummyVals[l]} (just before the target). Set l.next = l.next.next → drop val=${dummyVals[removeIdx]} (the ${n}nd from the end).`,
    highlightLine: 24,
    state: mk(l, null, removeIdx),
    variables: [{ name: 'remove', value: dummyVals[removeIdx], highlight: true }],
  });

  const resultVals = dummyVals.filter((_, i) => i !== removeIdx).slice(1);
  steps.push({
    explanation: `Removed val=${dummyVals[removeIdx]} in a single pass. Return dummy.next → [${resultVals.join('→')}]. O(n) time, O(1) space — and only one traversal.`,
    highlightLine: 26,
    state: {
      type: 'linked-list',
      nodes: resultVals.map((v, i) => ({ id: `r${i}`, value: v, nextId: i < resultVals.length - 1 ? `r${i + 1}` : null, state: 'done' as const })),
      pointers: [],
    },
    variables: [{ name: 'return', value: `[${resultVals.join('→')}]`, highlight: true }],
  });

  return steps;
}

// ── Solution 3: Recursion ─────────────────────────────────────────────────────

const PYTHON_CODE_RECURSION = `class Solution:
    def removeNthFromEnd(self, head, n):
        # we still need a dummy node in case of head removal
        dummy = ListNode(0)
        dummy.next = head

        # since it is recursion, we start at end of the list
        # when we are at nth node from the end
        # we want the return to be current.next so we remove reference
        # keep track of current node # from the end
        counter = 0
        def removeNthNode(head):
            nonlocal counter
            if not head:
                return None

            # set caller's next to return
            head.next = removeNthNode(head.next)
            counter+=1

            # if counter is at n, return next instead of current
            if counter == n:
                return head.next

            return head

        removeNthNode(dummy)
        return dummy.next`;

function generateStepsRecursion(): Step[] {
  const vals = [1, 2, 3, 4, 5];
  const n = 2;
  const dummyVals = [0, ...vals];
  const steps: Step[] = [];

  const mk = (activeIdx: number | null, removedIdx: number | null, done: Set<number>) => ({
    type: 'linked-list' as const,
    nodes: dummyVals.map((v, i) => ({
      id: `n${i}`,
      value: v,
      nextId: i < dummyVals.length - 1 ? `n${i + 1}` : null,
      state:
        i === removedIdx ? ('active' as const)
        : i === activeIdx ? ('curr' as const)
        : done.has(i) ? ('done' as const)
        : ('default' as const),
    })),
    pointers: activeIdx !== null ? [{ nodeId: `n${activeIdx}`, label: 'head' }] : [],
  });

  steps.push({
    explanation: `Recursion: dive all the way to the end first, then count nodes as the calls unwind. The moment counter == n, return head.next so that node is dropped. Dummy(0) guards against removing the real head.`,
    highlightLine: 11,
    state: mk(0, null, new Set()),
    variables: [{ name: 'counter', value: 0 }, { name: 'n', value: n }],
  });

  // Descent
  let depth = 0;
  for (let i = 0; i < dummyVals.length; i++) {
    depth++;
    steps.push({
      explanation: `Descend: removeNthNode(val=${dummyVals[i]}) recurses into .next BEFORE doing anything (call-stack depth ${depth}).`,
      highlightLine: 18,
      state: mk(i, null, new Set()),
      variables: [{ name: 'head', value: dummyVals[i] }, { name: 'call depth', value: depth }],
    });
  }

  depth++;
  steps.push({
    explanation: `removeNthNode(None): base case, return None. Now the stack unwinds, counting from the end.`,
    highlightLine: 14,
    state: mk(null, null, new Set()),
    variables: [{ name: 'head', value: 'None' }, { name: 'return', value: 'None' }],
  });

  // Unwind
  let counter = 0;
  let removeIdx: number | null = null;
  const done = new Set<number>();
  for (let i = dummyVals.length - 1; i >= 0; i--) {
    depth--;
    counter++;
    if (counter === n) {
      removeIdx = i;
      steps.push({
        explanation: `Unwind to val=${dummyVals[i]}: counter → ${counter} == n=${n}! Return head.next instead of head — this node (val=${dummyVals[i]}) is dropped, so its caller links past it.`,
        highlightLine: 22,
        state: mk(i, i, done),
        variables: [{ name: 'counter', value: counter, highlight: true }, { name: 'drop', value: dummyVals[i], highlight: true }],
      });
    } else {
      steps.push({
        explanation: `Unwind to val=${dummyVals[i]}: counter → ${counter} (≠ ${n}). Return this node unchanged.`,
        highlightLine: 24,
        state: mk(i, null, done),
        variables: [{ name: 'counter', value: counter }, { name: 'return', value: `val ${dummyVals[i]}` }],
      });
    }
    done.add(i);
  }

  const resultVals = dummyVals.filter((_, i) => i !== removeIdx).slice(1);
  steps.push({
    explanation: `Recursion complete — the counter==n node was dropped on the way up. Return dummy.next → [${resultVals.join('→')}]. O(n) time, O(n) call-stack space.`,
    highlightLine: 27,
    state: {
      type: 'linked-list',
      nodes: resultVals.map((v, i) => ({ id: `r${i}`, value: v, nextId: i < resultVals.length - 1 ? `r${i + 1}` : null, state: 'done' as const })),
      pointers: [],
    },
    variables: [{ name: 'return', value: `[${resultVals.join('→')}]`, highlight: true }],
  });

  return steps;
}

const twoPassSolution: SolutionVariant = {
  label: 'Two-Pass',
  pythonCode: PYTHON_CODE,
  generateSteps,
};

const onePassSolution: SolutionVariant = {
  label: 'One-Pass Two-Pointer',
  pythonCode: PYTHON_CODE_ONEPASS,
  generateSteps: generateStepsOnePass,
};

const recursionSolution: SolutionVariant = {
  label: 'Recursion',
  pythonCode: PYTHON_CODE_RECURSION,
  generateSteps: generateStepsRecursion,
};

export const removeNthFromEndMeta: AlgorithmMeta = {
  id: 'remove-nth-node-from-end',
  lcNumber: 19,
  title: 'Remove Nth Node From End of List',
  difficulty: 'Medium',
  category: 'linked-list',
  tags: ['Linked List', 'Two Pointers', 'Recursion'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(1)',
  description:
    'Given the head of a linked list, remove the nth node from the end of the list and return its head.',
  examples: [
    {
      input: 'head = [1,2,3,4,5], n = 2',
      output: '[1,2,3,5]',
      explanation: 'The 2nd node from the end (val=4) is removed.',
    },
    {
      input: 'head = [1], n = 1',
      output: '[]',
    },
    {
      input: 'head = [1,2], n = 1',
      output: '[1]',
    },
  ] as ProblemExample[],
  constraints: [
    'The number of nodes in the list is sz.',
    '1 ≤ sz ≤ 30',
    '0 ≤ Node.val ≤ 100',
    '1 ≤ n ≤ sz',
  ],
  hint: 'Prepend a dummy node so removing the real head is no different from removing any other node. Two-pass: count length, then walk to (length − n − 1). One pass: keep two pointers n apart so the lead hits the end exactly when the trailing one is before the target. Recursion: count from the end as the stack unwinds.',
  solutions: [twoPassSolution, onePassSolution, recursionSolution],
};
