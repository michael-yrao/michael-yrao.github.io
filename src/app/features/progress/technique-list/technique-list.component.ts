import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';

import { Comfort, ProblemProgress, Technique, TechniqueTier } from '../../../core/models/progress.model';
import { vizRouteFor } from '../../../core/data/viz-route';
import { shortMonthDay as shortMonthDayFor } from '../../../core/utils/local-date';
import {
  comfortClass as comfortClassFor,
  ComfortClass,
  deriveTechniqueStats,
  readStoredView,
  shortName as shortNameFor,
  TechniqueStats,
  TechniqueView,
  writeStoredView,
} from './technique-map';

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
  imports: [RouterLink, NgTemplateOutlet],
})
export class TechniqueListComponent {
  readonly techniques = input.required<Technique[]>();
  /** The full problems[] (from ProgressService.details), for the expand-to-problems join.
   *  null until loadDetails() has resolved at least once. */
  readonly details = input<ProblemProgress[] | null>(null);
  readonly expand = output<Technique>();

  private readonly expandedNames = signal<ReadonlySet<string>>(new Set());

  /** List vs. Map (heatmap) — persisted per viewer, default List. */
  readonly view = signal<TechniqueView>(readStoredView());
  private primed = false;

  constructor() {
    // One-shot priming: the Map view's per-cell stats (green count, last-touched) need
    // `details`, which the parent only fetches on-demand — same lazy pattern as a list row's
    // own expand. Landing on Map with no details yet kicks that fetch off exactly once, via
    // the first started technique; the (default) List view never triggers this.
    effect(() => {
      if (this.view() !== 'map' || this.details() !== null || this.primed) return;
      const first = this.techniques().find((t) => t.started);
      if (!first) return;
      this.primed = true;
      untracked(() => this.expand.emit(first));
    });
  }

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

  /** All fetched problem details, keyed by LC number — the one join both problemsFor() and
   *  statsFor() read, so it's built once per details() change rather than once per call. */
  readonly detailsByNumber = computed<ReadonlyMap<number, ProblemProgress> | null>(() => {
    const list = this.details();
    return list ? new Map(list.map((p) => [p.lcNumber, p])) : null;
  });

  private readonly stats = computed<ReadonlyMap<string, TechniqueStats>>(() => {
    const byNumber = this.detailsByNumber() ?? new Map<number, ProblemProgress>();
    return new Map(this.techniques().map((t) => [t.name, deriveTechniqueStats(t, byNumber)]));
  });

  /** stats() always covers every technique currently in techniques() — built by mapping over
   *  that same signal above — so a lookup miss here would mean t isn't one of them. */
  statsFor(t: Technique): TechniqueStats {
    return this.stats().get(t.name)!;
  }

  setView(next: TechniqueView): void {
    this.view.set(next);
    writeStoredView(next);
  }

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
    const byNumber = this.detailsByNumber();
    if (!byNumber) return null;
    return t.problems.map((n) => byNumber.get(n)).filter((p): p is ProblemProgress => !!p);
  }

  vizRoute(lcNumber: number): string | null {
    return vizRouteFor(lcNumber);
  }

  comfortClass(comfort: Comfort | null): ComfortClass {
    return comfortClassFor(comfort);
  }

  shortName(name: string): string {
    return shortNameFor(name);
  }

  shortMonthDay(iso: string): string {
    return shortMonthDayFor(iso);
  }
}
