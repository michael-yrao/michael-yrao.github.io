import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { LineState } from '../../../core/models/algorithm.model';

/** Distance between neighbouring integers on the line, in SVG units. */
const UNIT = 32;
/** Room either side of the line's ends, so the end baskets are not clipped. */
const SIDE_PAD = 16;
/** Radius of a basket's hollow circle. */
const BASKET_RADIUS = 9;
/** Radius of a ball; smaller than a basket so the basket's rim shows around it. */
const BALL_RADIUS = 5;
/** Height of the number line within the view box. */
const LINE_Y = 70;
/** Length of an integer's tick below the line. */
const TICK_LENGTH = 6;
/** Line to the value labels' text baseline. */
const LABEL_OFFSET = 26;
/** Line to the bracket's horizontal bar. */
const BRACKET_RISE = 26;
/** Depth of a bracket's end hooks, down toward the baskets. */
const BRACKET_HOOK = 6;
/** Bracket bar to the gap number's text baseline. */
const GAP_LABEL_RISE = 6;
/** Room under the value labels. */
const BOTTOM_PAD = 6;

export interface DrawnBasket {
  readonly value: number;
  readonly x: number;
  readonly hasBall: boolean;
}

export interface DrawnTick {
  readonly value: number;
  readonly x: number;
}

export interface DrawnGap {
  readonly gap: number;
  readonly path: string;
  readonly labelX: number;
  readonly isSmallest: boolean;
}

/** Baskets at integer positions on a number line drawn to scale, a ball in each picked one; a
 *  bracket over each pair of neighbouring balls carries their gap, the smallest in the accent. */
@Component({
  selector: 'app-line-visualizer',
  templateUrl: './line-visualizer.component.html',
  styleUrls: ['./line-visualizer.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LineVisualizerComponent {
  readonly state = input.required<LineState>();

  readonly lineY = LINE_Y;
  readonly tickEnd = LINE_Y + TICK_LENGTH;
  readonly labelY = LINE_Y + LABEL_OFFSET;
  readonly gapLabelY = LINE_Y - BRACKET_RISE - GAP_LABEL_RISE;
  readonly basketRadius = BASKET_RADIUS;
  readonly ballRadius = BALL_RADIUS;

  private readonly min = computed(() => Math.min(...this.state().positions));
  private readonly max = computed(() => Math.max(...this.state().positions));

  private readonly xOf = (value: number): number => SIDE_PAD + (value - this.min()) * UNIT;

  readonly lineStart = SIDE_PAD;
  readonly lineEnd = computed(() => this.xOf(this.max()));

  readonly viewBox = computed(() => `0 0 ${this.lineEnd() + SIDE_PAD} ${this.labelY + BOTTOM_PAD}`);

  readonly ticks = computed<readonly DrawnTick[]>(() =>
    Array.from({ length: this.max() - this.min() + 1 }, (_, i) => {
      const value = this.min() + i;
      return { value, x: this.xOf(value) };
    }),
  );

  readonly baskets = computed<readonly DrawnBasket[]>(() => {
    const { positions, picks } = this.state();
    return positions.map((value) => ({ value, x: this.xOf(value), hasBall: picks.includes(value) }));
  });

  readonly gaps = computed<readonly DrawnGap[]>(() => {
    const sorted = [...this.state().picks].sort((a, b) => a - b);
    const widths = sorted.slice(1).map((pick, i) => pick - sorted[i]);
    const smallest = Math.min(...widths);
    const barY = LINE_Y - BRACKET_RISE;
    return widths.map((gap, i) => {
      const left = this.xOf(sorted[i]);
      const right = this.xOf(sorted[i + 1]);
      return {
        gap,
        path: `M${left} ${barY + BRACKET_HOOK}V${barY}H${right}V${barY + BRACKET_HOOK}`,
        labelX: (left + right) / 2,
        isSmallest: gap === smallest,
      };
    });
  });

  readonly ariaLabel = computed(() => {
    const picks = this.state().picks;
    if (picks.length === 0) return 'Baskets on a line';
    const smallest = Math.min(...this.gaps().map((g) => g.gap));
    return `Baskets on a line; balls at ${picks.join(', ')}; smallest gap ${smallest}`;
  });
}
