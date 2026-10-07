import { CATEGORY_LABELS, Category } from '../models/algorithm.model';
import { ALGORITHM_INDEX, AlgorithmIndexEntry, loadAllAlgorithms } from './algorithms.index';

export { ALGORITHM_INDEX, loadAllAlgorithms };
export type { AlgorithmIndexEntry };

/** Entries grouped by category, in index order; built in one pass over the index. */
export const ALGORITHMS_BY_CATEGORY: Record<Category, readonly AlgorithmIndexEntry[]> =
  ALGORITHM_INDEX.reduce(
    (groups, entry) => ({ ...groups, [entry.category]: [...groups[entry.category], entry] }),
    emptyCategoryGroups(),
  );

function emptyCategoryGroups(): Record<Category, readonly AlgorithmIndexEntry[]> {
  const categories = Object.keys(CATEGORY_LABELS) as Category[];
  const entries = categories.map((category): [Category, readonly AlgorithmIndexEntry[]] => [
    category,
    [],
  ]);
  return Object.fromEntries(entries) as Record<Category, readonly AlgorithmIndexEntry[]>;
}

export function countVisualized(entries: readonly AlgorithmIndexEntry[]): number {
  return entries.filter((entry) => entry.hasVisualization).length;
}

export function findAlgorithm(category: Category, id: string): AlgorithmIndexEntry | undefined {
  return ALGORITHMS_BY_CATEGORY[category]?.find((entry) => entry.id === id);
}

export function findByNumber(lcNumber: number): AlgorithmIndexEntry | undefined {
  return ALGORITHM_INDEX.find((entry) => entry.lcNumber === lcNumber);
}

export function getCategoryNeighbors(
  category: Category,
  id: string,
): { prev: AlgorithmIndexEntry | null; next: AlgorithmIndexEntry | null } {
  const list = ALGORITHMS_BY_CATEGORY[category] ?? [];
  const idx = list.findIndex((entry) => entry.id === id);
  return {
    prev: idx > 0 ? list[idx - 1] : null,
    next: idx < list.length - 1 ? list[idx + 1] : null,
  };
}
