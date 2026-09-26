import { ChangeDetectionStrategy, Component, computed, input, signal } from '@angular/core';

import { Badge } from '../../../core/models/progress.model';

export type BadgeFilter = 'all' | 'earned' | 'locked';

const FILTERS: readonly BadgeFilter[] = ['all', 'earned', 'locked'];
const FILTER_LABEL: Record<BadgeFilter, string> = {
  all: 'All',
  earned: 'Earned',
  locked: 'Locked',
};
const PERCENT_SCALE = 100;

/** A mini-bar / meter percentage, clamped to [0, 100] — a `target` of 0 (or below) reads
 *  as 0% rather than dividing by zero. */
function progressPercent(current: number, target: number): number {
  if (target <= 0) return 0;
  const raw = (current / target) * PERCENT_SCALE;
  return Math.min(PERCENT_SCALE, Math.max(0, raw));
}

function matchesFilter(b: Badge, filter: BadgeFilter): boolean {
  if (filter === 'earned') return b.earned;
  if (filter === 'locked') return !b.earned;
  return true;
}

/** Earned-vs-locked achievement grid. Each badge shows its honest trigger on hover/focus,
 *  so it is always clear what genuine event unlocks it — never a raw count or a rating. The
 *  summary row states "earned / total" with a meter, and All/Earned/Locked chips filter the
 *  grid; a locked counter badge (one carrying `progress`) also shows how far it is from its
 *  target via a mini bar. */
@Component({
  selector: 'app-badge-grid',
  templateUrl: './badge-grid.component.html',
  styleUrls: ['./badge-grid.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BadgeGridComponent {
  readonly badges = input.required<Badge[]>();

  readonly filter = signal<BadgeFilter>('all');
  readonly filters = FILTERS;

  readonly sorted = computed(() =>
    [...this.badges()].sort((a, b) => Number(b.earned) - Number(a.earned)),
  );

  readonly total = computed(() => this.badges().length);
  readonly earnedCount = computed(() => this.badges().filter((b) => b.earned).length);
  readonly lockedCount = computed(() => this.total() - this.earnedCount());
  readonly earnedPct = computed(() => progressPercent(this.earnedCount(), this.total()));

  readonly visible = computed(() => this.sorted().filter((b) => matchesFilter(b, this.filter())));

  setFilter(f: BadgeFilter): void {
    this.filter.set(f);
  }

  isFilterActive(f: BadgeFilter): boolean {
    return this.filter() === f;
  }

  /** Button label with its count, e.g. "Locked (4)". */
  filterLabel(f: BadgeFilter): string {
    const count = f === 'all' ? this.total() : f === 'earned' ? this.earnedCount() : this.lockedCount();
    return `${FILTER_LABEL[f]} (${count})`;
  }

  /** A locked counter badge's mini-bar percentage; badges without `progress` never call this. */
  badgeProgressPct(b: Badge): number {
    return b.progress ? progressPercent(b.progress.current, b.progress.target) : 0;
  }
}
