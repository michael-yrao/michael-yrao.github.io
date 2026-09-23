// Walkthrough pending — grounded code only. Variant 'bfs-wildcard' joins cse-progress 127:bfs-wildcard
// (symbol ladderLength_20260902); the site renders that attempt verbatim from dashboard/showcase.json.

import { AlgorithmMeta, SolutionVariant, ProblemExample } from '../../core/models/algorithm.model';

const solution: SolutionVariant = {
  label: 'BFS + Wildcard Buckets',
  variant: 'bfs-wildcard',
  generateSteps: () => [],
  timeComplexity: 'O(n · L²)',
  spaceComplexity: 'O(n · L²)',
};

export const wordLadderMeta: AlgorithmMeta = {
  id: 'word-ladder',
  lcNumber: 127,
  title: 'Word Ladder',
  difficulty: 'Hard',
  category: 'graphs',
  tags: ['Graph', 'BFS', 'Hash Map', 'String'],
  timeComplexity: 'O(n · L²)',
  spaceComplexity: 'O(n · L²)',
  description:
    'Given a beginWord, an endWord, and a wordList, return the number of words in the shortest transformation sequence from beginWord to endWord, changing one letter at a time and passing only through words in wordList.',
  examples: [
    {
      input: 'beginWord = "hit", endWord = "cog", wordList = ["hot","dot","dog","lot","log","cog"]',
      output: '5',
      explanation: '"hit" -> "hot" -> "dot" -> "dog" -> "cog" is 5 words long.',
    },
    {
      input: 'beginWord = "hit", endWord = "cog", wordList = ["hot","dot","dog","lot","log"]',
      output: '0',
      explanation: 'endWord "cog" is not in wordList, so no valid sequence.',
    },
  ] as ProblemExample[],
  constraints: [
    '1 ≤ beginWord.length ≤ 10',
    'endWord.length == beginWord.length',
    '1 ≤ wordList.length ≤ 5000',
    'wordList[i].length == beginWord.length',
    'beginWord, endWord, wordList[i] are lowercase English letters.',
    'beginWord != endWord; all words in wordList are unique.',
  ],
  hint: 'Each word is a graph node one letter-change away from its neighbors — build wildcard buckets like `h*t` → [hit, hot] so you can look up those neighbors in O(1) instead of comparing every pair.',
  solutions: [solution],
};
