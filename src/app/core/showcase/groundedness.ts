import { AlgorithmMeta, SolutionVariant, Step } from '../models/algorithm.model';
import { ShowcaseData, ShowcaseEntry } from '../models/showcase.model';
import { buildDisplay } from './display';
import { resolveSteps } from './anchor-resolver';
import { indexEntries, showcaseKey } from './showcase-key';

export interface GroundednessFailure {
  readonly key: string;
  readonly reason: string;
}

export interface GroundednessReport {
  readonly total: number;
  readonly grounded: number;
  readonly legacy: number;
  readonly ratio: number;
  readonly failures: readonly GroundednessFailure[];
}

export interface VariantGroundedness {
  readonly isGrounded: boolean;
  readonly isLegacy: boolean;
  readonly failures: readonly string[];
}

const NO_VARIANTS = 0;

interface VariantAssessment extends VariantGroundedness {
  readonly key: string | null;
}

/** One failure line per unresolved step: "step <i>: anchor '<match>' — <reason>", or just
 *  "step <i>: <reason>" when the step carries no anchor at all. */
function stepFailure(step: Step, index: number, reason: string): string {
  const anchorText = step.anchor ? ` anchor '${step.anchor.match}' —` : '';
  return `step ${index}:${anchorText} ${reason}`;
}

function assessVariant(
  meta: AlgorithmMeta,
  variant: SolutionVariant,
  entries: ReadonlyMap<string, ShowcaseEntry>,
): VariantAssessment {
  const key = showcaseKey(meta, variant);
  if (key === null) {
    return { key: null, isLegacy: true, isGrounded: false, failures: [] };
  }

  const entry = entries.get(key);
  if (!entry) {
    return { key, isLegacy: false, isGrounded: false, failures: [`no showcase entry for ${key}`] };
  }

  const steps = variant.generateSteps();
  const rows = buildDisplay(entry);
  const resolved = resolveSteps(rows, steps);

  const failures = resolved.reduce<string[]>((acc, resolution, i) => {
    if (resolution.range !== null) return acc;
    return [...acc, stepFailure(steps[i], i, resolution.reason ?? 'unresolved anchor')];
  }, []);

  return { key, isLegacy: false, isGrounded: failures.length === 0, failures };
}

/** Per-variant groundedness for the problem page's badge. */
export function groundednessOf(
  meta: AlgorithmMeta,
  variant: SolutionVariant,
  showcase: ShowcaseData,
): VariantGroundedness {
  const assessment = assessVariant(meta, variant, indexEntries(showcase));
  return {
    isGrounded: assessment.isGrounded,
    isLegacy: assessment.isLegacy,
    failures: assessment.failures,
  };
}

/** Sitewide groundedness for the CI gate and the hub meter. Builds the entry index once,
 *  not per variant — `generateSteps()` still runs once per migrated variant. */
export function computeGroundedness(
  algorithms: readonly AlgorithmMeta[],
  showcase: ShowcaseData,
): GroundednessReport {
  const entries = indexEntries(showcase);
  const assessments = algorithms.flatMap((meta) =>
    meta.solutions.map((variant) => assessVariant(meta, variant, entries)),
  );

  const total = assessments.length;
  const legacy = assessments.filter((a) => a.isLegacy).length;
  const grounded = assessments.filter((a) => a.isGrounded).length;
  const failures: GroundednessFailure[] = assessments
    .filter((a) => !a.isLegacy && !a.isGrounded)
    .flatMap((a) => a.failures.map((reason) => ({ key: a.key ?? '', reason })));

  return {
    total,
    grounded,
    legacy,
    ratio: total === NO_VARIANTS ? NO_VARIANTS : grounded / total,
    failures,
  };
}
