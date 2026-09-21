import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ProblemProgress, Technique, TechniqueTier } from '../../../core/models/progress.model';
import { vizRouteFor } from '../../../core/data/viz-route';

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
 * first (round 2 — the honest denominator's detail view), family within each tier. The list
 * itself is entirely derived from the summary's `techniques[]` (a few KB, already on the
 * page) — grouping and the count/target ratio never fetch anything.
 *
 * Round 3: clicking a row expands it to its problems (`technique.problems`, a list of LC
 * numbers) — joined against `details` (the full `problems[]`, passed in by the parent) for
 * title/comfort/difficulty/url. `details` is null until the parent's Problems tab (or this
 * expand) has triggered `loadDetails()`; expanding a technique for the first time emits
 * `expand`, which the parent wires to `loadDetails()` — same on-demand, cached pattern as
 * the Problems tab. A not-started technique (empty `problems`) never emits `expand`; it just
 * shows "not started yet."
 */
@Component({
  selector: 'app-technique-list',
  templateUrl: './technique-list.component.html',
  styleUrls: ['./technique-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
})
export class TechniqueListComponent {
  readonly techniques = input.required<Technique[]>();
  /** The full problems[] (from ProgressService.details), for the expand-to-problems join.
   *  null until loadDetails() has resolved at least once. */
  readonly details = input<ProblemProgress[] | null>(null);
  readonly expand = output<Technique>();

  private readonly expandedNames = signal<ReadonlySet<string>>(new Set());

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

  toggle(t: Technique): void {
    const key = t.name;
    const next = new Set(this.expandedNames());
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
      if (t.started) this.expand.emit(t);
    }
    this.expandedNames.set(next);
  }

  isExpanded(t: Technique): boolean {
    return this.expandedNames().has(t.name);
  }

  /** null = details not loaded yet (show a loading hint); [] = loaded but nothing matched. */
  problemsFor(t: Technique): ProblemProgress[] | null {
    const list = this.details();
    if (!list) return null;
    const byNum = new Map(list.map((p) => [p.lcNumber, p]));
    return t.problems.map((n) => byNum.get(n)).filter((p): p is ProblemProgress => !!p);
  }

  vizRoute(lcNumber: number): string | null {
    return vizRouteFor(lcNumber);
  }
}
