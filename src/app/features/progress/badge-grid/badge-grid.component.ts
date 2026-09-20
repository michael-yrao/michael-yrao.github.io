import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { Badge } from '../../../core/models/progress.model';

/** Earned-vs-locked achievement grid. Each badge shows its honest trigger on hover/focus,
 *  so it is always clear what genuine event unlocks it — never a raw count or a rating. */
@Component({
  selector: 'app-badge-grid',
  templateUrl: './badge-grid.component.html',
  styleUrls: ['./badge-grid.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BadgeGridComponent {
  readonly badges = input.required<Badge[]>();

  readonly sorted = computed(() =>
    [...this.badges()].sort((a, b) => Number(b.earned) - Number(a.earned)),
  );
  readonly earnedCount = computed(() => this.badges().filter((b) => b.earned).length);
}
