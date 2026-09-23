import { AlgorithmMeta, SolutionVariant } from '../models/algorithm.model';
import { ShowcaseData, ShowcaseEntry } from '../models/showcase.model';

/** The join key between a site variant and its showcase entry: `${lcNumber}:${variant}`.
 *  `null` when the variant hasn't been migrated yet (no `variant` id). */
export function showcaseKey(
  meta: Pick<AlgorithmMeta, 'lcNumber'>,
  v: Pick<SolutionVariant, 'variant'>,
): string | null {
  if (!v.variant) return null;
  return `${meta.lcNumber}:${v.variant}`;
}

/** Indexes showcase entries by their `key`, shared by `ShowcaseService` and groundedness so
 *  the lookup lives in exactly one place (DRY). */
export function indexEntries(data: ShowcaseData): ReadonlyMap<string, ShowcaseEntry> {
  return new Map(data.entries.map((entry) => [entry.key, entry]));
}
