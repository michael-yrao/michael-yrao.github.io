import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';

import { EngineService, HoldResult } from '../../../../core/engine/engine.service';
import { ProblemProgress } from '../../../../core/models/progress.model';
import { RepoRef } from '../../../../core/services/github-file.service';
import { addDaysISO } from '../../../../core/utils/local-date';

const MAX_HOLD_DAYS = 90; // mirrors worker/src/engine/hold.ts MAX_HOLD_DAYS (the Worker enforces it)
const MONTH_SLICE_START = 5;
const MONTH_SLICE_END = 7;
const DAY_SLICE_START = 8;
const DAY_SLICE_END = 10;

const NO_ROW_MESSAGE = 'This problem has no tracker row yet. Finish one rep first.';
const OWNED_MESSAGE = 'This hold was set by a coach decision. Change it in the repo.';

const REFUSAL_MESSAGES: Readonly<Partial<Record<HoldResult, string>>> = {
  'no-row': NO_ROW_MESSAGE,
  owned: OWNED_MESSAGE,
};

/** The hold mark `⏸ MM/DD` for a `YYYY-MM-DD` date. */
function holdMark(iso: string): string {
  return `⏸ ${iso.slice(MONTH_SLICE_START, MONTH_SLICE_END)}/${iso.slice(DAY_SLICE_START, DAY_SLICE_END)}`;
}

/** One board row's hold: the mark while a hold is live, a date picker to set one, and Release. */
@Component({
  selector: 'app-hold-control',
  templateUrl: './hold-control.component.html',
  styleUrl: './hold-control.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HoldControlComponent {
  readonly problem = input<ProblemProgress | null>(null);
  readonly itemTitle = input('');
  readonly lcNumber = input(0);
  readonly repoRef = input<RepoRef | null>(null);
  readonly todayISO = input('');

  private readonly engine = inject(EngineService);

  /** Set after a successful call (the repo's progress.json only updates after the regenerate
   *  Action runs): a date, null for released, undefined while the summary's value stands. */
  private readonly override = signal<string | null | undefined>(undefined);

  protected readonly isPickerOpen = signal(false);
  protected readonly isBusy = signal(false);
  protected readonly refusal = signal<string | null>(null);

  protected readonly minDate = computed(() => addDaysISO(this.todayISO(), 1));
  protected readonly maxDate = computed(() => addDaysISO(this.todayISO(), MAX_HOLD_DAYS));

  protected readonly mark = computed<string | null>(() => {
    const override = this.override();
    const until = override === undefined ? (this.problem()?.heldUntil ?? null) : override;
    return until !== null && until >= this.todayISO() ? holdMark(until) : null;
  });

  protected togglePicker(): void {
    this.isPickerOpen.update((isOpen) => !isOpen);
  }

  protected onDateChange(event: Event): void {
    const until = (event.target as HTMLInputElement).value;
    if (until >= this.minDate() && until <= this.maxDate()) void this.apply(until);
  }

  protected release(): void {
    void this.apply(null);
  }

  private async apply(until: string | null): Promise<void> {
    const ref = this.repoRef();
    if (ref === null || this.isBusy()) return;
    this.isBusy.set(true);
    this.refusal.set(null);
    const result = await this.engine.hold(ref, {
      number: this.lcNumber(),
      title: this.problem()?.title ?? this.itemTitle(),
      until,
      today: this.todayISO(),
    });
    this.settle(result, until);
    this.isBusy.set(false);
  }

  private settle(result: HoldResult, until: string | null): void {
    this.refusal.set(REFUSAL_MESSAGES[result] ?? null);
    if (result === 'held' || result === 'released' || result === 'unchanged') {
      this.override.set(until);
      this.isPickerOpen.set(false);
    }
  }
}
