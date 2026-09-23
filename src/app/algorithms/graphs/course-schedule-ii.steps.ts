import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

// Traces cse-progress's findOrder_20260822 verbatim: Kahn's BFS with numRequirements,
// adjMap, queue and result, plus a takenCourses set that's populated but never read (dead
// bookkeeping in the attempt — kept faithfully, not used for any decision below). The
// enqueue check is numRequirements[neighbor] == 0 (not <= 0), same outcome for this input
// since a count is only ever decremented once per prerequisite edge.

// numCourses = 4, prerequisites = [[1,0],[2,0],[3,1],[3,2]]
// Same BFS as 207 but we record the dequeue order → result = [0,1,2,3] or [0,2,1,3]
// In-degrees: 0→0, 1→1, 2→1, 3→2
// BFS dequeue order: 0 → 1 → 2 → 3  (result list built as we dequeue)

const adjHashmap: Record<string, string> = {
  '0': '[1,2]',
  '1': '[3]',
  '2': '[3]',
  '3': '[]',
};

const adj: Record<number, number[]> = { 0: [1, 2], 1: [3], 2: [3], 3: [] };

function makeCells(
  active: number | null,
  visited: Set<number>,
  found: Set<number>,
  deg: number[]
) {
  return [0, 1, 2, 3].map(i => ({
    value: deg[i] as string | number,
    state:
      found.has(i)
        ? ('found' as const)
        : i === active
        ? ('active' as const)
        : visited.has(i)
        ? ('visited' as const)
        : ('default' as const),
  }));
}

