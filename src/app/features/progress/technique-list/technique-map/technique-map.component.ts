import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { ProblemProgress, Technique } from '../../../../core/models/progress.model';
import {
  coverageTitle,
  deriveTechniqueStats,
  doneOf,
  isMastered,
  plannedTotalOf,
  shortName as shortNameFor,
  TechniqueStats,
} from '../technique-view';
import {
  buildTechniqueGraph,
  EXPANSION_FAMILY,
  layoutSwimlanes,
  NODE_H,
  NODE_W,
  SwimlaneLayout,
} from '../technique-map-layout';

/** A tight node label truncates rather than wraps — long enough for most technique names,
 *  short enough to stay inside NODE_W at the map's font size. */
const MAX_NODE_LABEL_CHARS = 16;

/** The Mastery tab's technique map: one horizontal lane per family, an inline SVG rendering
 *  every technique as a node placed left→right by prerequisite depth, joined by prerequisite
 *  edges (`buildsOn`) — laid out by `layoutSwimlanes`. A node is solid ("mastered") once its
 *  graduated (🎓/🏆) count reaches `minProblems` — a two-state color, no gradient — and neutral
 *  otherwise; a never-started technique also gets a dashed outline. The `expansion` family
 *  (tier 1–3, none started) is collapsed behind a toggle by default, since it stacks up to 10
 *  techniques deep in one column. Purely presentational: it takes the same `techniques`/
 *  `details` the list view already has (so an older contract with no `buildsOn`/`graduatedCount`
 *  still renders — no edges, and mastery derived from `details` once loaded) and reports a
 *  click/Enter/Space on a node via `select`, exactly like a list row's own toggle. */
@Component({
  selector: 'app-technique-map',
  templateUrl: './technique-map.component.html',
  styleUrls: ['./technique-map.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TechniqueMapComponent {
  readonly techniques = input.required<Technique[]>();
  readonly details = input<ProblemProgress[] | null>(null);
  readonly expandedName = input<string | null>(null);
  readonly select = output<Technique>();

  readonly NODE_W = NODE_W;
  readonly NODE_H = NODE_H;

  // Pure done/planned bar helpers (technique-view.ts) — bound directly as instance
  // properties so the node-label template can call them per technique.
  readonly doneOf = doneOf;
  readonly plannedTotalOf = plannedTotalOf;
  readonly coverageTitle = coverageTitle;

  readonly graph = computed(() => buildTechniqueGraph(this.techniques()));

  /** Whether the collapsed `expansion` lane (tier 1–3, none started) is currently shown —
   *  default false, since it stacks up to 10 techniques deep in one column. */
  readonly showExpansion = signal(false);

  /** Count of techniques in the `expansion` family — drives both the toggle's label and
   *  whether the toggle appears at all (absent when this is 0). */
  readonly expansionCount = computed(
    () => this.techniques().filter((t) => t.family === EXPANSION_FAMILY).length,
  );

  private readonly hiddenFamilies = computed<ReadonlySet<string>>(() =>
    this.showExpansion() || this.expansionCount() === 0 ? new Set() : new Set([EXPANSION_FAMILY]),
  );

  readonly layout = computed<SwimlaneLayout>(() =>
    layoutSwimlanes(this.graph(), { hiddenFamilies: this.hiddenFamilies() }),
  );

  readonly hasSelection = computed(() => this.expandedName() !== null);

  private readonly detailsByNumber = computed<ReadonlyMap<number, ProblemProgress>>(() => {
    const list = this.details();
    return list ? new Map(list.map((p) => [p.lcNumber, p])) : new Map();
  });

  private readonly statsByName = computed<ReadonlyMap<string, TechniqueStats>>(() => {
    const byNumber = this.detailsByNumber();
    return new Map(this.techniques().map((t) => [t.name, deriveTechniqueStats(t, byNumber)]));
  });

  techniqueFor(name: string): Technique {
    return this.graph().techniques.get(name)!;
  }

  statsFor(name: string): TechniqueStats {
    return this.statsByName().get(name)!;
  }

  isMastered(name: string): boolean {
    return isMastered(this.techniqueFor(name), this.statsFor(name));
  }

  isSelected(name: string): boolean {
    return name === this.expandedName();
  }

  isEdgeHighlighted(from: string, to: string): boolean {
    const selected = this.expandedName();
    return selected !== null && (from === selected || to === selected);
  }

  shortName(name: string): string {
    return shortNameFor(name);
  }

  clampLabel(name: string): string {
    const label = this.shortName(name);
    return label.length > MAX_NODE_LABEL_CHARS
      ? `${label.slice(0, MAX_NODE_LABEL_CHARS - 1)}…`
      : label;
  }

  onSelect(name: string): void {
    this.select.emit(this.techniqueFor(name));
  }

  toggleExpansion(): void {
    this.showExpansion.set(!this.showExpansion());
  }
}
