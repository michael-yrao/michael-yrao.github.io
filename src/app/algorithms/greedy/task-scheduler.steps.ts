// Solution + comments sourced from cse-progress: dsa/leetcode/greedy/621_task_scheduler.py
import { AlgorithmMeta, SolutionVariant, Step, ArrayCell, ProblemExample } from '../../core/models/algorithm.model';

const SIM_PYTHON = `class Solution:
    def leastInterval(self, tasks: List[str], n: int) -> int:
        # tackle the most frequent task first (it is the bottleneck) → max heap
        # each round we pop n + 1 tasks (that is the cooldown window)
        # leftover tasks (still > 0) go back on the heap
        freqMap = Counter(tasks)
        maxHeap = []
        result = 0

        for key, value in freqMap.items():
            heapq.heappush(maxHeap, (-value, key))

        while maxHeap:
            tasksLeftOver = set()
            for _ in range(n + 1):
                if maxHeap:
                    currentTaskCounter, currentTask = heapq.heappop(maxHeap)
                    currentTaskCounter += 1          # one instance done
                    result += 1
                    if currentTaskCounter < 0:
                        tasksLeftOver.add((currentTaskCounter, currentTask))
                else:
                    if not tasksLeftOver:
                        return result               # all done, no trailing idle
                    result += 1                     # forced idle
            for _ in range(len(tasksLeftOver)):
                heapq.heappush(maxHeap, tasksLeftOver.pop())
        return result`;

const BULK_PYTHON = `class Solution:
    # O(n) — no per-slot idle counting; add a whole cooldown window at once
    def leastInterval(self, tasks: List[str], n: int) -> int:
        freqMap = Counter(tasks)
        maxHeap = []
        for key, value in freqMap.items():
            heapq.heappush(maxHeap, (-value, key))

        interval = 0
        maxTaskToDo = n + 1
        while maxHeap:
            sizeOfHeap = len(maxHeap)
            tasksToQueue = min(maxTaskToDo, sizeOfHeap)
            tasksToAddBack = set()
            for _ in range(tasksToQueue):
                currentCounter, currentTask = heapq.heappop(maxHeap)
                currentCounter += 1
                if currentCounter < 0:
                    tasksToAddBack.add((currentCounter, currentTask))
            for currentCounter, currentTask in tasksToAddBack:
                heapq.heappush(maxHeap, (currentCounter, currentTask))
            # full window needed only if tasks remain; else just what we did
            if len(maxHeap) > 0:
                interval += maxTaskToDo
            else:
                interval += tasksToQueue
        return interval`;

const TASKS = ['A', 'A', 'A', 'B', 'B', 'B'];
const N = 2;

// Render the max-heap (task → remaining count) as array cells, highlighting one.
function heapCells(remaining: Record<string, number>, active: string | null): ArrayCell[] {
  return Object.keys(remaining)
    .filter((t) => remaining[t] > 0)
    .sort((a, b) => remaining[b] - remaining[a] || a.localeCompare(b))
    .map((t) => ({ value: `${t}×${remaining[t]}`, state: t === active ? 'active' : 'default' }));
}

function heapItems(remaining: Record<string, number>): (string | number)[] {
  return Object.keys(remaining)
    .filter((t) => remaining[t] > 0)
    .sort((a, b) => remaining[b] - remaining[a] || a.localeCompare(b))
    .map((t) => `(-${remaining[t]}, ${t})`);
}

