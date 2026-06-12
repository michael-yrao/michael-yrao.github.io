import { AlgorithmMeta, SolutionVariant, Step, ArrayState, ProblemExample } from '../../core/models/algorithm.model';

// Note: The source file has the class skeleton; the canonical algorithm from the docstring is used below.
const PYTHON_CODE = `class TimeMap:

    value = 0
    def __init__(self):
        value = 1

    def set(self, key: str, value: str, timestamp: int) -> None:
        return

    def get(self, key: str, timestamp: int) -> str:
        return

# Your TimeMap object will be instantiated and called as such:
# obj = TimeMap()
# obj.set(key,value,timestamp)
# param_2 = obj.get(key,timestamp)`;

// Reference implementation description from the problem docstring:
// set(key, value, timestamp) → store key → [(timestamp, value), ...]
// get(key, timestamp) → binary search on stored timestamps for key to find largest ts_prev <= timestamp
// Return value at that ts_prev, or "" if none.

function generateSteps(): Step[] {
  const steps: Step[] = [];

  // The "foo" timestamps array after both set() calls: [1, 4]
  // We visualize as an array of timestamps

  // ── Initialization ────────────────────────────────────────────────────────

  steps.push({
    explanation:
      'TimeMap stores key→list of (timestamp, value) pairs, where timestamps are always strictly increasing. For binary search to work, the timestamps list per key must remain sorted. We simulate operations on key="foo".',
    highlightLine: 1,
    state: {
      type: 'array',
      cells: [],
      pointers: [],
      hashmap: {},
      counters: [
        { label: 'operation', value: 'TimeMap()' },
        { label: 'store["foo"]', value: '(empty)' },
      ],
    } as ArrayState,
  });

  // ── set("foo", "bar", 1) ──────────────────────────────────────────────────

  steps.push({
    explanation:
      'set("foo", "bar", 1): append (timestamp=1, value="bar") to the list for key "foo". Timestamps are strictly increasing so the list stays sorted automatically — no sorting needed.',
    highlightLine: 7,
    state: {
      type: 'array',
      cells: [{ value: 1, state: 'found' as const }],
      pointers: [{ index: 0, label: 'ts=1' }],
      hashmap: { 'foo[ts=1]': '"bar"' },
      counters: [
        { label: 'operation', value: 'set("foo","bar",1)' },
        { label: 'store["foo"]', value: '[{1:"bar"}]' },
      ],
    } as ArrayState,
  });

  // ── set("foo", "bar2", 4) ─────────────────────────────────────────────────

  steps.push({
    explanation:
      'set("foo", "bar2", 4): append (timestamp=4, value="bar2"). Now store["foo"] has timestamps [1, 4]. The sorted order is guaranteed by the problem constraint that timestamps are strictly increasing.',
    highlightLine: 7,
    state: {
      type: 'array',
      cells: [
        { value: 1, state: 'visited' as const },
        { value: 4, state: 'found' as const },
      ],
      pointers: [
        { index: 0, label: 'ts=1' },
        { index: 1, label: 'ts=4' },
      ],
      hashmap: { 'foo[ts=1]': '"bar"', 'foo[ts=4]': '"bar2"' },
      counters: [
        { label: 'operation', value: 'set("foo","bar2",4)' },
        { label: 'store["foo"] timestamps', value: '[1, 4]' },
      ],
    } as ArrayState,
  });

  // ── get("foo", 3) — binary search for largest ts <= 3 ────────────────────

  steps.push({
    explanation:
      'get("foo", 3): find the largest timestamp <= 3 in [1, 4]. Binary search: l=0, r=1. We want the rightmost position where timestamps[mid] <= query.',
    highlightLine: 10,
    state: {
      type: 'array',
      cells: [
        { value: 1, state: 'window' as const },
        { value: 4, state: 'window' as const },
      ],
      pointers: [
        { index: 0, label: 'l' },
        { index: 1, label: 'r' },
      ],
      hashmap: { 'foo[ts=1]': '"bar"', 'foo[ts=4]': '"bar2"' },
      counters: [
        { label: 'operation', value: 'get("foo", 3)' },
        { label: 'query timestamp', value: 3 },
        { label: 'result', value: '?' },
      ],
    } as ArrayState,
  });

  steps.push({
    explanation:
      'l=0, r=1, mid=(0+1)//2=0. timestamps[mid=0]=1. Is 1 <= 3? YES — timestamps[mid] is a valid candidate (ts_prev=1 <= query=3). We want the largest valid ts, so set l=mid+1=1 to look right.',
    highlightLine: 10,
    state: {
      type: 'array',
      cells: [
        { value: 1, state: 'active' as const },
        { value: 4, state: 'window' as const },
      ],
      pointers: [
        { index: 0, label: 'mid' },
        { index: 1, label: 'r' },
      ],
      hashmap: { 'foo[ts=1]': '"bar"', 'foo[ts=4]': '"bar2"' },
      counters: [
        { label: 'mid ts', value: 1 },
        { label: '1 <= 3?', value: 'YES → l = mid+1 = 1' },
        { label: 'query timestamp', value: 3 },
      ],
    } as ArrayState,
  });

  steps.push({
    explanation:
      'l=1, r=1, mid=1. timestamps[mid=1]=4. Is 4 <= 3? NO — 4 is too large. Set r=mid-1=0. Loop ends (l > r). The last valid position was index 0 → timestamps[0]=1, value="bar". Return "bar".',
    highlightLine: 10,
    state: {
      type: 'array',
      cells: [
        { value: 1, state: 'found' as const },
        { value: 4, state: 'eliminated' as const },
      ],
      pointers: [{ index: 1, label: 'mid (eliminated)' }],
      hashmap: { 'foo[ts=1]': '"bar"', 'foo[ts=4]': '"bar2"' },
      counters: [
        { label: 'mid ts', value: 4 },
        { label: '4 <= 3?', value: 'NO → eliminated' },
        { label: 'result ts', value: 1 },
        { label: 'return', value: '"bar"' },
      ],
    } as ArrayState,
  });

  // ── get("foo", 5) — binary search for largest ts <= 5 ────────────────────

  steps.push({
    explanation:
      'get("foo", 5): find the largest timestamp <= 5 in [1, 4]. l=0, r=1.',
    highlightLine: 10,
    state: {
      type: 'array',
      cells: [
        { value: 1, state: 'window' as const },
        { value: 4, state: 'window' as const },
      ],
      pointers: [
        { index: 0, label: 'l' },
        { index: 1, label: 'r' },
      ],
      hashmap: { 'foo[ts=1]': '"bar"', 'foo[ts=4]': '"bar2"' },
      counters: [
        { label: 'operation', value: 'get("foo", 5)' },
        { label: 'query timestamp', value: 5 },
        { label: 'result', value: '?' },
      ],
    } as ArrayState,
  });

  steps.push({
    explanation:
      'l=0, r=1, mid=0. timestamps[0]=1. 1 <= 5? YES → l=mid+1=1. Now l=1, r=1, mid=1. timestamps[1]=4. 4 <= 5? YES → l=mid+1=2. Loop ends (l > r). Last valid was index 1 → timestamps[1]=4, value="bar2". Return "bar2".',
    highlightLine: 10,
    state: {
      type: 'array',
      cells: [
        { value: 1, state: 'visited' as const },
        { value: 4, state: 'found' as const },
      ],
      pointers: [{ index: 1, label: 'result (ts=4)' }],
      hashmap: { 'foo[ts=1]': '"bar"', 'foo[ts=4]': '"bar2"' },
      counters: [
        { label: 'operation', value: 'get("foo", 5)' },
        { label: 'query timestamp', value: 5 },
        { label: 'ts[0]=1 <= 5?', value: 'YES → keep, go right' },
        { label: 'ts[1]=4 <= 5?', value: 'YES → keep, go right' },
        { label: 'return', value: '"bar2"' },
      ],
    } as ArrayState,
  });

  steps.push({
    explanation:
      'Summary: set() is O(1) — just append. get() is O(log n) — binary search on sorted timestamps for the key. Space O(total set calls). The key insight: since timestamps in set() are strictly increasing, the list is always sorted, enabling binary search.',
    highlightLine: 14,
    state: {
      type: 'array',
      cells: [
        { value: 1, state: 'visited' as const },
        { value: 4, state: 'found' as const },
      ],
      pointers: [],
      hashmap: { 'foo[ts=1]': '"bar"', 'foo[ts=4]': '"bar2"' },
      counters: [
        { label: 'set() time', value: 'O(1)' },
        { label: 'get() time', value: 'O(log n)' },
        { label: 'space', value: 'O(total sets)' },
      ],
    } as ArrayState,
  });

  return steps;
}

