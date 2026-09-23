import { AlgorithmMeta, SolutionVariant, Step, ArrayCell, ProblemExample } from '../../core/models/algorithm.model';

// Both variants below trace their cse-progress attempts (leastInterval, leastInterval_20260809)
// with an EXPLICIT heap array, not a recomputed-each-slot `remaining` count: recomputing
// "most frequent remaining" from scratch every slot let the same task be picked twice inside
// one cooldown window, which the real heap (item removed on pop, only returned at round's end)
// never allows. Heap entries are kept as [negCount, task] pairs, matching Python's
// heapq.heappush(maxHeap, (-count, task)) convention.

const TASKS = ['A', 'A', 'A', 'B', 'B', 'B'];
const N = 2;

/** [negative count, task] — mirrors Python's (-value, key) heap tuples. */
type HeapEntry = readonly [number, string];

/** heapq pops the smallest tuple first: most-negative count first, ties broken by task letter
 *  (heapq compares the tuple's 2nd element next). */
function heapSort(entries: readonly HeapEntry[]): HeapEntry[] {
  return [...entries].sort(([negA, taskA], [negB, taskB]) => negA - negB || taskA.localeCompare(taskB));
}

function buildInitialHeap(tasks: readonly string[]): HeapEntry[] {
  const freq = new Map<string, number>();
  tasks.forEach((t) => freq.set(t, (freq.get(t) ?? 0) + 1));
  const entries: HeapEntry[] = [...freq.entries()].map(([task, count]) => [-count, task]);
  return heapSort(entries);
}

function heapCells(heap: readonly HeapEntry[], active: string | null): ArrayCell[] {
  return heap.map(([negCount, task]) => ({
    value: `${task}×${-negCount}`,
    state: task === active ? ('active' as const) : ('default' as const),
  }));
}

function heapItems(heap: readonly HeapEntry[]): (string | number)[] {
  return heap.map(([negCount, task]) => `(${negCount}, ${task})`);
}

// ── Variant A: leastInterval — per-slot simulation counting idles ─────────────
function generateSimSteps(): Step[] {
  const steps: Step[] = [];
  let heap = buildInitialHeap(TASKS);
  let result = 0;

  steps.push({
    explanation:
      'Count each task (A×3, B×3) and push (−count, task) onto a heap — heapq pops the most negative first, i.e. the current highest count. n = 2 → each cooldown window holds n+1 = 3 slots.',
    anchor: { match: 'for key, value in freqMap.items():', to: { match: 'heapq.heappush(maxHeap,(-value, key))' } },
    state: {
      type: 'array',
      cells: heapCells(heap, null),
      pointers: [],
      stackItems: heapItems(heap),
      counters: [{ label: 'result', value: 0 }, { label: 'n+1', value: N + 1 }],
    },
    variables: [],
  });

  let round = 0;
  while (heap.length > 0) {
    round++;
    let tasksLeftOver: HeapEntry[] = [];

    steps.push({
      explanation: `Round ${round}: tasksLeftOver = set(). Pop up to n+1=${N + 1} tasks off maxHeap this window; anything still negative after +1 goes into tasksLeftOver to push back at the end of the round.`,
      anchor: { match: 'tasksLeftOver = set()' },
      state: {
        type: 'array',
        cells: heapCells(heap, null),
        pointers: [],
        stackItems: heapItems(heap),
        counters: [{ label: 'round', value: round }, { label: 'result', value: result }],
      },
      variables: [],
    });

    for (let slot = 0; slot < N + 1; slot++) {
      if (heap.length > 0) {
        const [negCount, task] = heap[0];
        heap = heap.slice(1);
        const currentTaskCounter = negCount + 1;
        result++;
        if (currentTaskCounter < 0) tasksLeftOver = [...tasksLeftOver, [currentTaskCounter, task]];

        steps.push({
          explanation: `Slot ${slot + 1}: pop (${negCount}, ${task}) off maxHeap. currentTaskCounter = ${negCount} + 1 = ${currentTaskCounter}. result += 1 → ${result}. ${currentTaskCounter < 0 ? `Still negative → tasksLeftOver.add((${currentTaskCounter}, ${task})).` : `Reached 0 → ${task} drops out (not re-added).`}`,
          anchor: { match: 'currentTaskCounter, currentTask = heapq.heappop(maxHeap)', to: { match: 'tasksLeftOver.add((currentTaskCounter, currentTask))' } },
          state: {
            type: 'array',
            cells: heapCells(heap, task),
            pointers: [],
            stackItems: heapItems(heap),
            counters: [
              { label: 'round', value: round },
              { label: 'slot', value: `${slot + 1}/${N + 1}` },
              { label: 'result', value: result },
            ],
          },
          variables: [
            { name: 'currentTask', value: task, highlight: true },
            { name: 'currentTaskCounter', value: currentTaskCounter },
            { name: 'result', value: result },
          ],
        });
      } else if (tasksLeftOver.length === 0) {
        steps.push({
          explanation: `Slot ${slot + 1}: maxHeap is empty AND tasksLeftOver is empty → every task is scheduled. Return result = ${result} with no trailing idle.`,
          // nth 1 hit: contract line 132 `return result` (the loop's early return).
          // skips line 138, the loop's final `return result`.
          anchor: { match: 'if not tasksLeftOver:', to: { match: 'return result', nth: 1 } },
          state: {
            type: 'array',
            cells: [],
            pointers: [],
            stackItems: [],
            counters: [{ label: 'result (final)', value: result }],
          },
          variables: [{ name: 'return', value: result, highlight: true }],
        });
        return steps;
      } else {
        result++;
        steps.push({
          explanation: `Slot ${slot + 1}: maxHeap is empty but tasksLeftOver is non-empty → forced idle. result += 1 → ${result}.`,
          // nth 2 hit: contract line 134 `result+=1` (the else/idle branch's increment).
          // skips line 124, the pop branch's `result+=1`.
          anchor: { match: 'else:', to: { match: 'result+=1', nth: 2 } },
          state: {
            type: 'array',
            cells: heapCells(heap, null),
            pointers: [],
            stackItems: heapItems(heap),
            counters: [
              { label: 'round', value: round },
              { label: 'slot', value: `${slot + 1}/${N + 1} (idle)` },
              { label: 'result', value: result },
            ],
          },
          variables: [{ name: 'idle', value: 'yes', highlight: true }],
        });
      }
    }

    if (tasksLeftOver.length > 0) {
      heap = heapSort([...heap, ...tasksLeftOver]);
      steps.push({
        explanation: `End of round ${round}: push tasksLeftOver [${tasksLeftOver.map(([c, t]) => `(${c}, ${t})`).join(', ')}] back onto maxHeap → [${heapItems(heap).join(', ')}].`,
        anchor: { match: 'for _ in range(len(tasksLeftOver)):', to: { match: 'heapq.heappush(maxHeap, tasksLeftOver.pop())' } },
        state: {
          type: 'array',
          cells: heapCells(heap, null),
          pointers: [],
          stackItems: heapItems(heap),
          counters: [{ label: 'result', value: result }],
        },
        variables: [],
      });
    }
  }

  steps.push({
    explanation: `maxHeap is empty → return result = ${result}.`,
    // nth 2 hit: contract line 138, the loop's final `return result`.
    // skips line 132, the loop's early `return result`.
    anchor: { match: 'return result', nth: 2 },
    state: {
      type: 'array',
      cells: [],
      pointers: [],
      stackItems: [],
      counters: [{ label: 'result (final)', value: result }],
    },
    variables: [{ name: 'return', value: result, highlight: true }],
  });

  return steps;
}

