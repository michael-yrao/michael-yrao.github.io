// Walkthrough pending — grounded code only. Variant 'union-find' joins cse-progress 721:union-find
// (symbol accountsMerge_20260917); the site renders that attempt verbatim from dashboard/showcase.json.

import { AlgorithmMeta, SolutionVariant, ProblemExample } from '../../core/models/algorithm.model';

const solution: SolutionVariant = {
  label: 'Union-Find',
  variant: 'union-find',
  generateSteps: () => [],
  timeComplexity: 'O(NK log NK)',
  spaceComplexity: 'O(NK)',
};

export const accountsMergeMeta: AlgorithmMeta = {
  id: 'accounts-merge',
  lcNumber: 721,
  title: 'Accounts Merge',
  difficulty: 'Medium',
  category: 'graphs',
  tags: ['Graph', 'Union-Find', 'Hash Map'],
  timeComplexity: 'O(NK log NK)',
  spaceComplexity: 'O(NK)',
  description:
    'Given a list of accounts where each account is a name followed by emails, merge the accounts that share at least one email into a single account with the name and all emails sorted.',
  examples: [
    {
      input:
        'accounts = [["John","johnsmith@mail.com","john_newyork@mail.com"],["John","johnsmith@mail.com","john00@mail.com"],["Mary","mary@mail.com"],["John","johnnybravo@mail.com"]]',
      output:
        '[["John","john00@mail.com","john_newyork@mail.com","johnsmith@mail.com"],["Mary","mary@mail.com"],["John","johnnybravo@mail.com"]]',
      explanation:
        'The first and second John\'s are the same person as they have the common email "johnsmith@mail.com". The third John and Mary are different people as none of their email addresses are used by other accounts. We could return these lists in any order.',
    },
    {
      input:
        'accounts = [["Gabe","Gabe0@m.co","Gabe3@m.co","Gabe1@m.co"],["Kevin","Kevin3@m.co","Kevin5@m.co","Kevin0@m.co"],["Ethan","Ethan5@m.co","Ethan4@m.co","Ethan0@m.co"],["Hanzo","Hanzo3@m.co","Hanzo1@m.co","Hanzo0@m.co"],["Fern","Fern5@m.co","Fern1@m.co","Fern0@m.co"]]',
      output:
        '[["Ethan","Ethan0@m.co","Ethan4@m.co","Ethan5@m.co"],["Gabe","Gabe0@m.co","Gabe1@m.co","Gabe3@m.co"],["Hanzo","Hanzo0@m.co","Hanzo1@m.co","Hanzo3@m.co"],["Kevin","Kevin0@m.co","Kevin3@m.co","Kevin5@m.co"],["Fern","Fern0@m.co","Fern1@m.co","Fern5@m.co"]]',
    },
  ] as ProblemExample[],
  constraints: [
    '1 ≤ accounts.length ≤ 1000',
    '2 ≤ accounts[i].length ≤ 10',
    '1 ≤ accounts[i][j].length ≤ 30',
    'accounts[i][0] consists of English letters.',
    'accounts[i][j] (for j > 0) is a valid email.',
  ],
  hint: "Accounts that share even one email belong to the same person, and names alone can't be trusted — map each email to the account indices that hold it, then union those indices together.",
  solutions: [solution],
};
