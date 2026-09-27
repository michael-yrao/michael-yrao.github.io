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

/** `stages`: a progression bar (the default — pipeline, roadmap). `mix`: a slim breakdown bar
 *  (difficulty) with no height to carry a label. Both variants share the same legend row
 *  beneath the bar; only the bar's own height (32px vs 12px) and the in-segment text (a bare
 *  count on `stages`, nothing at all on `mix`) differ between them. */
export type SegmentedBarVariant = 'stages' | 'mix';

/**
 * One reusable horizontal stacked bar — the mastery pipeline, the difficulty mix, and the
 * technique-breadth bar all render through this SAME component (round 4: the learner's
 * complaint was that the breadth bar had a different, harder-to-read shape than the
 * pipeline — "similar things should have similar frameworks"). Every segment gets a legend
 * entry below the bar (swatch · label · count); the in-segment text itself carries only the
 * count, so a narrow segment never has to fit a full label and the bar stays legible at any
 * width.
 *
 * `clickable` is an explicit flag rather than inferred from whether `segmentClick` has a
 * subscriber — Angular's signal-based `output()` exposes no public "is anyone listening"
 * check. A caller that wires `(segmentClick)` also sets `[clickable]="true"`, which renders
 * each segment (on a `stages` bar) and every legend entry as a real `<button>`; otherwise
 * both are plain, non-interactive elements.
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
  readonly variant = input<SegmentedBarVariant>('stages');
  readonly axisStart = input<string | null>(null);
  readonly axisEnd = input<string | null>(null);
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
