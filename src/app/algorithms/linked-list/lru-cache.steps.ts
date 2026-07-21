// Solution + comments sourced from cse-progress: dsa/leetcode/linked_list/146_lru_cache.py
import { AlgorithmMeta, SolutionVariant, Step, GraphNode, GraphEdge, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE = `class Node:
    def __init__(self, key, val, prev=None, next=None):
        self.key = key; self.val = val
        self.prev = prev; self.next = next

class LRUCache:
    def __init__(self, capacity: int):
        self.cache = {}                 # key -> Node
        self.capacity = capacity
        self.head = Node(-1, -1)        # dummy MRU end
        self.tail = Node(-1, -1)        # dummy LRU end
        self.head.next = self.tail
        self.tail.prev = self.head

    def remove(self, node) -> None:
        prevNode = node.prev
        nextNode = node.next
        prevNode.next = nextNode
        nextNode.prev = prevNode

    def insert(self, node) -> None:     # insert right after head (MRU)
        headNext = self.head.next
        self.head.next = node
        node.prev = self.head
        node.next = headNext
        headNext.prev = node

    def get(self, key: int) -> int:
        if key in self.cache:
            node = self.cache[key]
            self.remove(node)           # move to MRU
            self.insert(node)
            return node.val
        return -1

    def put(self, key: int, value: int) -> None:
        if key in self.cache:
            self.remove(self.cache[key])
        newNode = Node(key, value)
        self.insert(newNode)
        self.cache[key] = newNode
        while len(self.cache) > self.capacity:
            lru = self.tail.prev        # node just before dummy tail
            self.remove(lru)
            del self.cache[lru.key]`;

type Op = { kind: 'put'; key: number; value: number } | { kind: 'get'; key: number };
const CAPACITY = 2;
const OPS: Op[] = [
  { kind: 'put', key: 1, value: 1 },
  { kind: 'put', key: 2, value: 2 },
  { kind: 'get', key: 1 },
  { kind: 'put', key: 3, value: 3 },
  { kind: 'get', key: 2 },
  { kind: 'put', key: 4, value: 4 },
  { kind: 'get', key: 1 },
  { kind: 'get', key: 3 },
  { kind: 'get', key: 4 },
];

function generateSteps(): Step[] {
  const steps: Step[] = [];
  // order[0] = MRU, order[last] = LRU
  let order: { key: number; value: number }[] = [];

  const cacheMap = (): Record<string | number, number> => {
    const m: Record<string | number, number> = {};
    order.forEach((e) => (m[e.key] = e.value));
    return m;
  };

  const buildState = (
    activeKey: number | null,
    counters: { label: string; value: number | string }[]
  ): Step['state'] => {
    const chain = ['H', ...order.map((e) => `k${e.key}`), 'T'];
    const nodes: GraphNode[] = chain.map((id, i) => {
      const isDummy = id === 'H' || id === 'T';
      const entry = isDummy ? null : order.find((e) => `k${e.key}` === id)!;
      return {
        id,
        x: 40 + i * 82,
        y: 110,
        state: (isDummy ? 'default' : entry && entry.key === activeKey ? 'active' : 'visited') as GraphNode['state'],
        label: isDummy ? (id === 'H' ? 'head' : 'tail') : `${entry!.key}:${entry!.value}`,
      };
    });
    const edges: GraphEdge[] = [];
    for (let i = 0; i < chain.length - 1; i++) edges.push({ from: chain[i], to: chain[i + 1], state: 'default' });
    return {
      type: 'graph',
      directed: true,
      nodes,
      edges,
      hashmap: cacheMap(),
      hashmapLabel: 'cache (key→val)',
      counters,
    };
  };

  steps.push({
    explanation:
      'LRUCache(2). A doubly linked list (dummy head = MRU end, dummy tail = LRU end) gives O(1) move-to-front and O(1) eviction of the least-recently-used node; a hashmap key→Node gives O(1) lookup. Nodes are shown head→…→tail (most→least recently used).',
    highlightLine: 6,
    state: buildState(null, [{ label: 'capacity', value: CAPACITY }, { label: 'size', value: 0 }]),
    variables: [],
  });

  const moveToFront = (key: number) => {
    const idx = order.findIndex((e) => e.key === key);
    const [e] = order.splice(idx, 1);
    order.unshift(e);
  };

  for (let opIdx = 0; opIdx < OPS.length; opIdx++) {
    const op = OPS[opIdx];

    if (op.kind === 'get') {
      const hit = order.some((e) => e.key === op.key);
      if (hit) {
        const val = order.find((e) => e.key === op.key)!.value;
        moveToFront(op.key);
        steps.push({
          explanation: `get(${op.key}): key is in cache → remove it and re-insert at head (now MRU). Return ${val}.`,
          highlightLine: 31,
          state: buildState(op.key, [
            { label: `op #${opIdx + 1}`, value: `get(${op.key})` },
            { label: 'return', value: val },
            { label: 'size', value: order.length },
          ]),
          variables: [{ name: 'return', value: val, highlight: true }],
        });
      } else {
        steps.push({
          explanation: `get(${op.key}): key not in cache → return -1. List unchanged.`,
          highlightLine: 36,
          state: buildState(null, [
            { label: `op #${opIdx + 1}`, value: `get(${op.key})` },
            { label: 'return', value: -1 },
            { label: 'size', value: order.length },
          ]),
          variables: [{ name: 'return', value: -1, highlight: true }],
        });
      }
      continue;
    }

    // put
    const existed = order.some((e) => e.key === op.key);
    if (existed) {
      order = order.filter((e) => e.key !== op.key);
      steps.push({
        explanation: `put(${op.key}, ${op.value}): key already in cache → remove the old node first (it will be re-inserted at MRU with the new value).`,
        highlightLine: 40,
        state: buildState(null, [
          { label: `op #${opIdx + 1}`, value: `put(${op.key},${op.value})` },
          { label: 'size', value: order.length },
        ]),
        variables: [{ name: 'existing key', value: op.key }],
      });
    }
    order.unshift({ key: op.key, value: op.value });
    steps.push({
      explanation: `put(${op.key}, ${op.value}): create a fresh node, insert right after head (MRU), and record cache[${op.key}] = node.`,
      highlightLine: 43,
      state: buildState(op.key, [
        { label: `op #${opIdx + 1}`, value: `put(${op.key},${op.value})` },
        { label: 'size', value: order.length },
      ]),
      variables: [{ name: 'inserted', value: `${op.key}:${op.value}`, highlight: true }],
    });

    // while len(cache) > capacity: evict LRU (node before dummy tail)
    while (order.length > CAPACITY) {
      const lru = order[order.length - 1];
      order = order.slice(0, -1);
      steps.push({
        explanation: `size ${order.length + 1} > capacity ${CAPACITY} → evict LRU. lru = tail.prev = node ${lru.key} (nearest the tail). remove it and del cache[${lru.key}].`,
        highlightLine: 46,
        state: buildState(null, [
          { label: `op #${opIdx + 1}`, value: `put(${op.key},${op.value})` },
          { label: 'evicted', value: lru.key },
          { label: 'size', value: order.length },
        ]),
        variables: [{ name: 'evicted key', value: lru.key, highlight: true }],
      });
    }
  }

  steps.push({
    explanation:
      'All operations complete. Every get and put touched only O(1) nodes: the hashmap finds the node instantly, and the dummy-headed doubly linked list makes unlinking and re-inserting at the MRU end constant-time.',
    highlightLine: 43,
    state: buildState(null, [{ label: 'final size', value: order.length }]),
    variables: [],
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'HashMap + Doubly Linked List',
  pythonCode: PYTHON_CODE,
  generateSteps,
  timeComplexity: 'O(1) per get/put',
  spaceComplexity: 'O(capacity)',
};

export const lruCacheMeta: AlgorithmMeta = {
  id: 'lru-cache',
  lcNumber: 146,
  title: 'LRU Cache',
  difficulty: 'Medium',
  category: 'linked-list',
  tags: ['Hash Table', 'Linked List', 'Design', 'Doubly-Linked List'],
  timeComplexity: 'O(1)',
  spaceComplexity: 'O(capacity)',
  description:
    'Design a Least Recently Used (LRU) cache with a fixed capacity. get(key) returns the value or -1; put(key, value) inserts/updates and evicts the least-recently-used key when over capacity. Both must run in O(1) average time.',
  examples: [
    {
      input: 'capacity=2; put(1,1) put(2,2) get(1) put(3,3) get(2) put(4,4) get(1) get(3) get(4)',
      output: '[null, null, 1, null, -1, null, -1, 3, 4]',
      explanation: 'put(3,3) evicts key 2 (LRU); put(4,4) evicts key 1.',
    },
  ] as ProblemExample[],
  constraints: ['1 ≤ capacity ≤ 3000', '0 ≤ key ≤ 10⁴', '0 ≤ value ≤ 10⁵', 'At most 2×10⁵ calls to get and put.'],
  hint: 'Combine a hashmap (key→node, O(1) lookup) with a doubly linked list ordered most→least recently used. Use dummy head/tail nodes so insert-at-front and unlink are branch-free O(1). Every access moves its node to the front; eviction removes the node just before the dummy tail.',
  solutions: [solution],
};
