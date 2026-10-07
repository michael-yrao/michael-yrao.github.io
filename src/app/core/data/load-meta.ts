import { AlgorithmMeta } from '../models/algorithm.model';
import type { AlgorithmIndexEntry } from './algorithms.data';

/** The entry's full algorithm, or null when there is no entry; a failed chunk load is logged and
 *  also yields null, so a caller keeps working without the walkthrough. */
export async function loadMetaOrNull(
  entry: AlgorithmIndexEntry | undefined,
): Promise<AlgorithmMeta | null> {
  if (!entry) return null;
  try {
    return await entry.load();
  } catch (err) {
    console.error(`Loading the algorithm for #${entry.lcNumber} failed`, err);
    return null;
  }
}
