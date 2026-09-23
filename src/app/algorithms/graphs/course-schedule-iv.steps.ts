// Walkthrough pending — grounded code only. Variant 'floyd-warshall' joins cse-progress 1462:floyd-warshall
// (symbol courseScheduleIv_20260904); the site renders that attempt verbatim from dashboard/showcase.json.

import { AlgorithmMeta, SolutionVariant, ProblemExample } from '../../core/models/algorithm.model';

const solution: SolutionVariant = {
  label: 'Floyd-Warshall (Transitive Closure)',
  variant: 'floyd-warshall',
  generateSteps: () => [],
  timeComplexity: 'O(n³ + q)',
  spaceComplexity: 'O(n²)',
};

export const courseScheduleIvMeta: AlgorithmMeta = {
  id: 'course-schedule-iv',
  lcNumber: 1462,
  title: 'Course Schedule IV',
  difficulty: 'Medium',
  category: 'graphs',
  tags: ['Graph', 'Floyd-Warshall', 'Topological Sort'],
  timeComplexity: 'O(n³ + q)',
  spaceComplexity: 'O(n²)',
  description:
    'Given numCourses courses and a list of transitive prerequisite pairs, answer queries asking whether one course is a prerequisite — direct or indirect — of another.',
  examples: [
    {
      input: 'numCourses = 2, prerequisites = [[1,0]], queries = [[0,1],[1,0]]',
      output: '[false,true]',
      explanation:
        'The pair [1, 0] indicates that you have to take course 1 before you can take course 0. Course 0 is not a prerequisite of course 1, but the opposite is true.',
    },
  ] as ProblemExample[],
  constraints: ['n ≤ 100', 'No cycles (DAG).', 'queries can be many.'],
  hint: 'Needing to answer many repeated reachability queries on a small DAG (numCourses ≤ 100) is the Floyd-Warshall shape — precompute all-pairs reachability once through every possible middle course.',
  solutions: [solution],
};