// ── Variant A: per-slot simulation counting idles ─────────────────────────────
function generateSimSteps(): Step[] {
  const steps: Step[] = [];
  const remaining: Record<string, number> = {};
  TASKS.forEach((t) => (remaining[t] = (remaining[t] ?? 0) + 1));
  let result = 0;
  const timeline: string[] = [];

  steps.push({
    explanation:
      'Count each task (A×3, B×3) and push onto a max-heap keyed by frequency. The most frequent task is the bottleneck, so we always schedule it first. n = 2 → each cooldown window holds n+1 = 3 slots.',
    highlightLine: 6,
    state: {
      type: 'array',
      cells: heapCells(remaining, null),
      pointers: [],
      stackItems: heapItems(remaining),
      counters: [{ label: 'result', value: 0 }, { label: 'n+1', value: N + 1 }],
    },
    variables: [],
  });

  let round = 0;
  while (Object.values(remaining).some((c) => c > 0)) {
    round++;
    const leftover: [string, number][] = [];
    steps.push({
      explanation: `Round ${round}: open a fresh cooldown window of ${N + 1} slots. tasksLeftOver = {}. Pop up to ${N + 1} distinct tasks; anything still remaining after this round goes back on the heap.`,
      highlightLine: 15,
      state: {
        type: 'array',
        cells: heapCells(remaining, null),
        pointers: [],
        stackItems: heapItems(remaining),
        counters: [{ label: 'round', value: round }, { label: 'result', value: result }],
      },
      variables: [{ name: 'timeline', value: timeline.join(' ') || '—' }],
    });

    for (let slot = 0; slot < N + 1; slot++) {
      const avail = Object.keys(remaining)
        .filter((t) => remaining[t] > 0)
        .sort((a, b) => remaining[b] - remaining[a] || a.localeCompare(b));
      if (avail.length > 0) {
        const task = avail[0];
        remaining[task]--;
        result++;
        timeline.push(task);
        if (remaining[task] > 0) leftover.push([task, remaining[task]]);
        steps.push({
          explanation: `Slot ${slot + 1}: pop the most frequent task ${task} and run it (result → ${result}). It now has ${remaining[task]} left${remaining[task] > 0 ? ' → set aside to re-add after the window' : ' → done, drops out'}.`,
          highlightLine: 20,
          state: {
            type: 'array',
            cells: heapCells(remaining, task),
            pointers: [],
            stackItems: heapItems(remaining),
            counters: [
              { label: 'round', value: round },
              { label: 'slot', value: `${slot + 1}/${N + 1}` },
              { label: 'result', value: result },
            ],
          },
          variables: [
            { name: 'currentTask', value: task, highlight: true },
            { name: 'result', value: result },
            { name: 'timeline', value: timeline.join(' ') },
          ],
        });
      } else {
        // heap empty this slot
        if (leftover.length === 0) {
          steps.push({
            explanation: `Slot ${slot + 1}: heap is empty AND nothing is set aside → every task is scheduled. Return result = ${result} with no trailing idle.`,
            highlightLine: 24,
            state: {
              type: 'array',
              cells: [],
              pointers: [],
              stackItems: [],
              counters: [{ label: 'result (final)', value: result }],
            },
            variables: [
              { name: 'return', value: result, highlight: true },
              { name: 'timeline', value: timeline.join(' ') },
            ],
          });
          return steps;
        }
        result++;
        timeline.push('idle');
        steps.push({
          explanation: `Slot ${slot + 1}: heap is empty but tasks are set aside for the next window → forced idle. result → ${result}.`,
          highlightLine: 25,
          state: {
            type: 'array',
            cells: heapCells(remaining, null),
            pointers: [],
            stackItems: heapItems(remaining),
            counters: [
              { label: 'round', value: round },
              { label: 'slot', value: `${slot + 1}/${N + 1} (idle)` },
              { label: 'result', value: result },
            ],
          },
          variables: [
            { name: 'idle', value: 'yes', highlight: true },
            { name: 'timeline', value: timeline.join(' ') },
          ],
        });
      }
    }

    if (leftover.length > 0) {
      steps.push({
        explanation: `End of round ${round}: push the set-aside tasks back on the heap [${leftover.map(([t, c]) => `${t}×${c}`).join(', ')}] and start the next window.`,
        highlightLine: 27,
        state: {
          type: 'array',
          cells: heapCells(remaining, null),
          pointers: [],
          stackItems: heapItems(remaining),
          counters: [{ label: 'result', value: result }],
        },
        variables: [{ name: 'timeline', value: timeline.join(' ') }],
      });
    }
  }

  steps.push({
    explanation: `Heap empty → return result = ${result}. Timeline: ${timeline.join(' ')}.`,
    highlightLine: 29,
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

// ── Variant B: O(n) bulk-interval, no per-slot idle counting ──────────────────
function generateBulkSteps(): Step[] {
  const steps: Step[] = [];
  const remaining: Record<string, number> = {};
  TASKS.forEach((t) => (remaining[t] = (remaining[t] ?? 0) + 1));
  let interval = 0;
  const maxTaskToDo = N + 1;

  steps.push({
    explanation:
      'Same max-heap, but never count idles one-by-one. Each round we process min(heapSize, n+1) tasks, then jump the clock: a full n+1 window if any tasks remain (the gap must be filled), otherwise just the tasks we actually did.',
    highlightLine: 5,
    state: {
      type: 'array',
      cells: heapCells(remaining, null),
      pointers: [],
      stackItems: heapItems(remaining),
      counters: [{ label: 'interval', value: 0 }, { label: 'n+1', value: maxTaskToDo }],
    },
    variables: [],
  });

  let round = 0;
  while (Object.values(remaining).some((c) => c > 0)) {
    round++;
    const sizeOfHeap = Object.keys(remaining).filter((t) => remaining[t] > 0).length;
    const tasksToQueue = Math.min(maxTaskToDo, sizeOfHeap);

    steps.push({
      explanation: `Round ${round}: heap has ${sizeOfHeap} distinct tasks. tasksToQueue = min(${maxTaskToDo}, ${sizeOfHeap}) = ${tasksToQueue}. Pop that many and decrement each.`,
      highlightLine: 15,
      state: {
        type: 'array',
        cells: heapCells(remaining, null),
        pointers: [],
        stackItems: heapItems(remaining),
        counters: [
          { label: 'round', value: round },
          { label: 'tasksToQueue', value: tasksToQueue },
          { label: 'interval', value: interval },
        ],
      },
      variables: [{ name: 'sizeOfHeap', value: sizeOfHeap }],
    });

    for (let i = 0; i < tasksToQueue; i++) {
      const task = Object.keys(remaining)
        .filter((t) => remaining[t] > 0)
        .sort((a, b) => remaining[b] - remaining[a] || a.localeCompare(b))[0];
      remaining[task]--;
      steps.push({
        explanation: `Pop ${task}, run one instance → ${remaining[task]} left${remaining[task] > 0 ? ' (re-added after the round)' : ' (done)'}.`,
        highlightLine: 18,
        state: {
          type: 'array',
          cells: heapCells(remaining, task),
          pointers: [],
          stackItems: heapItems(remaining),
          counters: [
            { label: 'round', value: round },
            { label: 'popped', value: `${i + 1}/${tasksToQueue}` },
            { label: 'interval', value: interval },
          ],
        },
        variables: [{ name: 'currentTask', value: task, highlight: true }],
      });
    }

    const stillLeft = Object.values(remaining).some((c) => c > 0);
    interval += stillLeft ? maxTaskToDo : tasksToQueue;
    steps.push({
      explanation: stillLeft
        ? `Tasks still remain → this window must be padded to the full ${maxTaskToDo}. interval += ${maxTaskToDo} → ${interval}.`
        : `Heap is now empty → no trailing padding needed. interval += tasksToQueue (${tasksToQueue}) → ${interval}.`,
      highlightLine: stillLeft ? 24 : 26,
      state: {
        type: 'array',
        cells: heapCells(remaining, null),
        pointers: [],
        stackItems: heapItems(remaining),
        counters: [
          { label: 'round', value: round },
          { label: 'interval', value: interval, },
        ],
      },
      variables: [{ name: 'interval', value: interval, highlight: true }],
    });
  }

  steps.push({
    explanation: `Heap empty → return interval = ${interval}. Same answer as the per-slot simulation, computed without touching individual idle slots.`,
    highlightLine: 27,
    state: {
      type: 'array',
      cells: [],
      pointers: [],
      stackItems: [],
      counters: [{ label: 'interval (final)', value: interval }],
    },
    variables: [{ name: 'return', value: interval, highlight: true }],
  });

  return steps;
}

const simVariant: SolutionVariant = {
  label: 'Max-Heap Simulation (count idles)',
  pythonCode: SIM_PYTHON,
  generateSteps: generateSimSteps,
  timeComplexity: 'O(total intervals)',
  spaceComplexity: 'O(1) — at most 26 tasks',
};

const bulkVariant: SolutionVariant = {
  label: 'Max-Heap O(n) (bulk intervals)',
  pythonCode: BULK_PYTHON,
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
