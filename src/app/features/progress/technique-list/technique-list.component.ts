import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { Technique, TechniqueTier } from '../../../core/models/progress.model';

interface FamilyGroup {
  family: string;
  items: Technique[];
}

interface TierGroup {
  tier: TechniqueTier;
  label: string;
  families: FamilyGroup[];
}

// Fixed order (not alphabetical — alphabetical would put 'core' after 'dp'), matching the
// interview-ROI line: core (started) is always first; dp/tier1 are above the line; tier2/
// tier3 are below it.
const TIER_ORDER: TechniqueTier[] = ['core', 'dp', 'tier1', 'tier2', 'tier3'];
const TIER_LABEL: Record<TechniqueTier, string> = {
  core: 'Core',
  dp: 'DP framework — not started',
  tier1: 'Tier 1 · above the interview-ROI line — not started',
  tier2: 'Tier 2 · below the ROI line (competitive) — not started',
  tier3: 'Tier 3 · below the ROI line (competitive) — not started',
};

/**
 * The technique-breadth drill: "which 94, and how am I doing on each?" Grouped by TIER
 * first (round 2 — the honest denominator's detail view), family within each tier. Entirely
 * derived from the summary's `techniques[]` (a few KB, already on the page) — this
 * component never fetches anything, so opening it never mounts a network request.
 */
@Component({
  selector: 'app-technique-list',
  templateUrl: './technique-list.component.html',
  styleUrls: ['./technique-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TechniqueListComponent {
  readonly techniques = input.required<Technique[]>();

  readonly groups = computed<TierGroup[]>(() => {
    const byTier = new Map<TechniqueTier, Technique[]>();
    for (const t of this.techniques()) {
      const bucket = byTier.get(t.tier);
      if (bucket) {
        bucket.push(t);
      } else {
        byTier.set(t.tier, [t]);
      }
    }
    return TIER_ORDER.filter((tier) => byTier.has(tier)).map((tier) => {
      const items = byTier.get(tier)!;
      const byFamily = new Map<string, Technique[]>();
      for (const t of items) {
        const bucket = byFamily.get(t.family);
        if (bucket) {
          bucket.push(t);
        } else {
          byFamily.set(t.family, [t]);
        }
      }
      const families: FamilyGroup[] = [...byFamily.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([family, familyItems]) => ({
          family,
          items: [...familyItems].sort((a, b) => a.name.localeCompare(b.name)),
        }));
      return { tier, label: TIER_LABEL[tier], families };
    });
  });
}
