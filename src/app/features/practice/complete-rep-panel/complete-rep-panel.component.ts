import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { AttemptComplexity, AttemptRating, RATING_OPTIONS } from '../../../core/practice/practice-attempt';

type BoundKey = 'time' | 'space';

/** The reference answer for the problem being completed. */
export interface ReferenceBounds {
  readonly time: string;
  readonly space: string;
  readonly whyTime: string | null;
  readonly whySpace: string | null;
}

/** What Save rep hands the page: the comfort rating and the stated bounds. */
export interface CompletedRep {
  readonly rating: AttemptRating;
  readonly complexity: AttemptComplexity;
}

interface BoundDraft {
  readonly label: string | null;
  readonly why: string;
}

interface BoundRow {
  readonly key: BoundKey;
  readonly name: string;
  readonly label: string | null;
  readonly why: string;
  /** Set once checked against a reference: the mark and the reference's why, if it has one. */
  readonly reveal: { readonly isMatch: boolean; readonly mark: string; readonly why: string | null } | null;
}

const EMPTY_DRAFT: BoundDraft = { label: null, why: '' };
const MATCH_MARK = '✓';
const MISS_MARK = '✗';
const BOUND_NAMES: Readonly<Record<BoundKey, string>> = { time: 'Time', space: 'Space' };
const BOUND_KEYS: readonly BoundKey[] = ['time', 'space'];

/** The complexity-first completion panel, shown in the Output pane: state both bounds with a why, Check, then rate and save. */
@Component({
  selector: 'app-complete-rep-panel',
  templateUrl: './complete-rep-panel.component.html',
  styleUrl: './complete-rep-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CompleteRepPanelComponent {
  protected readonly headingId = 'rep-heading';
  readonly pool = input.required<readonly string[]>();
  readonly reference = input<ReferenceBounds | null>(null);
  readonly saved = output<CompletedRep>();
  readonly closed = output<void>();

  protected readonly ratingOptions = RATING_OPTIONS;

  private readonly drafts = signal<Readonly<Record<BoundKey, BoundDraft>>>({ time: EMPTY_DRAFT, space: EMPTY_DRAFT });
  protected readonly isChecked = signal(false);
  protected readonly rating = signal<AttemptRating | null>(null);

  protected readonly canCheck = computed(
    () => !this.isChecked() && BOUND_KEYS.every((key) => this.isDraftComplete(this.drafts()[key])),
  );

  protected readonly rows = computed<readonly BoundRow[]>(() =>
    BOUND_KEYS.map((key) => ({ key, name: BOUND_NAMES[key], ...this.drafts()[key], reveal: this.revealFor(key) })),
  );

  protected pick(key: BoundKey, label: string): void {
    this.updateDraft(key, { label });
  }

  protected onWhy(key: BoundKey, event: Event): void {
    this.updateDraft(key, { why: (event.target as HTMLInputElement).value });
  }

  protected check(): void {
    if (this.canCheck()) this.isChecked.set(true);
  }

  protected save(): void {
    const rating = this.rating();
    if (!this.isChecked() || rating === null) return;
    const { time, space } = this.drafts();
    this.saved.emit({
      rating,
      complexity: {
        time: time.label ?? '',
        space: space.label ?? '',
        whyTime: time.why.trim(),
        whySpace: space.why.trim(),
      },
    });
  }

  private updateDraft(key: BoundKey, change: Partial<BoundDraft>): void {
    if (this.isChecked()) return;
    this.drafts.update((all) => ({ ...all, [key]: { ...all[key], ...change } }));
  }

  private isDraftComplete(draft: BoundDraft): boolean {
    return draft.label !== null && draft.why.trim().length > 0;
  }

  private revealFor(key: BoundKey): BoundRow['reveal'] {
    const reference = this.reference();
    if (!this.isChecked() || reference === null) return null;
    const isMatch = this.drafts()[key].label === reference[key];
    return {
      isMatch,
      mark: isMatch ? MATCH_MARK : `${MISS_MARK} ${reference[key]}`,
      why: key === 'time' ? reference.whyTime : reference.whySpace,
    };
  }
}
