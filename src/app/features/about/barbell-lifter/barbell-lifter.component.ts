import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { addPlate, INITIAL_LIFTER_STATE, MAX_PLATES_PER_SIDE } from './lifter-state';

const BAR_Y_PX = 40;
const BAR_LEFT_X_PX = 18;
const BAR_RIGHT_X_PX = 142;
const BAR_CENTRE_X_PX = (BAR_LEFT_X_PX + BAR_RIGHT_X_PX) / 2;
const BAR_SAG_PER_PLATE_PX = 2;
const BAR_PRESS_PER_PLATE_PX = 2.5;
const SQUAT_PER_PLATE_PX = 3;
const PLATE_WIDTH_PX = 6;
const PLATE_STEP_PX = 8;
const PLATE_HEIGHTS_PX: readonly number[] = [28, 24, 20, 16];
const LEFT_PLATE_INNER_X_PX = 50;
const RIGHT_PLATE_INNER_X_PX = 110;
const SWEAT_FROM_PLATE_COUNT = 3;

const CENTRE_X_PX = 80;
const HIP_Y_PX = 108;
const SHOULDER_Y_PX = 85;
const LEFT_SHOULDER_X_PX = 68;
const RIGHT_SHOULDER_X_PX = 92;
const LEFT_HAND_X_PX = 56;
const RIGHT_HAND_X_PX = 104;
const ELBOW_OUT_BASE_PX = 7;
const ELBOW_OUT_PER_PLATE_PX = 2;
const ELBOW_DROP_PX = 4;

const FOOT_Y_PX = 144;
const LEFT_FOOT_X_PX = 60;
const RIGHT_FOOT_X_PX = 100;
const TOE_LENGTH_PX = 8;
const KNEE_OUT_BASE_PX = 6;
const KNEE_OUT_PER_PLATE_PX = 2.5;

type Side = 'left' | 'right';
type Point = readonly [number, number];

interface PlateMark {
  readonly key: string;
  readonly index: number;
  readonly x: number;
  readonly y: number;
  readonly height: number;
}

function sagFor(plateCount: number): number {
  return plateCount * BAR_SAG_PER_PLATE_PX;
}

function barBaseY(plateCount: number): number {
  return BAR_Y_PX + plateCount * BAR_PRESS_PER_PLATE_PX;
}

/** Bar height at x: ends droop by `sag`, the control point rises by `sag`, so the middle stays put. */
function barYAt(x: number, plateCount: number): number {
  const t = (x - BAR_LEFT_X_PX) / (BAR_RIGHT_X_PX - BAR_LEFT_X_PX);
  return barBaseY(plateCount) + sagFor(plateCount) * (1 - 2 * t) ** 2;
}

function plateX(side: Side, index: number): number {
  return side === 'left'
    ? LEFT_PLATE_INNER_X_PX - PLATE_WIDTH_PX - index * PLATE_STEP_PX
    : RIGHT_PLATE_INNER_X_PX + index * PLATE_STEP_PX;
}

function buildPlates(plateCount: number): readonly PlateMark[] {
  const sides: readonly Side[] = ['left', 'right'];
  return sides.flatMap((side) =>
    Array.from({ length: plateCount }, (_, index) => {
      const x = plateX(side, index);
      const height = PLATE_HEIGHTS_PX[index];
      return {
        key: `${side}-${index}`,
        index,
        x,
        y: barYAt(x + PLATE_WIDTH_PX / 2, plateCount) - height / 2,
        height,
      };
    }),
  );
}

function toPoints(points: readonly Point[]): string {
  return points.map(([x, y]) => `${x},${y}`).join(' ');
}

/** Shoulder, elbow pushed outward, hand on the bar. `direction` is -1 for left, 1 for right. */
function armPoints(shoulderX: number, handX: number, direction: number, plateCount: number): string {
  const barY = barBaseY(plateCount);
  const elbowOut = ELBOW_OUT_BASE_PX + plateCount * ELBOW_OUT_PER_PLATE_PX;
  const elbowX = (shoulderX + handX) / 2 + direction * elbowOut;
  const elbowY = (SHOULDER_Y_PX + barY) / 2 + ELBOW_DROP_PX;
  return toPoints([
    [shoulderX, SHOULDER_Y_PX],
    [elbowX, elbowY],
    [handX, barY],
  ]);
}

/** Hip, knee pushed outward, planted foot, toe pointing outward. */
function legPoints(footX: number, direction: number, plateCount: number): string {
  const hipY = HIP_Y_PX + plateCount * SQUAT_PER_PLATE_PX;
  const kneeOut = KNEE_OUT_BASE_PX + plateCount * KNEE_OUT_PER_PLATE_PX;
  const kneeX = (CENTRE_X_PX + footX) / 2 + direction * kneeOut;
  const kneeY = (hipY + FOOT_Y_PX) / 2;
  return toPoints([
    [CENTRE_X_PX, hipY],
    [kneeX, kneeY],
    [footX, FOOT_Y_PX],
    [footX + direction * TOE_LENGTH_PX, FOOT_Y_PX],
  ]);
}

function barPathFor(plateCount: number): string {
  const sag = sagFor(plateCount);
  const barY = barBaseY(plateCount);
  const endY = barY + sag;
  const controlY = barY - sag;
  return `M${BAR_LEFT_X_PX} ${endY} Q${BAR_CENTRE_X_PX} ${controlY} ${BAR_RIGHT_X_PX} ${endY}`;
}

/**
 * A stick lifter pressing a barbell from the ground. Each click adds a plate per
 * side: the bar bends and drops toward the head, the knees and elbows bow out.
 * One click past the max, the plates spill off and the bar resets. Drawn as
 * inline SVG from the site's theme tokens.
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
  readonly spillPlates = buildPlates(MAX_PLATES_PER_SIDE);
  readonly spillTransform = `translateY(${MAX_PLATES_PER_SIDE * SQUAT_PER_PLATE_PX}px)`;

  private readonly plateCount = computed(() => this.state().plateCount);

  readonly barPath = computed(() => barPathFor(this.plateCount()));
  readonly plates = computed(() => buildPlates(this.plateCount()));
  readonly leftArm = computed(() =>
    armPoints(LEFT_SHOULDER_X_PX, LEFT_HAND_X_PX, -1, this.plateCount()),
  );
  readonly rightArm = computed(() =>
    armPoints(RIGHT_SHOULDER_X_PX, RIGHT_HAND_X_PX, 1, this.plateCount()),
  );
  readonly leftLeg = computed(() => legPoints(LEFT_FOOT_X_PX, -1, this.plateCount()));
  readonly rightLeg = computed(() => legPoints(RIGHT_FOOT_X_PX, 1, this.plateCount()));
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
