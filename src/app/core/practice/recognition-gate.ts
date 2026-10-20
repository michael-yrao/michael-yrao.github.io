import { labelFor } from '../data/family-labels';
import { TECHNIQUE_TIER_ORDER, type Technique } from '../models/progress.model';
import type { AttemptRecognition } from './practice-attempt';

export type GateState = 'open' | 'locked';

export interface RecognitionGroup {
  readonly family: string;
  readonly label: string;
  readonly names: readonly string[];
}

interface GateInput {
  readonly canSave: boolean;
  readonly number: number;
  readonly doneNumbers: ReadonlySet<number> | null;
  readonly pick: AttemptRecognition | null;
}

type ChoiceTechnique = Pick<Technique, 'name' | 'family' | 'tier'>;

/** Whether the editor may open: owners only are gated; a pick or a done problem opens it, and
 *  unknown done-ness (details loading or failed) stays locked. */
export function gateState({ canSave, number, doneNumbers, pick }: GateInput): GateState {
  if (!canSave) return 'open';
  if (pick !== null) return 'open';
  if (doneNumbers === null) return 'locked';
  return doneNumbers.has(number) ? 'open' : 'locked';
}

function tierRank(technique: ChoiceTechnique): number {
  return TECHNIQUE_TIER_ORDER.indexOf(technique.tier);
}

function compareChoices(a: ChoiceTechnique, b: ChoiceTechnique): number {
  return tierRank(a) - tierRank(b) || a.name.localeCompare(b.name);
}

/** The picker's choices: one group per family (by label), names by tier then name, each name once. */
export function recognitionChoices(
  techniques: readonly ChoiceTechnique[],
): readonly RecognitionGroup[] {
  const firstByName = new Map<string, ChoiceTechnique>();
  for (const technique of techniques) {
    if (!firstByName.has(technique.name)) firstByName.set(technique.name, technique);
  }
  const byFamily = new Map<string, ChoiceTechnique[]>();
  for (const technique of firstByName.values()) {
    byFamily.set(technique.family, [...(byFamily.get(technique.family) ?? []), technique]);
  }
  return [...byFamily.entries()]
    .map(([family, items]) => ({
      family,
      label: labelFor(family),
      names: [...items].sort(compareChoices).map((item) => item.name),
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}
