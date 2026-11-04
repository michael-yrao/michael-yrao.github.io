import { AlgorithmMeta } from '../models/algorithm.model';
import { PracticeProblem } from '../models/practice.model';

export type DriftField = 'title' | 'difficulty' | 'missing';

export interface MetaDrift {
  readonly lcNumber: number;
  readonly field: DriftField;
  readonly site: string;
  readonly owner: string;
}

const NOT_IN_PRACTICE = '(not in practice.json)';

/** Compares each site meta's title and difficulty against the practice contract, joined on
 *  `lcNumber`. A meta whose number the contract lacks is reported once as `missing`. A side with
 *  no difficulty (the meta's or the contract's) is skipped, not reported. Pure. */
export function metaDrift(
  metas: readonly Pick<AlgorithmMeta, 'lcNumber' | 'title' | 'difficulty'>[],
  practice: readonly Pick<PracticeProblem, 'number' | 'title' | 'difficulty'>[],
): MetaDrift[] {
  const ownerByNumber = new Map(practice.map((problem) => [problem.number, problem]));
  return metas.flatMap((meta) => {
    const owner = ownerByNumber.get(meta.lcNumber);
    if (!owner) {
      return [
        { lcNumber: meta.lcNumber, field: 'missing' as const, site: meta.title, owner: NOT_IN_PRACTICE },
      ];
    }
    const drifts: MetaDrift[] = [];
    if (meta.title !== owner.title) {
      drifts.push({ lcNumber: meta.lcNumber, field: 'title', site: meta.title, owner: owner.title });
    }
    if (meta.difficulty && owner.difficulty && meta.difficulty !== owner.difficulty) {
      drifts.push({
        lcNumber: meta.lcNumber,
        field: 'difficulty',
        site: meta.difficulty,
        owner: owner.difficulty,
      });
    }
    return drifts;
  });
}