function generateStepsBFS(): Step[] {
  const steps: Step[] = [];
  const numCourses = 4;
  const deg = [0, 1, 1, 2];
  const visited = new Set<number>();
  const found = new Set<number>();
  const courseList: number[] = [];
  const takenCourses = new Set<number>();
  const queue: number[] = [];

  // Step 0: Introduction
  steps.push({
    explanation: `Course Schedule II: find the order to take all 4 courses given prerequisites [[1,0],[2,0],[3,1],[3,2]]. Same Kahn's BFS as Course Schedule I, but now we record each dequeued course into result to build the ordering. Cell values show each course's current in-degree.`,
    anchor: { match: 'numRequirements = [0] * numCourses' },
    state: {
      type: 'array',
      cells: [0, 1, 2, 3].map(i => ({ value: deg[i] as string | number, state: 'default' as const })),
      pointers: [
        { index: 0, label: 'course 0' },
        { index: 1, label: 'course 1' },
        { index: 2, label: 'course 2' },
        { index: 3, label: 'course 3' },
      ],
      hashmap: adjHashmap,
      counters: [
        { label: 'queue', value: '[]' },
        { label: 'result order', value: '[]' },
      ],
    },
    variables: [
      { name: 'numCourses', value: numCourses },
      { name: 'prerequisites', value: '[[1,0],[2,0],[3,1],[3,2]]' },
    ],
  });

  // Step 1: Build canTake and prereqMap
  steps.push({
    explanation: `Build numRequirements and adjMap. For each (course, prereq): adjMap[prereq].append(course), then numRequirements[course]++. Result: numRequirements = [0,1,1,2], adjMap = {0:[1,2], 1:[3], 2:[3]}. result starts empty — it will be filled as we take courses.`,
    anchor: { match: 'for course, prereq in prerequisites:', to: { match: 'numRequirements[course]+=1' } },
    state: {
      type: 'array',
      cells: [0, 1, 2, 3].map(i => ({ value: deg[i] as string | number, state: 'default' as const })),
      pointers: [],
      hashmap: adjHashmap,
      counters: [
        { label: 'queue', value: '[]' },
        { label: 'result order', value: '[]' },
      ],
    },
    variables: [
      { name: 'numRequirements', value: '[0,1,1,2]' },
      { name: 'adjMap', value: '{0:[1,2], 1:[3], 2:[3]}' },
      { name: 'result', value: '[]' },
    ],
  });

  // Step 2: Seed queue
  queue.push(0);
  steps.push({
    explanation: `Seed BFS queue: scan numRequirements for all indices with value 0. Only course 0 has in-degree 0. queue = [0]. These are the courses with no prerequisites — our BFS entry points.`,
    anchor: { match: 'for i in range(numCourses):', to: { match: 'queue.append(i)' } },
    state: {
      type: 'array',
      cells: makeCells(0, new Set(), new Set(), deg),
      pointers: [{ index: 0, label: 'queued' }],
      hashmap: adjHashmap,
      counters: [
        { label: 'queue', value: '[0]' },
        { label: 'result order', value: '[]' },
      ],
    },
    variables: [{ name: 'queue', value: '[0]' }],
  });

  // BFS iteration 1: dequeue 0
  queue.shift();
  takenCourses.add(0);
  courseList.push(0);
  visited.add(0);

  steps.push({
    explanation: `BFS iteration 1: dequeue course 0. takenCourses.add(0); result.append(0) → result = [${courseList.join(', ')}]. Process adjMap[0] = [${adj[0].join(', ')}]: decrement their in-degrees since course 0 is now taken.`,
    anchor: { match: 'currentCourse = queue.popleft()', to: { match: 'result.append(currentCourse)' } },
    state: {
      type: 'array',
      cells: makeCells(0, visited, found, deg),
      pointers: [{ index: 0, label: 'taken' }],
      hashmap: adjHashmap,
      counters: [
        { label: 'queue', value: '[]' },
        { label: 'result order', value: `[${courseList.join(', ')}]` },
      ],
    },
    variables: [
      { name: 'currentCourse', value: 0 },
      { name: 'result', value: `[${courseList.join(', ')}]` },
    ],
  });

  deg[1]--;
  deg[2]--;
  queue.push(1, 2);

  steps.push({
    explanation: `Decrement neighbors of course 0. numRequirements[1]: 1→0 (enqueue). numRequirements[2]: 1→0 (enqueue). queue = [1, 2]. Both courses 1 and 2 are now available to take.`,
    anchor: { match: 'for neighbor in adjMap[currentCourse]:', to: { match: 'queue.append(neighbor)' } },
    state: {
      type: 'array',
      cells: makeCells(null, visited, found, deg),
      pointers: [
        { index: 1, label: 'in-deg→0' },
        { index: 2, label: 'in-deg→0' },
      ],
      hashmap: adjHashmap,
      counters: [
        { label: 'queue', value: '[1, 2]' },
        { label: 'result order', value: `[${courseList.join(', ')}]` },
      ],
    },
    variables: [
      { name: 'numRequirements[1]', value: deg[1] },
      { name: 'numRequirements[2]', value: deg[2] },
    ],
  });

  // BFS iteration 2: dequeue 1
  queue.shift();
  takenCourses.add(1);
  courseList.push(1);
  visited.add(1);

  steps.push({
    explanation: `BFS iteration 2: dequeue course 1. takenCourses.add(1); result.append(1) → result = [${courseList.join(', ')}]. Process adjMap[1] = [${adj[1].join(', ')}]: decrement numRequirements[3].`,
    anchor: { match: 'currentCourse = queue.popleft()', to: { match: 'result.append(currentCourse)' } },
    state: {
      type: 'array',
      cells: makeCells(1, visited, found, deg),
      pointers: [{ index: 1, label: 'taken' }],
      hashmap: adjHashmap,
      counters: [
        { label: 'queue', value: '[2]' },
        { label: 'result order', value: `[${courseList.join(', ')}]` },
      ],
    },
    variables: [
      { name: 'currentCourse', value: 1 },
      { name: 'result', value: `[${courseList.join(', ')}]` },
    ],
  });

  deg[3]--;

  steps.push({
    explanation: `numRequirements[3]: 2→1. Course 3 still needs course 2 — not yet takeable. Continue BFS.`,
    anchor: { match: 'for neighbor in adjMap[currentCourse]:', to: { match: 'queue.append(neighbor)' } },
    state: {
      type: 'array',
      cells: makeCells(null, visited, found, deg),
      pointers: [{ index: 3, label: 'in-deg→1' }],
      hashmap: adjHashmap,
      counters: [
        { label: 'queue', value: '[2]' },
        { label: 'result order', value: `[${courseList.join(', ')}]` },
      ],
    },
    variables: [{ name: 'numRequirements[3]', value: deg[3] }],
  });

  // BFS iteration 3: dequeue 2
  queue.shift();
  takenCourses.add(2);
  courseList.push(2);
  visited.add(2);

  steps.push({
    explanation: `BFS iteration 3: dequeue course 2. takenCourses.add(2); result.append(2) → result = [${courseList.join(', ')}]. Process adjMap[2] = [${adj[2].join(', ')}]: decrement numRequirements[3].`,
    anchor: { match: 'currentCourse = queue.popleft()', to: { match: 'result.append(currentCourse)' } },
    state: {
      type: 'array',
      cells: makeCells(2, visited, found, deg),
      pointers: [{ index: 2, label: 'taken' }],
      hashmap: adjHashmap,
      counters: [
        { label: 'queue', value: '[]' },
        { label: 'result order', value: `[${courseList.join(', ')}]` },
      ],
    },
    variables: [
      { name: 'currentCourse', value: 2 },
      { name: 'result', value: `[${courseList.join(', ')}]` },
    ],
  });

  deg[3]--;
  queue.push(3);

  steps.push({
    explanation: `numRequirements[3]: 1→0 → enqueue course 3. Both prerequisites for course 3 (courses 1 and 2) are now satisfied. queue = [3].`,
    anchor: { match: 'for neighbor in adjMap[currentCourse]:', to: { match: 'queue.append(neighbor)' } },
    state: {
      type: 'array',
      cells: makeCells(null, visited, found, deg),
      pointers: [{ index: 3, label: 'in-deg→0' }],
      hashmap: adjHashmap,
      counters: [
        { label: 'queue', value: '[3]' },
        { label: 'result order', value: `[${courseList.join(', ')}]` },
      ],
    },
    variables: [{ name: 'numRequirements[3]', value: deg[3] }],
  });

  // BFS iteration 4: dequeue 3
  queue.shift();
  takenCourses.add(3);
  courseList.push(3);
  found.add(3);

  steps.push({
    explanation: `BFS iteration 4: dequeue course 3. takenCourses.add(3); result.append(3) → result = [${courseList.join(', ')}]. adjMap[3] is empty. queue empty — BFS complete.`,
    anchor: { match: 'currentCourse = queue.popleft()', to: { match: 'result.append(currentCourse)' } },
    state: {
      type: 'array',
      cells: makeCells(3, visited, found, deg),
      pointers: [{ index: 3, label: 'taken' }],
      hashmap: adjHashmap,
      counters: [
        { label: 'queue', value: '[]' },
        { label: 'result order', value: `[${courseList.join(', ')}]` },
      ],
    },
    variables: [
      { name: 'currentCourse', value: 3 },
      { name: 'result', value: `[${courseList.join(', ')}]` },
    ],
  });

  // Final step
  steps.push({
    explanation: `Result: len(result) = ${courseList.length} != numCourses (${numCourses}) is false, so we fall through to return [${courseList.join(', ')}]. This is a valid topological ordering. No cycle was detected. Another valid order would be [0,2,1,3]. If a cycle existed, result would be shorter than numCourses and we'd return [] instead. O(V+E) time, O(V+E) space.`,
    anchor: { match: 'return result' },
    state: {
      type: 'array',
      cells: [0, 1, 2, 3].map(i => ({
        value: courseList[i] as string | number,
        state: 'found' as const,
      })),
      pointers: [],
      hashmap: adjHashmap,
      counters: [
        { label: 'queue', value: '[]' },
        { label: 'result order', value: `[${courseList.join(', ')}]` },
        { label: 'length check', value: `${courseList.length} == ${numCourses}` },
      ],
    },
    variables: [{ name: 'return', value: `[${courseList.join(', ')}]`, highlight: true }],
  });

  return steps;
}