// ── Variant B: leastInterval_20260809 — O(n) bulk-interval, no per-slot idles ─
function generateBulkSteps(): Step[] {
  const steps: Step[] = [];
  let heap = buildInitialHeap(TASKS);
  let intervals = 0;
  const tasksPerCycle = N + 1;

  steps.push({
    explanation:
      'Same heap, built the same way, but never counts idle slots one-by-one. Each round pops min(numUniqueTasks, tasksPerCycle) tasks, then jumps the clock: a full tasksPerCycle window if any tasks remain (the gap must be filled), otherwise just the tasks actually done.',
    anchor: { match: 'for task, freq in freqMap.items():', to: { match: 'heapq.heappush(maxHeap,(-freq, task))' } },
    state: {
      type: 'array',
      cells: heapCells(heap, null),
      pointers: [],
      stackItems: heapItems(heap),
      counters: [{ label: 'intervals', value: 0 }, { label: 'tasksPerCycle', value: tasksPerCycle }],
    },
    variables: [],
  });

  let round = 0;
  while (heap.length > 0) {
    round++;
    const numUniqueTasks = heap.length;
    const maxAllotedTasks = Math.min(tasksPerCycle, numUniqueTasks);
    let tasksLeft: HeapEntry[] = [];

    steps.push({
      explanation: `Round ${round}: numUniqueTasks = len(maxHeap) = ${numUniqueTasks}. maxAllotedTasks = min(tasksPerCycle, numUniqueTasks) = min(${tasksPerCycle}, ${numUniqueTasks}) = ${maxAllotedTasks}. Pop that many and increment each.`,
      anchor: { match: 'numUniqueTasks = len(maxHeap)', to: { match: 'tasksLeft = []' } },
      state: {
        type: 'array',
        cells: heapCells(heap, null),
        pointers: [],
        stackItems: heapItems(heap),
        counters: [
          { label: 'round', value: round },
          { label: 'maxAllotedTasks', value: maxAllotedTasks },
          { label: 'intervals', value: intervals },
        ],
      },
      variables: [{ name: 'numUniqueTasks', value: numUniqueTasks }],
    });

    for (let i = 0; i < maxAllotedTasks; i++) {
      const [negFreq, task] = heap[0];
      heap = heap.slice(1);
      const currentTaskFreq = negFreq + 1;
      if (currentTaskFreq !== 0) tasksLeft = [...tasksLeft, [currentTaskFreq, task]];

      steps.push({
        explanation: `Pop (${negFreq}, ${task}) off maxHeap. currentTaskFreq = ${negFreq} + 1 = ${currentTaskFreq}. ${currentTaskFreq !== 0 ? `!= 0 → tasksLeft.append((${currentTaskFreq}, ${task})).` : `== 0 → ${task} is done, not re-added.`}`,
        anchor: { match: 'currentTaskFreq, currentTask = heapq.heappop(maxHeap)', to: { match: 'tasksLeft.append((currentTaskFreq,currentTask))' } },
        state: {
          type: 'array',
          cells: heapCells(heap, task),
          pointers: [],
          stackItems: heapItems(heap),
          counters: [
            { label: 'round', value: round },
            { label: 'popped', value: `${i + 1}/${maxAllotedTasks}` },
            { label: 'intervals', value: intervals },
          ],
        },
        variables: [
          { name: 'currentTask', value: task, highlight: true },
          { name: 'currentTaskFreq', value: currentTaskFreq },
        ],
      });
    }

    heap = heapSort([...heap, ...tasksLeft]);
    if (tasksLeft.length > 0) {
      steps.push({
        explanation: `Push tasksLeft [${tasksLeft.map(([c, t]) => `(${c}, ${t})`).join(', ')}] back onto maxHeap → [${heapItems(heap).join(', ')}].`,
        anchor: { match: 'for taskFreq, task in tasksLeft:', to: { match: 'heapq.heappush(maxHeap,(taskFreq,task))' } },
        state: {
          type: 'array',
          cells: heapCells(heap, null),
          pointers: [],
          stackItems: heapItems(heap),
          counters: [{ label: 'round', value: round }, { label: 'intervals', value: intervals }],
        },
        variables: [],
      });
    }

    const stillLeft = heap.length > 0;
    intervals += stillLeft ? tasksPerCycle : maxAllotedTasks;
    steps.push({
      explanation: stillLeft
        ? `maxHeap is non-empty → this window must be padded to the full tasksPerCycle. intervals += ${tasksPerCycle} → ${intervals}.`
        : `maxHeap is now empty → no trailing padding needed. intervals += maxAllotedTasks (${maxAllotedTasks}) → ${intervals}.`,
      anchor: stillLeft
        ? { match: 'if maxHeap:', to: { match: 'intervals+=tasksPerCycle' } }
        : { match: 'else:', to: { match: 'intervals+=maxAllotedTasks' } },
      state: {
        type: 'array',
        cells: heapCells(heap, null),
        pointers: [],
        stackItems: heapItems(heap),
        counters: [
          { label: 'round', value: round },
          { label: 'intervals', value: intervals },
        ],
      },
      variables: [{ name: 'intervals', value: intervals, highlight: true }],
    });
  }

  steps.push({
    explanation: `maxHeap is empty → return intervals = ${intervals}. Same answer as the per-slot simulation, computed without touching individual idle slots.`,
    anchor: { match: 'return intervals' },
    state: {
      type: 'array',
      cells: [],
      pointers: [],
      stackItems: [],
      counters: [{ label: 'intervals (final)', value: intervals }],
    },
    variables: [{ name: 'return', value: intervals, highlight: true }],
  });

  return steps;
}

