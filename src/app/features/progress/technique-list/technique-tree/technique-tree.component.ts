import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { ProblemProgress, Technique } from '../../../../core/models/progress.model';
import {
  deriveTechniqueStats,
  isMastered,
  shortName as shortNameFor,
  TechniqueStats,
} from '../technique-view';
import {
  buildTechniqueGraph,
  layoutLayeredDag,
  NODE_H,
  NODE_W,
  TreeLayout,
} from '../technique-tree-layout';

/** A tight node label truncates rather than wraps — long enough for most technique names,
 *  short enough to stay inside NODE_W at the tree's font size. */
const MAX_NODE_LABEL_CHARS = 16;

/** The Mastery tab's skill tree: one inline SVG rendering every technique as a node, joined
 *  by prerequisite edges (`buildsOn`), laid out as a layered DAG by `layoutLayeredDag`. A
 *  node is solid ("mastered") once its graduated (🎓/🏆) count reaches `minProblems` — a
 *  two-state color, no gradient — and neutral otherwise; a never-started technique also gets
 *  a dashed outline. Purely presentational: it takes the same `techniques`/`details` the list
 *  view already has (so an older contract with no `buildsOn`/`graduatedCount` still renders —
 *  no edges, and mastery derived from `details` once loaded) and reports a click/Enter/Space
 *  on a node via `select`, exactly like a list row's own toggle. */
@Component({
  selector: 'app-technique-tree',
  templateUrl: './technique-tree.component.html',
  styleUrls: ['./technique-tree.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TechniqueTreeComponent {
  readonly techniques = input.required<Technique[]>();
  readonly details = input<ProblemProgress[] | null>(null);
  readonly expandedName = input<string | null>(null);
  readonly select = output<Technique>();

  readonly NODE_W = NODE_W;
  readonly NODE_H = NODE_H;

  readonly graph = computed(() => buildTechniqueGraph(this.techniques()));
  readonly layout = computed<TreeLayout>(() => layoutLayeredDag(this.graph()));

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

  graduatedCountFor(name: string): number {
    const t = this.techniqueFor(name);
    return t.graduatedCount ?? this.statsFor(name).graduatedCount;
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
}
