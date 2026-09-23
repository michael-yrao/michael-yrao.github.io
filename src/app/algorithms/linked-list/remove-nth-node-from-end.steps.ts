import { AlgorithmMeta, SolutionVariant, Step, ProblemExample, LinkedListNode } from '../../core/models/algorithm.model';

// Traces cse-progress's three attempts verbatim:
//   removeNthFromEndTwoIteration — NO dummy node; pass 1 counts listLength; an explicit
//     `if indexToRemove == 0` edge case for removing the head; pass 2 walks a `for` loop
//     that breaks as soon as it relinks.
//   removeNthFromEnd            — dummy node + two pointers n apart (unchanged control flow
//     from the earlier hand simulation, only anchors change).
//   removeNthFromEndRecursion   — dummy node + a nested recursive helper that relinks on
//     the way back up when `counter == n` (unchanged control flow, only anchors change).

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

// ── Solution 1: Two-Pass (no dummy node) ──────────────────────────────────────

function generateSteps(): Step[] {
  const vals = [1, 2, 3, 4, 5];
  const n = 2;
  const steps: Step[] = [];
  const listLength = vals.length;
  const indexToRemove = listLength - n;

  steps.push({
    explanation: `Two full passes, and NO dummy node this time. Pass 1 counts listLength; pass 2 walks to index indexToRemove − 1 and relinks there. n=${n}.`,
    anchor: { match: 'def removeNthFromEndTwoIteration(self, head: Optional[ListNode], n: int) -> Optional[ListNode]:' },
    state: { type: 'linked-list', nodes: makeNodes(vals, 0, null), pointers: [{ nodeId: 'n0', label: 'current' }] },
    variables: [{ name: 'n', value: n }],
  });

  // Pass 1: count length
  for (let i = 0; i < listLength; i++) {
    const lengthSoFar = i + 1;
    const nextIdx = i + 1 < listLength ? i + 1 : null;
    steps.push({
      explanation: `Pass 1 — current at index ${i} (val=${vals[i]}): advance current = current.next; listLength += 1 → ${lengthSoFar}.`,
      // nth 1: pass-1's advance inside the while loop; the 2nd hit is pass-2's advance in the for-loop's fallthrough
      anchor: { match: 'current = current.next', nth: 1, to: { match: 'listLength += 1' } },
      state: {
        type: 'linked-list',
        nodes: makeNodes(vals, nextIdx, null),
        pointers: nextIdx !== null ? [{ nodeId: `n${nextIdx}`, label: 'current' }] : [{ nodeId: null, label: 'current=None' }],
      },
      variables: [{ name: 'listLength', value: lengthSoFar, highlight: true }],
    });
  }

  steps.push({
    explanation: `current is None — while current exits. indexToRemove = listLength − n = ${listLength} − ${n} = ${indexToRemove}.`,
    anchor: { match: 'indexToRemove = listLength - n' },
    state: { type: 'linked-list', nodes: makeNodes(vals, null, null), pointers: [] },
    variables: [
      { name: 'listLength', value: listLength },
      { name: 'indexToRemove', value: indexToRemove, highlight: true },
    ],
  });

  if (indexToRemove === 0) {
    steps.push({
      explanation: 'indexToRemove == 0 → the head itself is being removed. Return head.next directly — pass 2 never runs.',
      anchor: { match: 'if indexToRemove == 0:', to: { match: 'return head.next' } },
      state: { type: 'linked-list', nodes: makeNodes(vals, null, 0), pointers: [] },
      variables: [{ name: 'return', value: vals.slice(1).join('→'), highlight: true }],
    });
    return steps;
  }

  steps.push({
    explanation: `indexToRemove (${indexToRemove}) ≠ 0 — the if branch is skipped, no early return. Fall through into pass 2.`,
    anchor: { match: 'if indexToRemove == 0:' },
    state: { type: 'linked-list', nodes: makeNodes(vals, null, null), pointers: [] },
    variables: [{ name: 'indexToRemove', value: indexToRemove }],
  });

  steps.push({
    explanation: `Reset current = head for pass 2 — walk to index indexToRemove − 1 = ${indexToRemove - 1} and relink there.`,
    // nth 2: the pass-2 reset before the for loop; the 1st hit is pass-1's init before the while loop
    anchor: { match: 'current = head', nth: 2 },
    state: { type: 'linked-list', nodes: makeNodes(vals, 0, null), pointers: [{ nodeId: 'n0', label: 'current' }] },
    variables: [{ name: 'current', value: `val ${vals[0]}` }],
  });

  const target = indexToRemove - 1;
  let removedIdx: number | null = null;
  for (let i = 0; i < listLength - 1; i++) {
    if (i === target) {
      removedIdx = i + 1;
      steps.push({
        explanation: `i=${i} == indexToRemove − 1 (${target}) → current.next = current.next.next: unlink val=${vals[i + 1]}. break exits the loop — i=${i + 1} never runs.`,
        anchor: { match: 'current.next = current.next.next', to: { match: 'break' } },
        state: { type: 'linked-list', nodes: makeNodes(vals, i, i + 1), pointers: [{ nodeId: `n${i}`, label: 'current' }] },
        variables: [
          { name: 'i', value: i, highlight: true },
          { name: 'removed', value: vals[i + 1], highlight: true },
        ],
      });
      break;
    }
    steps.push({
      explanation: `i=${i} ≠ indexToRemove − 1 (${target}) → advance current = current.next to val=${vals[i + 1]}.`,
      // nth 2: pass-2's advance in the for-loop's fallthrough; the 1st hit is pass-1's advance inside the while loop
      anchor: { match: 'current = current.next', nth: 2 },
      state: { type: 'linked-list', nodes: makeNodes(vals, i + 1, null), pointers: [{ nodeId: `n${i + 1}`, label: 'current' }] },
      variables: [{ name: 'i', value: i }],
    });
  }

  const resultVals = vals.filter((_, i) => i !== removedIdx);
  steps.push({
    explanation: `Pass 2 complete. Return head (still val=${vals[0]}, an unchanged reference) → [${resultVals.join('→')}]. O(n) time, O(1) space — two full passes, no dummy.`,
    // nth 2: the bare final return; the 1st hit is the earlier edge-case's "return head.next"
    anchor: { match: 'return head', nth: 2 },
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
    anchor: { match: 'dummy = ListNode(0)', to: { match: 'r = head' } },
    state: mk(0, 1),
    variables: [{ name: 'l', value: 'dummy(0)' }, { name: 'r', value: 'head(1)' }, { name: 'n', value: n }],
  });

  let r = 1;
  for (let k = 0; k < n; k++) {
    r++;
    steps.push({
      explanation: `Open the gap: advance r by 1 → val=${dummyVals[r]}. ${n - 1 - k} more step(s) so r is n=${n} ahead of l.`,
      anchor: { match: 'while n > 0 and r:', to: { match: 'n-=1' } },
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
      // nth 2: the second while loop's advance; the 1st hit is the first while loop's `r = r.next`
      anchor: { match: 'while r:', to: { match: 'r = r.next', nth: 2 } },
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
    anchor: { match: 'l.next = l.next.next' },
    state: mk(l, null, removeIdx),
    variables: [{ name: 'remove', value: dummyVals[removeIdx], highlight: true }],
  });

  const resultVals = dummyVals.filter((_, i) => i !== removeIdx).slice(1);
  steps.push({
    explanation: `Removed val=${dummyVals[removeIdx]} in a single pass. Return dummy.next → [${resultVals.join('→')}]. O(n) time, O(1) space — and only one traversal.`,
    anchor: { match: 'return dummy.next' },
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
    anchor: { match: 'dummy = ListNode(0)', to: { match: 'dummy.next = head' } },
    state: mk(0, null, new Set()),
    variables: [{ name: 'counter', value: 0 }, { name: 'n', value: n }],
  });

  // Descent
  let depth = 0;
  for (let i = 0; i < dummyVals.length; i++) {
    depth++;
    steps.push({
      explanation: `Descend: removeNthNode(val=${dummyVals[i]}) recurses into .next BEFORE doing anything (call-stack depth ${depth}).`,
      anchor: { match: 'head.next = removeNthNode(head.next)' },
      state: mk(i, null, new Set()),
      variables: [{ name: 'head', value: dummyVals[i] }, { name: 'call depth', value: depth }],
    });
  }

  depth++;
  steps.push({
    explanation: `removeNthNode(None): base case, return None. Now the stack unwinds, counting from the end.`,
    anchor: { match: 'if not head:', to: { match: 'return None' } },
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
        anchor: { match: 'if counter == n:', to: { match: 'return head.next' } },
        state: mk(i, i, done),
        variables: [{ name: 'counter', value: counter, highlight: true }, { name: 'drop', value: dummyVals[i], highlight: true }],
      });
    } else {
      steps.push({
        explanation: `Unwind to val=${dummyVals[i]}: counter → ${counter} (≠ ${n}). Return this node unchanged.`,
        // nth 2: the bare else-branch return; the 1st hit is 'return head.next' in the if-branch above
        anchor: { match: 'return head', nth: 2 },
        state: mk(i, null, done),
        variables: [{ name: 'counter', value: counter }, { name: 'return', value: `val ${dummyVals[i]}` }],
      });
    }
    done.add(i);
  }

  const resultVals = dummyVals.filter((_, i) => i !== removeIdx).slice(1);
  steps.push({
    explanation: `Recursion complete — the counter==n node was dropped on the way up. Return dummy.next → [${resultVals.join('→')}]. O(n) time, O(n) call-stack space.`,
    anchor: { match: 'return dummy.next' },
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
  variant: 'two-pass',
  generateSteps,
};

const onePassSolution: SolutionVariant = {
  label: 'One-Pass Two-Pointer',
  variant: 'one-pass',
  generateSteps: generateStepsOnePass,
};

const recursionSolution: SolutionVariant = {
  label: 'Recursion',
  variant: 'recursion',
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
  hint: 'Two-pass, no dummy: count length, then walk to (listLength − n − 1) and relink, with an explicit edge case when the head itself must be removed. One-pass with a dummy: keep two pointers n apart so the lead hits the end exactly when the trailing one is before the target. Recursion, also with a dummy: count from the end as the stack unwinds.',
  solutions: [twoPassSolution, onePassSolution, recursionSolution],
};
