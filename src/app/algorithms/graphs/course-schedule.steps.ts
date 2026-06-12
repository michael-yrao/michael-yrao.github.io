import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE_BFS = `import collections
from typing import List

class Solution:
    def canFinish(self, numCourses: int, prerequisites: List[List[int]]) -> bool:
        # one big thing that prevented us from solving this problem initially was not properly tracking
        # what if a course had multiple pre-reqs. So this means we should keep track of how many prereqs each node has
        # given 0 <= ai, bi < numCourses, we will initialize prereqCounter = [0] * numCourses
        # then do same thing as we did in our initial thought process

        prereqCounter = [0] * numCourses
        neighborMap = collections.defaultdict(list)
        canTake = collections.deque()
        numbersOfCoursesTaken = 0

        for row in prerequisites:
            course = row[0]
            prereq = row[1]
            prereqCounter[course]+=1
            neighborMap[prereq].append(course)

        # so now we add all nodes with 0s in prereqCounter to canTake
        for i in range(len(prereqCounter)):
            if prereqCounter[i] == 0:
                canTake.append(i)

        # now we do standard BFS
        while canTake:
            currentCourse = canTake.popleft()
            numbersOfCoursesTaken+=1

            # now let's take a look at all the neighbors of currentCourse
            for dependentCourse in neighborMap[currentCourse]:
                # since we already took currentCourse, we decrement prereqCounter[dependentCourse]
                prereqCounter[dependentCourse]-=1
                # if this is now zero, we can take it, so we add it to the queue
                if prereqCounter[dependentCourse] == 0:
                    canTake.append(dependentCourse)

        return numbersOfCoursesTaken >= numCourses`;

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
    explanation: `Course Schedule: can we finish all 4 courses given prerequisites [[1,0],[2,0],[3,1],[3,2]]? Strategy: Kahn's BFS topological sort. Build an in-degree array (number of unsatisfied prerequisites per course) and an adjacency map (prereq → list of dependent courses). Cell values show each course's current in-degree.`,
    highlightLine: 7,
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
    explanation: `Build prereqCounter and neighborMap. For each [course, prereq]: prereqCounter[course]++ and neighborMap[prereq].append(course). Result: prereqCounter = [0,1,1,2], neighborMap = {0:[1,2], 1:[3], 2:[3]}. The hashmap on the right shows the adjacency (neighbor) map.`,
    highlightLine: 16,
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
      { name: 'neighborMap', value: '{0:[1,2], 1:[3], 2:[3]}' },
    ],
  });

  // Step 2: Seed queue with in-degree-0 nodes
  queue.push(0);
  steps.push({
    explanation: `Seed BFS queue: scan prereqCounter and enqueue all courses with in-degree 0. Only course 0 qualifies. canTake = [0]. These are the courses with no prerequisites — our BFS starting points.`,
    highlightLine: 22,
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
    explanation: `BFS iteration 1: dequeue course 0. coursesTaken = ${coursesTaken}. Examine neighbors of course 0: [1, 2]. For each dependent course, decrement its prereqCounter since course 0 is now satisfied.`,
    highlightLine: 28,
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
    highlightLine: 33,
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
    explanation: `BFS iteration 2: dequeue course 1. coursesTaken = ${coursesTaken}. Examine neighbors of course 1: [3]. Decrement prereqCounter[3]: 2→1. Course 3 still needs course 2 — not enqueued yet.`,
    highlightLine: 28,
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
    highlightLine: 33,
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
    explanation: `BFS iteration 3: dequeue course 2. coursesTaken = ${coursesTaken}. Examine neighbors of course 2: [3]. Decrement prereqCounter[3]: 1→0. Course 3 now has all prerequisites met — enqueue it.`,
    highlightLine: 28,
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
    highlightLine: 35,
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
    explanation: `BFS iteration 4: dequeue course 3. coursesTaken = ${coursesTaken}. Course 3 has no neighbors. Queue is now empty. BFS complete — all 4 courses taken.`,
    highlightLine: 28,
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
    explanation: `Result: coursesTaken (${coursesTaken}) >= numCourses (${numCourses}) → return true. Every course was processed in topological order — no cycle exists. If a cycle had existed, some nodes would stay stuck with in-degree > 0 forever, and coursesTaken would be < numCourses. O(V+E) time, O(V+E) space.`,
    highlightLine: 38,
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
  pythonCode: PYTHON_CODE_BFS,
  generateSteps: generateStepsBFS,
};

export const courseScheduleMeta: AlgorithmMeta = {
  id: 'course-schedule',
  lcNumber: 207,
  title: 'Course Schedule',
  difficulty: 'Medium',
  category: 'graphs',
  tags: ['BFS', 'Topological Sort', 'Graph', 'Cycle Detection'],
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
