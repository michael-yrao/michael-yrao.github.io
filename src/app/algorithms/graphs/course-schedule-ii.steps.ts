import { AlgorithmMeta, SolutionVariant, Step, ProblemExample } from '../../core/models/algorithm.model';

const PYTHON_CODE_BFS = `import collections
from typing import List

class Solution:
    def findOrder(self, numCourses: int, prerequisites: List[List[int]]) -> List[int]:
        # so same idea as course schedule 1
        # we need to find starting nodes to go for
        # so we once again need a way to indicate whether a course is takeable
        # so we will use canTake = [0] * numCourses
        # then we will have a map of prereq -> courses
        # traverse through the neighbors and add to a result list as we take each course
        # one thing we do need to consider is cycles
        # so how do we detect cycles in a graph

        canTake = [0] * numCourses

        prereqMap = collections.defaultdict(list)

        courseList = []

        for row in prerequisites:
            course = row[0]
            prereq = row[1]
            # increase requirement for this course
            canTake[course]+=1
            # append to prereq
            prereqMap[prereq].append(course)

        # now we go through the canTake array and put everything takeable now into the queue for BFS

        courseQueue = collections.deque()

        for i in range(len(canTake)):
            if canTake[i] == 0:
                courseQueue.append(i)

        # with this initial list of takeable classes, we start BFS

        while courseQueue:
            currentCourse = courseQueue.popleft()
            # we mark this as taken by adding to the result
            courseList.append(currentCourse)
            # now we check neighbors of this and add to the list if they are takeable
            for neighbor in prereqMap[currentCourse]:
                canTake[neighbor]-=1
                # if takeable, add to queue
                if canTake[neighbor] <= 0:
                    courseQueue.append(neighbor)

        if numCourses != len(courseList):
            return []
        else:
            return courseList`;

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
  const queue: number[] = [];

  // Step 0: Introduction
  steps.push({
    explanation: `Course Schedule II: find the order to take all 4 courses given prerequisites [[1,0],[2,0],[3,1],[3,2]]. Same Kahn's BFS as Course Schedule I, but now we record each dequeued course into courseList to build the result ordering. Cell values show each course's current in-degree.`,
    highlightLine: 15,
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
    explanation: `Build canTake and prereqMap. For each [course, prereq]: canTake[course]++ and prereqMap[prereq].append(course). Result: canTake = [0,1,1,2], prereqMap = {0:[1,2], 1:[3], 2:[3]}. courseList starts empty — it will be filled as we take courses.`,
    highlightLine: 21,
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
      { name: 'canTake', value: '[0,1,1,2]' },
      { name: 'prereqMap', value: '{0:[1,2], 1:[3], 2:[3]}' },
      { name: 'courseList', value: '[]' },
    ],
  });

  // Step 2: Seed queue
  queue.push(0);
  steps.push({
    explanation: `Seed BFS queue: scan canTake for all indices with value 0. Only course 0 has in-degree 0. courseQueue = [0]. These are the courses with no prerequisites — our BFS entry points.`,
    highlightLine: 33,
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
    variables: [{ name: 'courseQueue', value: '[0]' }],
  });

  // BFS iteration 1: dequeue 0
  queue.shift();
  courseList.push(0);
  visited.add(0);

  steps.push({
    explanation: `BFS iteration 1: dequeue course 0. Append to courseList → courseList = [${courseList.join(', ')}]. Process neighbors [${adj[0].join(', ')}]: decrement their in-degrees since course 0 is now taken.`,
    highlightLine: 42,
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
      { name: 'courseList', value: `[${courseList.join(', ')}]` },
    ],
  });

  deg[1]--;
  deg[2]--;
  queue.push(1, 2);

  steps.push({
    explanation: `Decrement neighbors of course 0. canTake[1]: 1→0 (enqueue). canTake[2]: 1→0 (enqueue). Queue = [1, 2]. Both courses 1 and 2 are now available to take.`,
    highlightLine: 45,
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
      { name: 'canTake[1]', value: deg[1] },
      { name: 'canTake[2]', value: deg[2] },
    ],
  });

  // BFS iteration 2: dequeue 1
  queue.shift();
  courseList.push(1);
  visited.add(1);

  steps.push({
    explanation: `BFS iteration 2: dequeue course 1. Append to courseList → courseList = [${courseList.join(', ')}]. Process neighbors [${adj[1].join(', ')}]: decrement canTake[3].`,
    highlightLine: 42,
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
      { name: 'courseList', value: `[${courseList.join(', ')}]` },
    ],
  });

  deg[3]--;

  steps.push({
    explanation: `canTake[3]: 2→1. Course 3 still needs course 2 — not yet takeable. Continue BFS.`,
    highlightLine: 45,
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
    variables: [{ name: 'canTake[3]', value: deg[3] }],
  });

  // BFS iteration 3: dequeue 2
  queue.shift();
  courseList.push(2);
  visited.add(2);

  steps.push({
    explanation: `BFS iteration 3: dequeue course 2. Append to courseList → courseList = [${courseList.join(', ')}]. Process neighbors [${adj[2].join(', ')}]: decrement canTake[3].`,
    highlightLine: 42,
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
      { name: 'courseList', value: `[${courseList.join(', ')}]` },
    ],
  });

  deg[3]--;
  queue.push(3);

  steps.push({
    explanation: `canTake[3]: 1→0 → enqueue course 3. Both prerequisites for course 3 (courses 1 and 2) are now satisfied. Queue = [3].`,
    highlightLine: 48,
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
    variables: [{ name: 'canTake[3]', value: deg[3] }],
  });

  // BFS iteration 4: dequeue 3
  queue.shift();
  courseList.push(3);
  found.add(3);

  steps.push({
    explanation: `BFS iteration 4: dequeue course 3. Append to courseList → courseList = [${courseList.join(', ')}]. No neighbors. Queue empty — BFS complete.`,
    highlightLine: 42,
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
      { name: 'courseList', value: `[${courseList.join(', ')}]` },
    ],
  });

  // Final step
  steps.push({
    explanation: `Result: len(courseList) = ${courseList.length} == numCourses (${numCourses}) → return [${courseList.join(', ')}]. This is a valid topological ordering. No cycle was detected. Another valid order would be [0,2,1,3]. If a cycle existed, courseList would be shorter than numCourses and we'd return []. O(V+E) time, O(V+E) space.`,
    highlightLine: 53,
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
  pythonCode: PYTHON_CODE_BFS,
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
