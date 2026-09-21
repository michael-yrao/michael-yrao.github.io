import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { Technique } from '../../../core/models/progress.model';

interface TechniqueGroup {
  family: string;
  items: Technique[];
}

/**
 * The technique-breadth drill: "which 56, and how am I doing on each?" Grouped by family,
 * each row shows name · #problems · best comfort · thin/gap chips. Entirely derived from the
 * summary's `techniques[]` (a few KB, already on the page) — this component never fetches
 * anything, so opening it never mounts a network request or a per-problem chart.
 */
@Component({
  selector: 'app-technique-list',
  templateUrl: './technique-list.component.html',
  styleUrls: ['./technique-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TechniqueListComponent {
  readonly techniques = input.required<Technique[]>();

  readonly groups = computed<TechniqueGroup[]>(() => {
    const byFamily = new Map<string, Technique[]>();
    for (const t of this.techniques()) {
      const bucket = byFamily.get(t.family);
      if (bucket) {
        bucket.push(t);
      } else {
        byFamily.set(t.family, [t]);
      }
    }
    return [...byFamily.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([family, items]) => ({
        family,
        items: [...items].sort((a, b) => a.name.localeCompare(b.name)),
      }));
  });
}
