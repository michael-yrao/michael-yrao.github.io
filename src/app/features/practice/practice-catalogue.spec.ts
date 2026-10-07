import type { AlgorithmIndexEntry } from '../../core/data/algorithms.data';
import { Category, Difficulty } from '../../core/models/algorithm.model';
import { PracticeProblem } from '../../core/models/practice.model';
import { CatalogueEntry, buildCatalogue, filterCatalogue } from './practice-catalogue';

function algorithm(
  lcNumber: number,
  title: string,
  difficulty: Difficulty,
  category: Category,
  isVisualized: boolean,
): AlgorithmIndexEntry {
  return {
    id: `fake-${lcNumber}`,
    lcNumber,
    title,
    difficulty,
    category,
    tags: ['Tag A', 'Tag B', 'Tag C'],
    hasVisualization: isVisualized,
  } as unknown as AlgorithmIndexEntry;
}

function problem(number: number, title: string): PracticeProblem {
  return { number, title } as PracticeProblem;
}

function entry(overrides: Partial<CatalogueEntry> & Pick<CatalogueEntry, 'number'>): CatalogueEntry {
  return {
    title: 'T',
    difficulty: null,
    category: null,
    tags: [],
    isRunnable: false,
    isVisualized: false,
    hasSolution: false,
    ...overrides,
  };
}

describe('buildCatalogue', () => {
  const cases: ReadonlyArray<{
    name: string;
    algorithms: AlgorithmIndexEntry[];
    problems: PracticeProblem[];
    expected: CatalogueEntry[];
  }> = [
    {
      name: 'static only: a solution, no editor',
      algorithms: [algorithm(1, 'Two Sum', 'Easy', 'arrays-hash', true)],
      problems: [],
      expected: [
        entry({
          number: 1,
          title: 'Two Sum',
          difficulty: 'Easy',
          category: 'arrays-hash',
          tags: ['Tag A', 'Tag B', 'Tag C'],
          isVisualized: true,
          hasSolution: true,
        }),
      ],
    },
    {
      name: 'contract only: runnable, no difficulty, category or solution',
      algorithms: [],
      problems: [problem(9001, 'Custom')],
      expected: [entry({ number: 9001, title: 'Custom', isRunnable: true })],
    },
    {
      name: 'both: the contract title wins and both flags are set',
      algorithms: [algorithm(20, 'Valid Parens', 'Easy', 'stack', false)],
      problems: [problem(20, 'Valid Parentheses')],
      expected: [
        entry({
          number: 20,
          title: 'Valid Parentheses',
          difficulty: 'Easy',
          category: 'stack',
          tags: ['Tag A', 'Tag B', 'Tag C'],
          isRunnable: true,
          hasSolution: true,
        }),
      ],
    },
    {
      name: 'ascending by number across both sources',
      algorithms: [algorithm(50, 'B', 'Hard', 'trees', false), algorithm(3, 'A', 'Hard', 'trees', false)],
      problems: [problem(9001, 'C'), problem(22, 'D')],
      expected: [3, 22, 50, 9001].map((number) => expect.objectContaining({ number })),
    },
  ];

  it.each(cases)('$name', ({ algorithms, problems, expected }) => {
    expect(buildCatalogue(algorithms, problems)).toEqual(expected);
  });
});

describe('filterCatalogue', () => {
  const entries: readonly CatalogueEntry[] = [
    entry({ number: 1, difficulty: 'Easy', category: 'stack', isRunnable: true, isVisualized: true }),
    entry({ number: 2, difficulty: 'Hard', category: 'trees', isVisualized: true }),
    entry({ number: 3, difficulty: 'Easy', category: 'trees', isRunnable: true }),
    entry({ number: 9001, isRunnable: true }),
  ];
  const none = {
    difficulty: 'All',
    isRunnableOnly: false,
    isVisualizedOnly: false,
    category: null,
  } as const;

  const cases: ReadonlyArray<{
    name: string;
    filters: Parameters<typeof filterCatalogue>[1];
    numbers: number[];
  }> = [
    { name: 'no filters keeps every entry', filters: none, numbers: [1, 2, 3, 9001] },
    { name: 'a difficulty excludes contract-only rows', filters: { ...none, difficulty: 'Easy' }, numbers: [1, 3] },
    { name: 'runnable', filters: { ...none, isRunnableOnly: true }, numbers: [1, 3, 9001] },
    { name: 'visualized', filters: { ...none, isVisualizedOnly: true }, numbers: [1, 2] },
    { name: 'category', filters: { ...none, category: 'trees' }, numbers: [2, 3] },
    {
      name: 'combined filters all apply',
      filters: { difficulty: 'Easy', isRunnableOnly: true, isVisualizedOnly: true, category: 'stack' },
      numbers: [1],
    },
  ];

  it.each(cases)('$name', ({ filters, numbers }) => {
    expect(filterCatalogue(entries, filters).map((e) => e.number)).toEqual(numbers);
  });
});
