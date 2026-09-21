import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

/** One stacked-bar segment: `cls` names a color-modifier class defined in this component's
 *  OWN stylesheet (seg-blank/seg-easy/seg-practiced/… — see segmented-bar.component.scss)
 *  so every caller draws from the same small palette instead of inventing its own per bar. */
export interface SegmentedBarSegment {
  key: string;
  label: string;
  value: number;
  cls: string;
}

/**
 * One reusable horizontal stacked bar — the mastery pipeline, the difficulty mix, and the
 * technique-breadth bar all render through this SAME component (round 4: the learner's
 * complaint was that the breadth bar had a different, harder-to-read shape than the
 * pipeline — "similar things should have similar frameworks"). Each segment is
 * self-labeling (its own label + value print ON the segment, not hidden behind a
 * hover-only tooltip or a separate legend), so the bar reads on its own.
 *
 * `clickable` is an explicit flag rather than inferred from whether `segmentClick` has a
 * subscriber — Angular's signal-based `output()` exposes no public "is anyone listening"
 * check. A caller that wires `(segmentClick)` also sets `[clickable]="true"`, which renders
 * each segment as a real `<button>`; otherwise segments are plain, non-interactive `<span>`s.
 */
@Component({
  selector: 'app-segmented-bar',
  templateUrl: './segmented-bar.component.html',
  styleUrls: ['./segmented-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SegmentedBarComponent {
  readonly segments = input.required<SegmentedBarSegment[]>();
  readonly title = input<string | null>(null);
  readonly caption = input<string | null>(null);
  readonly clickable = input(false);
  readonly segmentClick = output<SegmentedBarSegment>();

  // Zero-value segments are dropped — a 0-wide segment is not "consistent," it's an
  // invisible click target and a dead aria-label entry.
  readonly visibleSegments = computed(() => this.segments().filter((s) => s.value > 0));

  readonly total = computed(() => this.visibleSegments().reduce((sum, s) => sum + s.value, 0));

  readonly ariaLabel = computed(() => {
    const parts = this.visibleSegments().map((s) => `${s.label}: ${s.value}`);
    const prefix = this.title() ? `${this.title()} — ` : '';
    return prefix + (parts.length ? parts.join(', ') : 'no data');
  });

  pct(value: number): number {
    const total = this.total();
    return total ? (value / total) * 100 : 0;
  }

  onSegmentClick(seg: SegmentedBarSegment): void {
    this.segmentClick.emit(seg);
  }
}
