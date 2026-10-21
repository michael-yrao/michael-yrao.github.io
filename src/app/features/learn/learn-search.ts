// Pure helpers for the /learn hub's search: the family label and the technique matcher.
import { Technique } from '../../core/models/cheat-sheet.model';
import { FamilyGroup } from '../../core/services/cheat-sheet.service';
import { matchesAnyText } from '../../shared/utils/text-search';

/** "arrays_and_hash" -> "Arrays and hash". */
export function humanise(familyKey: string): string {
  const spaced = familyKey.replace(/_/g, ' ').toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Whether `needle` (already normalised) appears in the technique's name, family label,
 *  when-to-use line or any of its signals. */
export function matchesTechnique(technique: Technique, needle: string): boolean {
  return matchesAnyText(
    [technique.name, humanise(technique.family), technique.whenToUse, ...technique.signals],
    needle,
  );
}

/** The family groups with non-matching techniques dropped and empty families removed. A blank
 *  needle returns `byFamily` itself. */
export function filterTechniques(byFamily: FamilyGroup[], needle: string): FamilyGroup[] {
  if (needle === '') return byFamily;
  return byFamily
    .map((group) => ({
      ...group,
      techniques: group.techniques.filter((t) => matchesTechnique(t, needle)),
    }))
    .filter((group) => group.techniques.length > 0);
}
