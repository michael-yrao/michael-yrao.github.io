// Walkthrough pending — grounded code only. Variant 'trie' joins cse-progress 648:trie
// (symbol replaceWords); the site renders that attempt verbatim from dashboard/showcase.json.

import { AlgorithmMeta } from '../../core/models/algorithm.model';

export const replaceWordsMeta: AlgorithmMeta = {
  id: 'replace-words',
  lcNumber: 648,
  title: 'Replace Words',
  difficulty: 'Medium',
  category: 'trie',
  tags: ['Trie', 'String', 'Hash Map'],
  timeComplexity: 'O(D + S)',
  spaceComplexity: 'O(D)',
  description:
    'Given a dictionary of word roots and a sentence, replace every word in the sentence that has one of the roots as a prefix with that root (the shortest one, if more than one matches), and return the resulting sentence.',
  examples: [
    {
      input: 'dictionary = ["cat","bat","rat"], sentence = "the cattle was rattled by the battery"',
      output: '"the cat was rat by the bat"',
    },
    {
      input: 'dictionary = ["a","b","c"], sentence = "aadsfasf absbs bbab cadsfafs"',
      output: '"a a b c"',
    },
  ],
  constraints: [
    '1 <= dictionary.length <= 1000',
    '1 <= dictionary[i].length <= 100',
    'dictionary[i] consists of only lowercase letters.',
    '1 <= sentence.length <= 10^6',
    'sentence consists of only lowercase letters and spaces.',
    'The number of words in sentence is in the range [1, 1000].',
    'Each word in sentence is separated by a single space.',
  ],
  hint: 'Build a trie from the dictionary roots, then for each sentence word walk the trie character by character and stop at the first node marked as a complete word — that is the shortest matching root.',
  solutions: [
    {
      label: 'Trie',
      variant: 'trie',
      generateSteps: () => [],
      timeComplexity: 'O(D + S)',
      spaceComplexity: 'O(D)',
    },
  ],
};