const solution: SolutionVariant = {
  label: 'Binary Search on Sorted Timestamps',
  pythonCode: PYTHON_CODE,
  generateSteps,
};

export const timeBasedKeyValueStoreMeta: AlgorithmMeta = {
  id: 'time-based-key-value-store',
  lcNumber: 981,
  title: 'Time Based Key-Value Store',
  difficulty: 'Medium',
  category: 'binary-search',
  tags: ['Hash Map', 'Binary Search', 'Design'],
  timeComplexity: 'O(log n)',
  spaceComplexity: 'O(n)',
  description:
    'Design a time-based key-value store that stores values with timestamps and retrieves the value for a key at the largest timestamp <= the queried timestamp.',
  examples: [
    {
      input:
        '["TimeMap","set","get","get","set","get","get"], [[],["foo","bar",1],["foo",1],["foo",3],["foo","bar2",4],["foo",4],["foo",5]]',
      output: '[null,null,"bar","bar",null,"bar2","bar2"]',
    },
  ] as ProblemExample[],
  constraints: [
    '1 ≤ key.length, value.length ≤ 100',
    'key and value consist of lowercase letters and digits',
    '1 ≤ timestamp ≤ 10⁷',
    'All timestamps of set() are strictly increasing',
    'At most 2 × 10⁵ calls to set and get',
  ],
  hint: 'Store key→list of (timestamp, value) pairs. Since timestamps in set() are strictly increasing, the list stays sorted automatically. For get(), binary search the timestamps list for the largest timestamp ≤ query.',
  solutions: [solution],
};
