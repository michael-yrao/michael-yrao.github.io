import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';

import { pieSlices } from './pie-geometry';

/** One pie slice: `cls` names a colour class defined in this component's OWN stylesheet
 *  (seg-blank/seg-easy/… — see pie-chart.component.scss) so every caller draws from the same
 *  small palette instead of inventing its own per chart. */
export interface ChartSegment {
  key: string;
  label: string;
  value: number;
  cls: string;
}

const PIE_RADIUS = 80;
const SLICE_GAP_PX = 2;
const PIE_DIAMETER = PIE_RADIUS * 2;

/**
 * One reusable full pie — the mastery pipeline and the difficulty mix both render through
 * this component. Every slice gets a legend entry beside the pie (swatch · label · count); a
 * slice itself carries no text.
 *
 * `clickable` is an explicit flag rather than inferred from whether `segmentClick` has a
 * subscriber — Angular's signal-based `output()` exposes no public "is anyone listening"
 * check. A caller that wires `(segmentClick)` also sets `[clickable]="true"`, which makes each
 * slice a focusable SVG button and every legend entry a real `<button>`; otherwise both are
 * plain, non-interactive elements.
 */
@Component({
  selector: 'app-pie-chart',
  templateUrl: './pie-chart.component.html',
  styleUrls: ['./pie-chart.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PieChartComponent {
  readonly segments = input.required<ChartSegment[]>();
  readonly title = input<string | null>(null);
  readonly clickable = input(false);
  readonly segmentClick = output<ChartSegment>();

  protected readonly radius = PIE_RADIUS;
  protected readonly sliceGap = SLICE_GAP_PX;
  protected readonly viewBox = `${-PIE_RADIUS} ${-PIE_RADIUS} ${PIE_DIAMETER} ${PIE_DIAMETER}`;

  // Zero-value segments are dropped — a 0-sweep slice is an invisible click target and a
  // dead aria-label entry.
  readonly slices = computed(() => pieSlices(this.segments(), PIE_RADIUS));

  readonly ariaLabel = computed(() => {
    const parts = this.slices().map((s) => `${s.segment.label}: ${s.segment.value}`);
    const prefix = this.title() ? `${this.title()} — ` : '';
    return prefix + (parts.length ? parts.join(', ') : 'no data');
  });

  onSegmentClick(seg: ChartSegment): void {
    this.segmentClick.emit(seg);
  }

  onSliceClick(seg: ChartSegment): void {
    if (this.clickable()) this.onSegmentClick(seg);
  }

  onSliceKey(event: Event, seg: ChartSegment): void {
    if (!this.clickable()) return;
    event.preventDefault();
    this.onSegmentClick(seg);
  }
}
