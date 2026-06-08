import { AlgorithmMeta, SolutionVariant, Step, LinkedListNode, ProblemExample } from '../../core/models/algorithm.model';

// ── Solution 1: Iterative ─────────────────────────────────────────────────────

const ITERATIVE_CODE = `from typing import Optional

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

class Solution:
    def reverseListIterative(self, head: Optional[ListNode]) -> Optional[ListNode]:
        # we need to initialize a prev so we can have the current head point to null
        # then we have a pointer to help us traverse through the list
        prev, current = None, head

        while current is not None:
            # put current.next in temp variable
            temp = current.next
            # change what current points to
            current.next = prev
            # prev should now be current
            prev = current
            # current is now next
            current = temp
        return prev`;

function generateIterativeSteps(): Step[] {
  const vals = [1, 2, 3, 4, 5];
  const steps: Step[] = [];

  const makeNodes = (
    prevIdx: number | null,
    currIdx: number | null,
    reversed: number
  ): LinkedListNode[] =>
    vals.map((v, i) => ({
      id: `n${i}`,
      value: v,
      nextId: i < vals.length - 1 ? `n${i + 1}` : null,
      state:
        i < reversed
          ? 'done'
          : i === prevIdx
          ? 'prev'
          : i === currIdx
          ? 'curr'
          : 'default',
    }));

  steps.push({
    explanation:
      'We need three pointers to reverse in-place without losing our position. prev starts at null (the new tail\'s next will be null). current starts at head. We\'ll move one step at a time, redirecting each node\'s next pointer.',
    highlightLine: 12,
    state: {
      type: 'linked-list',
      nodes: makeNodes(null, 0, 0),
      pointers: [
        { nodeId: null, label: 'prev' },
        { nodeId: 'n0', label: 'curr' },
      ],
    },
    variables: [
      { name: 'prev', value: 'null' },
      { name: 'current', value: vals[0] },
    ],
  });

  let prev: number | null = null;
  let curr = 0;
  let reversed = 0;

  while (curr < vals.length) {
    const next = curr + 1 < vals.length ? curr + 1 : null;

    steps.push({
      explanation: `Save temp = current.next (node ${next !== null ? vals[next] : 'null'}) before we overwrite it. Without this, we'd lose our forward reference after redirecting current's next.`,
      highlightLine: 16,
      state: {
        type: 'linked-list',
        nodes: makeNodes(prev, curr, reversed),
        pointers: [
          { nodeId: prev !== null ? `n${prev}` : null, label: 'prev' },
          { nodeId: `n${curr}`, label: 'curr' },
          { nodeId: next !== null ? `n${next}` : null, label: 'temp' },
        ],
      },
      variables: [
        { name: 'prev', value: prev !== null ? vals[prev] : 'null' },
        { name: 'current', value: vals[curr], highlight: true },
        { name: 'temp', value: next !== null ? vals[next] : 'null', highlight: true },
      ],
    });

    steps.push({
      explanation: `Point current.next → prev. Node ${vals[curr]} now points backward. This is the reversal step — we're flipping one arrow at a time.`,
      highlightLine: 18,
      state: {
        type: 'linked-list',
        nodes: vals.map((v, i) => ({
          id: `n${i}`,
          value: v,
          nextId: i < reversed ? (i > 0 ? `n${i - 1}` : null) : i < vals.length - 1 ? `n${i + 1}` : null,
          state:
            i < reversed
              ? 'done'
              : i === curr
              ? 'curr'
              : i === (prev ?? -1)
              ? 'prev'
              : 'default',
        })),
        pointers: [
          { nodeId: prev !== null ? `n${prev}` : null, label: 'prev' },
          { nodeId: `n${curr}`, label: 'curr' },
        ],
      },
      variables: [
        { name: 'current', value: vals[curr], highlight: true },
        { name: 'current.next', value: prev !== null ? vals[prev] : 'null', highlight: true },
        { name: 'prev', value: prev !== null ? vals[prev] : 'null' },
      ],
    });

    steps.push({
      explanation: `Advance: prev = current, current = temp. We've committed this reversal. Move the window one step forward.`,
      highlightLine: 20,
      state: {
        type: 'linked-list',
        nodes: makeNodes(curr, next, curr + 1),
        pointers: [
          { nodeId: `n${curr}`, label: 'prev' },
          { nodeId: next !== null ? `n${next}` : null, label: 'curr' },
        ],
      },
      variables: [
        { name: 'prev', value: vals[curr], highlight: true },
        { name: 'current', value: next !== null ? vals[next] : 'null', highlight: true },
      ],
    });

    reversed = curr + 1;
    prev = curr;
    curr = next !== null ? next : vals.length;
  }

  steps.push({
    explanation: `current is null — we've processed every node. prev now points to the new head (${vals[vals.length - 1]}). The list is fully reversed with O(1) space.`,
    highlightLine: 23,
    state: {
      type: 'linked-list',
      nodes: vals.map((v, i) => ({
        id: `n${i}`,
        value: v,
        nextId: i > 0 ? `n${i - 1}` : null,
        state: 'done' as const,
      })).reverse(),
      pointers: [{ nodeId: `n${vals.length - 1}`, label: 'head' }],
    },
    variables: [
      { name: 'prev', value: vals[vals.length - 1], highlight: true },
      { name: 'current', value: 'null' },
    ],
  });

  return steps;
}

// ── Solution 2: Recursive ─────────────────────────────────────────────────────

const RECURSIVE_CODE = `from typing import Optional

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

class Solution:
    def reverseListRecursion(self, head: Optional[ListNode]) -> Optional[ListNode]:
        # base case to stop at the last node
        if head is None or head.next is None:
            return head

        # if we have 3 -> 4 -> 5 -> None only
        # returnNode would be 5 and head would be 4
        returnNode = self.reverseListRecursion(head.next)
        # since we passed head.next to the recursive call
        # we need to change its next
        # 4 is head in this case, 4.next is 5
        head.next.next = head
        # 4.next would be None
        head.next = None
        # return the base case node
        return returnNode`;

function generateRecursiveSteps(): Step[] {
  return [];
}

// ── Export ────────────────────────────────────────────────────────────────────

export const reverseLinkedListMeta: AlgorithmMeta = {
  id: 'reverse-linked-list',
  lcNumber: 206,
  title: 'Reverse Linked List',
  difficulty: 'Easy',
  category: 'linked-list',
  tags: ['Linked List', 'Two Pointers', 'Recursion'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(1)',
  description: 'Given the head of a singly linked list, reverse the list, and return the reversed list.',
  examples: [
    { input: 'head = [1,2,3,4,5]', output: '[5,4,3,2,1]' },
    { input: 'head = [1,2]', output: '[2,1]' },
    { input: 'head = []', output: '[]' },
  ],
  constraints: [
    'The number of nodes in the list is in the range [0, 5000].',
    '-5000 <= Node.val <= 5000',
  ],
  hint: 'To reverse a node\'s pointer, you need to know both where it currently points AND what was behind it. How many pointers do you need to track those things?',
  solutions: [
    { label: 'Iterative', pythonCode: ITERATIVE_CODE, generateSteps: generateIterativeSteps },
    { label: 'Recursive', pythonCode: RECURSIVE_CODE, generateSteps: generateRecursiveSteps },
  ],
};