const solutionBFS: SolutionVariant = {
  label: "Kahn's BFS Topological Sort",
  variant: 'topological',
  generateSteps: generateStepsBFS,
};

export const courseScheduleIIMeta: AlgorithmMeta = {
  id: 'course-schedule-ii',
  lcNumber: 210,
  title: 'Course Schedule II',
  difficulty: 'Medium',
  category: 'graphs',
  tags: ['Topological Sort', 'BFS', 'Cycle Detection'],
  timeComplexity: 'O(V+E)',
  spaceComplexity: 'O(V+E)',
  description:
    'Given numCourses and prerequisites[i] = [a, b] (must take b before a), return the ordering of courses needed to finish all of them. If impossible (cycle), return an empty array.',
  examples: [
    {
      input: 'numCourses = 2, prerequisites = [[1,0]]',
      output: '[0,1]',
      explanation: 'Take course 0 first, then course 1.',
    },
    {
      input: 'numCourses = 4, prerequisites = [[1,0],[2,0],[3,1],[3,2]]',
      output: '[0,2,1,3]',
      explanation: 'Course 0 first (no prereqs), then 1 and 2 in any order, then 3.',
    },
    {
      input: 'numCourses = 1, prerequisites = []',
      output: '[0]',
      explanation: 'Single course, no prerequisites.',
    },
  ] as ProblemExample[],
  constraints: [
    '1 ≤ numCourses ≤ 2000',
    '0 ≤ prerequisites.length ≤ numCourses × (numCourses - 1)',
    'prerequisites[i].length == 2',
    '0 ≤ ai, bi < numCourses',
    'ai != bi',
    'All prerequisite pairs are distinct.',
  ],
  hint: "Extend Course Schedule I: use Kahn's BFS but append each dequeued course to a result list. After BFS, if the result list has numCourses entries, return it (valid topological order). Otherwise a cycle exists — return []. The key insight: a cycle means some nodes can never reach in-degree 0.",
  solutions: [solutionBFS],
};
