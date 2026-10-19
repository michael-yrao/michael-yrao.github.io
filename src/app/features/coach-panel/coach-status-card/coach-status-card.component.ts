import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import type { CoachStatus } from '../../../core/models/coach.model';

const SHORT_HEAD_LENGTH = 7;
const COST_DECIMALS = 2;
const NO_HEAD_MARK = '—';
const HEAD_MARK = '⌗';

type CoachDot = 'awake' | 'waking' | 'asleep';

@Component({
  selector: 'app-coach-status-card',
  templateUrl: './coach-status-card.component.html',
  styleUrls: ['./coach-status-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoachStatusCardComponent {
  readonly status = input.required<CoachStatus | null>();
  readonly isWaking = input(false);

  protected readonly headMark = HEAD_MARK;

  protected readonly dot = computed<CoachDot>(() => {
    if (this.status()?.awake) return 'awake';
    return this.isWaking() ? 'waking' : 'asleep';
  });
  protected readonly head = computed(() => this.status()?.repoHead?.slice(0, SHORT_HEAD_LENGTH) ?? NO_HEAD_MARK);
  protected readonly isDirty = computed(() => this.status()?.dirty ?? false);
  protected readonly cost = computed(() => `$${(this.status()?.sessionCostUsd ?? 0).toFixed(COST_DECIMALS)}`);
}
