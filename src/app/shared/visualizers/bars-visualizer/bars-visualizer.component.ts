import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { BarsState } from '../../../core/models/algorithm.model';

/** Width of one unit-width bar, in SVG units. */
const BAR_WIDTH = 28;
/** Height the tallest bar is drawn at; the rest scale to it. */
const PLOT_HEIGHT = 140;
/** Room above the tallest bar for its value, and below the baseline for the index. */
const LABEL_BAND = 18;
/** Keeps a bar's value clear of its top edge. */
const LABEL_GAP = 5;
/** Baseline to the index labels' text baseline. */
const INDEX_OFFSET = 14;
/** Coordinates are rounded to 1/COORD_PRECISION so equal inputs give equal, tidy numbers. */
const COORD_PRECISION = 100;

const round = (value: number): number => Math.round(value * COORD_PRECISION) / COORD_PRECISION;

export interface DrawnBar {
  readonly index: number;
  readonly value: number;
  readonly x: number;
  readonly y: number;
  readonly height: number;
  readonly labelX: number;
  readonly labelY: number;
}

export interface DrawnRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** A histogram: one unit-width bar per height on a shared baseline, its value above it and its
 *  index below; `rect` is shaded over the bars it covers. */
@Component({
  selector: 'app-bars-visualizer',
  templateUrl: './bars-visualizer.component.html',
  styleUrls: ['./bars-visualizer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarsVisualizerComponent {
  readonly state = input.required<BarsState>();

  readonly barWidth = BAR_WIDTH;
  readonly baseline = LABEL_BAND + PLOT_HEIGHT;
  readonly indexY = this.baseline + INDEX_OFFSET;

  /** SVG units per unit of height; a histogram of zeros keeps a nonzero scale. */
  private readonly unit = computed(() => PLOT_HEIGHT / Math.max(1, ...this.state().bars));

  readonly width = computed(() => this.state().bars.length * BAR_WIDTH);

  readonly viewBox = computed(() => `0 0 ${this.width()} ${this.indexY + LABEL_GAP}`);

  readonly drawnBars = computed<readonly DrawnBar[]>(() =>
    this.state().bars.map((value, index) => {
      const height = round(value * this.unit());
      const x = index * BAR_WIDTH;
      return {
        index,
        value,
        x,
        y: round(this.baseline - height),
        height,
        labelX: x + BAR_WIDTH / 2,
        labelY: round(this.baseline - height - LABEL_GAP),
      };
    }),
  );

  readonly drawnRect = computed<DrawnRect | null>(() => {
    const rect = this.state().rect;
    if (!rect) return null;
    const height = round(rect.height * this.unit());
    return {
      x: rect.left * BAR_WIDTH,
      y: round(this.baseline - height),
      width: (rect.right - rect.left + 1) * BAR_WIDTH,
      height,
    };
  });
}
