import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

// Traces cse-progress's canFinish_20260613 verbatim: Kahn's BFS with prereqMap,
// prereqCounter, canTake and numberOfCoursesTaken. Building prereqMap/prereqCounter
// per row is reordered (append before increment) vs an earlier draft, but the two
// statements are independent, so the resulting state is the same either way.

// numCourses = 4, prerequisites = [[1,0],[2,0],[3,1],[3,2]]
// Adjacency (prereq → course): 0→[1,2], 1→[3], 2→[3]
// inDegrees: course0=0, course1=1, course2=1, course3=2
// BFS: enqueue 0 → take 0, decrement 1→0 and 2→0, enqueue 1,2
//       take 1, decrement 3→1; take 2, decrement 3→0, enqueue 3; take 3 → coursesTaken=4 → true

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
  const deg = [0, 1, 1, 2]; // in-degree per course
  const visited = new Set<number>();
  const found = new Set<number>();
  let coursesTaken = 0;
  const queue: number[] = [];

  // Step 0: Introduction
  steps.push({
    explanation: `Course Schedule: can we finish all 4 courses given prerequisites [[1,0],[2,0],[3,1],[3,2]]? Strategy: Kahn's BFS topological sort. Build prereqCounter (in-degree per course) and prereqMap (prereq → list of dependent courses). Cell values show each course's current in-degree.`,
    anchor: { match: 'prereqCounter = [0] * numCourses' },
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
        { label: 'coursesTaken', value: 0 },
      ],
    },
    variables: [
      { name: 'numCourses', value: numCourses },
      { name: 'prerequisites', value: '[[1,0],[2,0],[3,1],[3,2]]' },
    ],
  });

  // Step 1: Show populated prereqCounter and neighborMap
  steps.push({
    explanation: `Build prereqCounter and prereqMap. For each [course, prereq]: prereqMap[prereq].append(course), then prereqCounter[course]++. Result: prereqCounter = [0,1,1,2], prereqMap = {0:[1,2], 1:[3], 2:[3]}. The hashmap on the right shows prereqMap.`,
    anchor: { match: 'for row in prerequisites:', to: { match: 'prereqCounter[course]+=1' } },
    state: {
      type: 'array',
      cells: [0, 1, 2, 3].map(i => ({ value: deg[i] as string | number, state: 'default' as const })),
      pointers: [],
      hashmap: adjHashmap,
      counters: [
        { label: 'queue', value: '[]' },
        { label: 'coursesTaken', value: 0 },
      ],
    },
    variables: [
      { name: 'prereqCounter', value: '[0,1,1,2]' },
      { name: 'prereqMap', value: '{0:[1,2], 1:[3], 2:[3]}' },
    ],
  });

  // Step 2: Seed queue with in-degree-0 nodes
  queue.push(0);
  steps.push({
    explanation: `Seed BFS queue: scan prereqCounter and enqueue all courses with in-degree 0. Only course 0 qualifies. canTake = [0]. These are the courses with no prerequisites — our BFS starting points.`,
    anchor: { match: 'for i in range(len(prereqCounter)):', to: { match: 'canTake.append(i)' } },
    state: {
      type: 'array',
      cells: makeCells(0, new Set(), new Set(), deg),
      pointers: [{ index: 0, label: 'queued' }],
      hashmap: adjHashmap,
      counters: [
        { label: 'queue', value: '[0]' },
        { label: 'coursesTaken', value: 0 },
      ],
    },
    variables: [{ name: 'canTake', value: '[0]' }],
  });

  // BFS iteration 1: dequeue 0
  queue.shift();
  coursesTaken++;
  visited.add(0);

  steps.push({
    explanation: `BFS iteration 1: dequeue course 0. coursesTaken = ${coursesTaken}. Examine prereqMap[0]: [1, 2]. For each dependent course, decrement its prereqCounter since course 0 is now satisfied.`,
    anchor: { match: 'currentCourse = canTake.popleft()', to: { match: 'numberOfCoursesTaken+=1' } },
    state: {
      type: 'array',
      cells: makeCells(0, visited, found, deg),
      pointers: [{ index: 0, label: 'dequeued' }],
      hashmap: adjHashmap,
      counters: [
        { label: 'queue', value: '[]' },
        { label: 'coursesTaken', value: coursesTaken },
      ],
    },
    variables: [
      { name: 'currentCourse', value: 0 },
      { name: 'neighbors', value: '[1, 2]' },
    ],
  });

  // decrement 1 and 2
  deg[1]--;
  deg[2]--;
  queue.push(1, 2);

  steps.push({
    explanation: `Decrement neighbors of course 0. prereqCounter[1]: 1→0 (enqueue course 1). prereqCounter[2]: 1→0 (enqueue course 2). Queue is now [1, 2]. Cell values updated to reflect new in-degrees.`,
    anchor: { match: 'for course in prereqMap[currentCourse]:', to: { match: 'canTake.append(course)' } },
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
        { label: 'coursesTaken', value: coursesTaken },
      ],
    },
    variables: [
      { name: 'prereqCounter[1]', value: deg[1] },
      { name: 'prereqCounter[2]', value: deg[2] },
    ],
  });

  // BFS iteration 2: dequeue 1
  queue.shift();
  coursesTaken++;
  visited.add(1);

  steps.push({
    explanation: `BFS iteration 2: dequeue course 1. coursesTaken = ${coursesTaken}. Examine prereqMap[1]: [3]. Decrement prereqCounter[3]: 2→1. Course 3 still needs course 2 — not enqueued yet.`,
    anchor: { match: 'currentCourse = canTake.popleft()', to: { match: 'numberOfCoursesTaken+=1' } },
    state: {
      type: 'array',
      cells: makeCells(1, visited, found, deg),
      pointers: [{ index: 1, label: 'dequeued' }],
      hashmap: adjHashmap,
      counters: [
        { label: 'queue', value: '[2]' },
        { label: 'coursesTaken', value: coursesTaken },
      ],
    },
    variables: [
      { name: 'currentCourse', value: 1 },
      { name: 'neighbors', value: '[3]' },
    ],
  });

  deg[3]--;

  steps.push({
    explanation: `prereqCounter[3]: 2→1. Course 3 still has one unsatisfied prerequisite (course 2). It stays out of the queue. Continue dequeuing.`,
    anchor: { match: 'for course in prereqMap[currentCourse]:', to: { match: 'canTake.append(course)' } },
    state: {
      type: 'array',
      cells: makeCells(null, visited, found, deg),
      pointers: [{ index: 3, label: 'in-deg→1' }],
      hashmap: adjHashmap,
      counters: [
        { label: 'queue', value: '[2]' },
        { label: 'coursesTaken', value: coursesTaken },
      ],
    },
    variables: [{ name: 'prereqCounter[3]', value: deg[3] }],
  });

  // BFS iteration 3: dequeue 2
  queue.shift();
  coursesTaken++;
  visited.add(2);

  steps.push({
    explanation: `BFS iteration 3: dequeue course 2. coursesTaken = ${coursesTaken}. Examine prereqMap[2]: [3]. Decrement prereqCounter[3]: 1→0. Course 3 now has all prerequisites met — enqueue it.`,
    anchor: { match: 'currentCourse = canTake.popleft()', to: { match: 'numberOfCoursesTaken+=1' } },
    state: {
      type: 'array',
      cells: makeCells(2, visited, found, deg),
      pointers: [{ index: 2, label: 'dequeued' }],
      hashmap: adjHashmap,
      counters: [
        { label: 'queue', value: '[]' },
        { label: 'coursesTaken', value: coursesTaken },
      ],
    },
    variables: [
      { name: 'currentCourse', value: 2 },
      { name: 'neighbors', value: '[3]' },
    ],
  });

  deg[3]--;
  queue.push(3);

  steps.push({
    explanation: `prereqCounter[3]: 1→0 → enqueue course 3. Queue is now [3]. All of course 3's prerequisites (courses 1 and 2) have been taken.`,
    anchor: { match: 'for course in prereqMap[currentCourse]:', to: { match: 'canTake.append(course)' } },
    state: {
      type: 'array',
      cells: makeCells(null, visited, found, deg),
      pointers: [{ index: 3, label: 'in-deg→0' }],
      hashmap: adjHashmap,
      counters: [
        { label: 'queue', value: '[3]' },
        { label: 'coursesTaken', value: coursesTaken },
      ],
    },
    variables: [{ name: 'prereqCounter[3]', value: deg[3] }],
  });

  // BFS iteration 4: dequeue 3
  queue.shift();
  coursesTaken++;
  found.add(3);

  steps.push({
    explanation: `BFS iteration 4: dequeue course 3. coursesTaken = ${coursesTaken}. prereqMap[3] is empty — no dependents to decrement. Queue is now empty. BFS complete — all 4 courses taken.`,
    anchor: { match: 'currentCourse = canTake.popleft()', to: { match: 'numberOfCoursesTaken+=1' } },
    state: {
      type: 'array',
      cells: makeCells(3, visited, found, deg),
      pointers: [{ index: 3, label: 'dequeued' }],
      hashmap: adjHashmap,
      counters: [
        { label: 'queue', value: '[]' },
        { label: 'coursesTaken', value: coursesTaken },
      ],
    },
    variables: [
      { name: 'currentCourse', value: 3 },
      { name: 'neighbors', value: '[]' },
    ],
  });

  // Final: result
  steps.push({
    explanation: `Result: numberOfCoursesTaken (${coursesTaken}) >= numCourses (${numCourses}) → return true. Every course was processed in topological order — no cycle exists. If a cycle had existed, some nodes would stay stuck with in-degree > 0 forever, and numberOfCoursesTaken would be < numCourses. O(V+E) time, O(V+E) space.`,
    anchor: { match: 'return numberOfCoursesTaken >= numCourses' },
    state: {
      type: 'array',
      cells: [0, 1, 2, 3].map(i => ({
        value: deg[i] as string | number,
        state: 'found' as const,
      })),
      pointers: [],
      hashmap: adjHashmap,
      counters: [
        { label: 'queue', value: '[]' },
        { label: 'coursesTaken', value: coursesTaken },
        { label: 'result', value: 'true' },
      ],
    },
    variables: [{ name: 'return', value: `${coursesTaken} >= ${numCourses} → true`, highlight: true }],
  });

  return steps;
}

