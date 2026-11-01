import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';

import { AttemptComplexity, AttemptRating, RATING_OPTIONS } from '../../../core/practice/practice-attempt';
import { ComfortMarkComponent } from '../../../shared/components/comfort-mark/comfort-mark.component';
import { IconComponent } from '../../../shared/components/icon/icon.component';
import { IconName } from '../../../shared/components/icon/icon-paths';

type BoundKey = 'time' | 'space';

/** The reference answer for the problem being completed. */
export interface ReferenceBounds {
  readonly time: string;
  readonly space: string;
  readonly whyTime: string | null;
  readonly whySpace: string | null;
}

/** The labels the analyzer read off the learner's code; null on an axis it abstained from. */
export interface InferredBounds {
  readonly time: string | null;
  readonly space: string | null;
}

/** What an axis was graded against. */
type GradeSource = 'code' | 'reference';

/** The labels offered for each bound. */
export interface RepChoices {
  readonly time: readonly string[];
  readonly space: readonly string[];
}

/** One variable of the problem: its symbol and what it counts. */
export interface LegendItem {
  readonly symbol: string;
  readonly meaning: string;
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
  readonly choices: readonly string[];
  readonly why: string;
  readonly remaining: number | null;
  /** Set once checked against a reference: the mark word, the reference bound on a miss, and the reference's why, if it has one. */
  readonly reveal: {
    readonly isMatch: boolean;
    readonly mark: string;
    readonly expected: string | null;
    readonly why: string | null;
    readonly source: GradeSource;
    readonly sourceIcon: IconName;
    readonly sourceLabel: string;
  } | null;
}

const EMPTY_DRAFT: BoundDraft = { label: null, why: '' };
const MATCH_MARK = 'pass';
const MISS_MARK = 'fail';
const SOURCE_MARKS: Readonly<Record<GradeSource, { readonly icon: IconName; readonly label: string }>> = {
  code: { icon: 'terminal', label: 'Graded against your code' },
  reference: { icon: 'file', label: 'Graded against the reference' },
};
const BOUND_NAMES: Readonly<Record<BoundKey, string>> = { time: 'Time', space: 'Space' };
const BOUND_KEYS: readonly BoundKey[] = ['time', 'space'];
// The same cap lives in worker/src/practice/validate.ts (MAX_WHY_CHARS), cse-progress/scripts/fold_attempt.py
// and cse-coach/scripts/fold_attempt.py (WHY_MAX_CHARS); a cap change touches all four.
const WHY_MAX_CHARS = 2000;
/** The remaining-character count shows once this few characters are left. */
const WHY_COUNT_THRESHOLD = 50;

/** The remaining characters once few enough are left to show; null before that. */
function remainingCount(why: string): number | null {
  const remaining = WHY_MAX_CHARS - why.length;
  return remaining <= WHY_COUNT_THRESHOLD ? remaining : null;
}

/** `choices` with `label` added at its place in `pool` (before the first choice the pool lists later; at the end when the pool lacks it). */
function withLabel(choices: readonly string[], label: string | null, pool: readonly string[]): readonly string[] {
  if (label === null || choices.includes(label)) return choices;
  const rank = pool.indexOf(label);
  const at = rank === -1 ? -1 : choices.findIndex((choice) => pool.indexOf(choice) > rank);
  return at === -1 ? [...choices, label] : [...choices.slice(0, at), label, ...choices.slice(at)];
}

/** The complexity-first completion panel, filling the right column: state both bounds with a why, Check, then rate and save. */
@Component({
  selector: 'app-complete-rep-panel',
  templateUrl: './complete-rep-panel.component.html',
  styleUrl: './complete-rep-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ComfortMarkComponent, IconComponent],
})
export class CompleteRepPanelComponent {
  protected readonly headingId = 'rep-heading';
  /** The labels each row offers. */
  readonly choices = input.required<RepChoices>();
  /** The problem's variables, shown under the heading; empty shows nothing. */
  readonly legend = input<readonly LegendItem[]>([]);
  readonly reference = input<ReferenceBounds | null>(null);
  /** What the analyzer read off the learner's code; an axis with a label is graded against it. */
  readonly inferred = input<InferredBounds | null>(null);
  /** The complexity-label pool in order; places an inferred label among the choices. */
  readonly pool = input<readonly string[]>([]);
  readonly saved = output<CompletedRep>();
  readonly closed = output<void>();

  protected readonly ratingOptions = RATING_OPTIONS;
  protected readonly whyMaxChars = WHY_MAX_CHARS;

  private readonly drafts = signal<Readonly<Record<BoundKey, BoundDraft>>>({ time: EMPTY_DRAFT, space: EMPTY_DRAFT });
  protected readonly isChecked = signal(false);
  protected readonly rating = signal<AttemptRating | null>(null);

  protected readonly canCheck = computed(
    () => !this.isChecked() && BOUND_KEYS.every((key) => this.isDraftComplete(this.drafts()[key])),
  );

  protected readonly rows = computed<readonly BoundRow[]>(() =>
    BOUND_KEYS.map((key) => {
      const draft = this.drafts()[key];
      const choices = withLabel(this.choices()[key], this.inferred()?.[key] ?? null, this.pool());
      return { key, name: BOUND_NAMES[key], choices, ...draft, remaining: remainingCount(draft.why), reveal: this.revealFor(key) };
    }),
  );

  /** An axis with neither an inferred label nor a reference to grade against. */
  protected readonly hasUngradedRow = computed(() => this.rows().some((row) => row.reveal === null));

  protected pick(key: BoundKey, label: string): void {
    this.updateDraft(key, { label });
  }

  protected onWhy(key: BoundKey, event: Event): void {
    this.updateDraft(key, { why: (event.target as HTMLTextAreaElement).value });
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
    const inferredLabel = this.inferred()?.[key] ?? null;
    if (!this.isChecked() || (inferredLabel === null && reference === null)) return null;
    const source: GradeSource = inferredLabel === null ? 'reference' : 'code';
    const answer = inferredLabel ?? reference?.[key] ?? '';
    const isMatch = this.drafts()[key].label === answer;
    const referenceWhy = key === 'time' ? reference?.whyTime : reference?.whySpace;
    return {
      isMatch,
      mark: isMatch ? MATCH_MARK : MISS_MARK,
      expected: isMatch ? null : answer,
      // The reference's why can contradict the learner's own code, so only a reference-graded axis shows it.
      why: source === 'reference' ? (referenceWhy ?? null) : null,
      source,
      sourceIcon: SOURCE_MARKS[source].icon,
      sourceLabel: SOURCE_MARKS[source].label,
    };
  }
}
