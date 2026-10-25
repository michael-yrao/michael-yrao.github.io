import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { comfortStage } from '../../../core/models/comfort';

const DEFAULT_SIZE_PX = 12;
const VIEW_SIZE = 12;
const CENTRE = VIEW_SIZE / 2;
const DOT_RADIUS = 5;
const RING_STROKE_WIDTH = 1.5;
const RING_RADIUS = DOT_RADIUS - RING_STROKE_WIDTH / 2;
const RING_STROKE = 'var(--color-border)';
const SHAKY_DASH_COUNT = 6;
const SHAKY_DASH_PERIOD = (2 * Math.PI * RING_RADIUS) / SHAKY_DASH_COUNT;
const SHAKY_DASH_FRACTION = 0.6;
const SHAKY_DASH_ARRAY =
  `${(SHAKY_DASH_PERIOD * SHAKY_DASH_FRACTION).toFixed(2)} ${(SHAKY_DASH_PERIOD * (1 - SHAKY_DASH_FRACTION)).toFixed(2)}`;
const TARGET_DOT_RADIUS = 3;
const TARGET_RING_RADIUS = 5.25;
const TARGET_RING_STROKE_WIDTH = 1;
const STAR_POINTS = '6,0.8 7.5,4.2 11.2,4.5 8.4,6.9 9.3,10.5 6,8.6 2.7,10.5 3.6,6.9 0.8,4.5 4.5,4.2';

const HALF_DISC_PATH = 'M6 1 A5 5 0 0 0 6 11 Z';

/**
 * blank and s0 are solid rings (red, green), shaky a dashed orange ring; s1 half, s2 full; graduated
 * a green target (dot in a ring); retired a gold star; unknown a hollow grey ring.
 * The data stays the comfort emoji string plus a streak; this renders it.
 * `label` undefined = the stage's spoken text; `''` = decorative.
 */
@Component({
  selector: 'app-comfort-mark',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './comfort-mark.component.html',
  styleUrl: './comfort-mark.component.scss',
})
export class ComfortMarkComponent {
  readonly comfort = input.required<string | null>();
  readonly size = input(DEFAULT_SIZE_PX);
  readonly label = input<string | undefined>(undefined);
  /** Splits a green into its streak stages (s0, s1, s2); absent keeps the plain clean dot. */
  readonly streak = input<number | null | undefined>(undefined);

  protected readonly viewBox = `0 0 ${VIEW_SIZE} ${VIEW_SIZE}`;
  protected readonly centre = CENTRE;
  protected readonly dotRadius = DOT_RADIUS;
  protected readonly ringRadius = RING_RADIUS;
  protected readonly ringStroke = RING_STROKE;
  protected readonly ringStrokeWidth = RING_STROKE_WIDTH;
  protected readonly shakyDashArray = SHAKY_DASH_ARRAY;
  protected readonly targetDotRadius = TARGET_DOT_RADIUS;
  protected readonly targetRingRadius = TARGET_RING_RADIUS;
  protected readonly targetRingStrokeWidth = TARGET_RING_STROKE_WIDTH;
  protected readonly starPoints = STAR_POINTS;
  protected readonly halfDiscPath = HALF_DISC_PATH;
  protected readonly stage = computed(() => comfortStage(this.comfort(), this.streak()));
  protected readonly resolvedLabel = computed(() => this.label() ?? this.stage().spoken);
  protected readonly isDecorative = computed(() => this.resolvedLabel() === '');
}
