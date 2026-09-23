// Walkthrough pending — grounded code only. Variant 'last-index' joins cse-progress 763:last-index
// (symbol partitionLabels); the site renders that attempt verbatim from dashboard/showcase.json.

import { AlgorithmMeta } from '../../core/models/algorithm.model';

export const partitionLabelsMeta: AlgorithmMeta = {
  id: 'partition-labels',
  lcNumber: 763,
  title: 'Partition Labels',
  difficulty: 'Medium',
  category: 'greedy',
  tags: ['Greedy', 'Hash Map', 'String'],
  timeComplexity: 'O(n)',
  spaceComplexity: 'O(1)',
  description:
    'Given a string s, partition it into as many parts as possible so that each letter appears in at most one part, and return the size of each part (concatenating the parts in order reproduces s).',
  examples: [
    {
      input: 's = "ababcbacadefegdehijhklij"',
      output: '[9, 7, 8]',
      explanation: '"ababcbaca", "defegde", "hijhklij"',
    },
  ],
  constraints: ['1 <= s.length <= 500', 's consists of lowercase English letters.'],
  hint: "Record each character's last occurrence index up front; as you scan, extend the current partition's boundary to the max last-index of any character seen so far, and close the partition once you reach that boundary.",
  solutions: [
    {
      label: 'Last-Index Map',
      variant: 'last-index',
      generateSteps: () => [],
      timeComplexity: 'O(n)',
      spaceComplexity: 'O(1)',
    },
  ],
};
