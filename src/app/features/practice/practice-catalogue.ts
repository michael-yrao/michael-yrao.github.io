import type { AlgorithmIndexEntry } from '../../core/data/algorithms.data';
import { Category, Difficulty } from '../../core/models/algorithm.model';
import { PracticeProblem } from '../../core/models/practice.model';

/** One row of the merged problem list: a static algorithm, a contract problem, or both. */
export interface CatalogueEntry {
  readonly number: number;
  readonly title: string;
  readonly difficulty: Difficulty | null;
  readonly category: Category | null;
  readonly tags: readonly string[];
  /** The `?repo=` contract has this number, so the editor can run it. */
  readonly isRunnable: boolean;
  /** The static algorithm has at least one step-by-step visualization. */
  readonly isVisualized: boolean;
  /** The number is in `ALGORITHM_INDEX`, so the Solution tab exists. */
  readonly hasSolution: boolean;
}

export interface CatalogueFilters {
  readonly difficulty: Difficulty | 'All';
  readonly isRunnableOnly: boolean;
  readonly isVisualizedOnly: boolean;
  readonly category: Category | null;
}

export interface CatalogueNeighbors {
  readonly prev: CatalogueEntry | null;
  readonly next: CatalogueEntry | null;
}

function toEntry(
  number: number,
  algorithm: AlgorithmIndexEntry | undefined,
  problem: PracticeProblem | undefined,
): CatalogueEntry {
  return {
    number,
    // The contract's title is the one the learner's own repo uses, so it wins.
    title: problem?.title ?? algorithm?.title ?? '',
    difficulty: algorithm?.difficulty ?? null,
    category: algorithm?.category ?? null,
    tags: algorithm?.tags ?? [],
    isRunnable: problem !== undefined,
    isVisualized: algorithm?.hasVisualization ?? false,
    hasSolution: algorithm !== undefined,
  };
}

/** The union by number of the static algorithms and the contract's problems, ascending. */
export function buildCatalogue(
  algorithms: readonly AlgorithmIndexEntry[],
  contractProblems: readonly PracticeProblem[],
): readonly CatalogueEntry[] {
  const algorithmByNumber = new Map(algorithms.map((a) => [a.lcNumber, a]));
  const problemByNumber = new Map(contractProblems.map((p) => [p.number, p]));
  const numbers = new Set([...algorithmByNumber.keys(), ...problemByNumber.keys()]);
  return [...numbers]
    .sort((a, b) => a - b)
    .map((n) => toEntry(n, algorithmByNumber.get(n), problemByNumber.get(n)));
}

function matchesFilters(entry: CatalogueEntry, filters: CatalogueFilters): boolean {
  if (filters.difficulty !== 'All' && entry.difficulty !== filters.difficulty) return false;
  if (filters.isRunnableOnly && !entry.isRunnable) return false;
  if (filters.isVisualizedOnly && !entry.isVisualized) return false;
  if (filters.category !== null && entry.category !== filters.category) return false;
  return true;
}

export function filterCatalogue(
  entries: readonly CatalogueEntry[],
  filters: CatalogueFilters,
): readonly CatalogueEntry[] {
  return entries.filter((entry) => matchesFilters(entry, filters));
}

/** The entries either side of `number` in an ascending catalogue; null at an end or when absent. */
export function neighborsOf(
  entries: readonly CatalogueEntry[],
  number: number,
): CatalogueNeighbors {
  const index = entries.findIndex((entry) => entry.number === number);
  if (index === -1) return { prev: null, next: null };
  return { prev: entries[index - 1] ?? null, next: entries[index + 1] ?? null };
}