const solutionBFS: SolutionVariant = {
  label: "Kahn's BFS Topological Sort",
  variant: 'topological',
  generateSteps: generateStepsBFS,
};

export const courseScheduleMeta: AlgorithmMeta = {
  id: 'course-schedule',
  lcNumber: 207,
  title: 'Course Schedule',
  difficulty: 'Medium',
  category: 'graphs',
  tags: ['Topological Sort', 'BFS', 'Cycle Detection'],
  timeComplexity: 'O(V+E)',
  spaceComplexity: 'O(V+E)',
  description:
    'There are numCourses courses labeled 0 to numCourses-1. Given prerequisites[i] = [a, b] meaning you must take b before a, return true if you can finish all courses (i.e., no cycle exists), or false otherwise.',
  examples: [
    {
      input: 'numCourses = 2, prerequisites = [[1,0]]',
      output: 'true',
      explanation: 'Take course 0 first, then course 1.',
    },
    {
      input: 'numCourses = 2, prerequisites = [[1,0],[0,1]]',
      output: 'false',
      explanation: 'Courses 0 and 1 depend on each other — a cycle makes it impossible.',
    },
  ] as ProblemExample[],
  constraints: [
    '1 ≤ numCourses ≤ 2000',
    '0 ≤ prerequisites.length ≤ 5000',
    'prerequisites[i].length == 2',
    '0 ≤ ai, bi < numCourses',
    'All prerequisite pairs are unique.',
  ],
  hint: "Use Kahn's BFS: build an in-degree array and adjacency map from prerequisites. Seed the BFS queue with all courses that have in-degree 0. Each time you process a course, decrement the in-degree of its dependents; enqueue any that reach 0. If total courses processed equals numCourses, no cycle — return true.",
  solutions: [solutionBFS],
};
