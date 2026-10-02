import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { addPlate, INITIAL_LIFTER_STATE, MAX_PLATES_PER_SIDE } from './lifter-state';

const BAR_Y_PX = 44;
const BAR_LEFT_X_PX = 16;
const BAR_RIGHT_X_PX = 144;
const BAR_SAG_PER_PLATE_PX = 2;
const SQUAT_PER_PLATE_PX = 3;
const PLATE_WIDTH_PX = 6;
const PLATE_GAP_PX = 2;
const PLATE_HEIGHT_PX = 24;
const PLATE_STEP_PX = PLATE_WIDTH_PX + PLATE_GAP_PX;
const LEFT_HAND_X_PX = 60;
const RIGHT_HAND_X_PX = 100;
const LEFT_PLATE_INNER_X_PX = 52;
const RIGHT_PLATE_INNER_X_PX = 108;
const SWEAT_FROM_PLATE_COUNT = 3;

type Side = 'left' | 'right';

interface PlateMark {
  readonly key: string;
  readonly index: number;
  readonly x: number;
  readonly y: number;
}

/** Bar height at x: ends droop by `sag`, the control point rises by `sag`, so the middle stays put. */
function barYAt(x: number, sag: number): number {
  const t = (x - BAR_LEFT_X_PX) / (BAR_RIGHT_X_PX - BAR_LEFT_X_PX);
  return BAR_Y_PX + sag * (1 - 2 * t) ** 2;
}

function plateX(side: Side, index: number): number {
  return side === 'left'
    ? LEFT_PLATE_INNER_X_PX - PLATE_WIDTH_PX - index * PLATE_STEP_PX
    : RIGHT_PLATE_INNER_X_PX + index * PLATE_STEP_PX;
}

function buildPlates(plateCount: number, sag: number): readonly PlateMark[] {
  const sides: readonly Side[] = ['left', 'right'];
  return sides.flatMap((side) =>
    Array.from({ length: plateCount }, (_, index) => {
      const x = plateX(side, index);
      const centreX = x + PLATE_WIDTH_PX / 2;
      return {
        key: `${side}-${index}`,
        index,
        x,
        y: barYAt(centreX, sag) - PLATE_HEIGHT_PX / 2,
      };
    }),
  );
}

/**
 * A stick lifter pressing a barbell overhead. Each click adds a plate per side:
 * the bar bends and the lifter sinks. One click past the max, the plates spill
 * off and the bar resets. Drawn as inline SVG from the site's theme tokens.
 */
@Component({
  selector: 'app-barbell-lifter',
  templateUrl: './barbell-lifter.component.html',
  styleUrls: ['./barbell-lifter.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BarbellLifterComponent {
  readonly state = signal(INITIAL_LIFTER_STATE);

  readonly plateWidth = PLATE_WIDTH_PX;
  readonly plateHeight = PLATE_HEIGHT_PX;
  readonly barY = BAR_Y_PX;
  readonly leftHandX = LEFT_HAND_X_PX;
  readonly rightHandX = RIGHT_HAND_X_PX;
  readonly spillPlates = buildPlates(
    MAX_PLATES_PER_SIDE,
    MAX_PLATES_PER_SIDE * BAR_SAG_PER_PLATE_PX,
  );
  readonly spillTransform = `translateY(${MAX_PLATES_PER_SIDE * SQUAT_PER_PLATE_PX}px)`;

  private readonly plateCount = computed(() => this.state().plateCount);
  private readonly sag = computed(() => this.plateCount() * BAR_SAG_PER_PLATE_PX);

  readonly barPath = computed(() => {
    const sag = this.sag();
    const endY = BAR_Y_PX + sag;
    const controlY = BAR_Y_PX - sag;
    const controlX = (BAR_LEFT_X_PX + BAR_RIGHT_X_PX) / 2;
    return `M${BAR_LEFT_X_PX} ${endY} Q${controlX} ${controlY} ${BAR_RIGHT_X_PX} ${endY}`;
  });

  readonly plates = computed(() => buildPlates(this.plateCount(), this.sag()));
  readonly squatOffset = computed(() => this.plateCount() * SQUAT_PER_PLATE_PX);
  readonly squatTransform = computed(() => `translateY(${this.squatOffset()}px)`);
  readonly isStraining = computed(() => this.plateCount() >= SWEAT_FROM_PLATE_COUNT);

  onLift(): void {
    this.state.update(addPlate);
  }

  onSpillEnd(): void {
    this.state.update((current) => ({ ...current, isSpilling: false }));
  }
}