const simVariant: SolutionVariant = {
  label: 'Max-Heap Simulation (count idles)',
  variant: 'heap-simulation',
  generateSteps: generateSimSteps,
  timeComplexity: 'O(total intervals)',
  spaceComplexity: 'O(1) — at most 26 tasks',
};

const bulkVariant: SolutionVariant = {
  label: 'Max-Heap O(n) (bulk intervals)',
  variant: 'heap-bulk',
  generateSteps: generateBulkSteps,
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(1) — at most 26 tasks',
};

export const taskSchedulerMeta: AlgorithmMeta = {
  id: 'task-scheduler',
  lcNumber: 621,
  title: 'Task Scheduler',
  difficulty: 'Medium',
  category: 'greedy',
  tags: ['Array', 'Hash Table', 'Greedy', 'Heap', 'Counting'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(1)',
  description:
    'Given CPU tasks labeled A–Z and a cooldown n, each interval runs one task or idles. Two identical tasks must be at least n intervals apart. Return the minimum number of intervals to finish all tasks.',
  examples: [
    { input: 'tasks = ["A","A","A","B","B","B"], n = 2', output: '8', explanation: 'A → B → idle → A → B → idle → A → B' },
    { input: 'tasks = ["A","C","A","B","D","B"], n = 1', output: '6' },
    { input: 'tasks = ["A","A","A","B","B","B"], n = 3', output: '10' },
  ] as ProblemExample[],
  constraints: ['1 ≤ tasks.length ≤ 10⁴', 'tasks[i] is an uppercase English letter.', '0 ≤ n ≤ 100'],
  hint: 'The most frequent task is the bottleneck — schedule greedily from a max-heap. Each cooldown window is n+1 slots wide; pop up to n+1 tasks per round, re-adding any that still have count left. Either count idle slots explicitly, or jump the clock by a whole window at a time for O(n).',
  solutions: [simVariant, bulkVariant],
};
