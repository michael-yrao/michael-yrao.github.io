import { ChartSegment } from './pie-chart.component';

const FULL_TURN_DEGREES = 360;
const HALF_TURN_DEGREES = 180;

export interface PieSlice {
  segment: ChartSegment;
  /** SVG path centred on (0, 0); '' when `isFull` (draw a circle instead). */
  d: string;
  /** Degrees clockwise from 12 o'clock. */
  startAngle: number;
  endAngle: number;
  largeArc: boolean;
  /** A lone non-zero segment: a 360-degree arc cannot be one path, so the template draws a circle. */
  isFull: boolean;
}

function pointAt(radius: number, degrees: number): { x: number; y: number } {
  const radians = (degrees * Math.PI) / HALF_TURN_DEGREES;
  return { x: radius * Math.sin(radians), y: -radius * Math.cos(radians) };
}

function wedgePath(radius: number, startAngle: number, endAngle: number, largeArc: boolean): string {
  const start = pointAt(radius, startAngle);
  const end = pointAt(radius, endAngle);
  return `M0,0 L${start.x},${start.y} A${radius},${radius} 0 ${largeArc ? 1 : 0} 1 ${end.x},${end.y} Z`;
}

/** One slice per non-zero segment, clockwise from 12 o'clock in the order given. `[]` when no
 *  segment has a value. */
export function pieSlices(segments: readonly ChartSegment[], radius: number): PieSlice[] {
  const visible = segments.filter((s) => s.value > 0);
  const total = visible.reduce((sum, s) => sum + s.value, 0);
  if (!total) return [];

  const isFull = visible.length === 1;
  let cursor = 0;
  return visible.map((segment) => {
    const sweep = (segment.value / total) * FULL_TURN_DEGREES;
    const startAngle = cursor;
    const endAngle = cursor + sweep;
    cursor = endAngle;
    const largeArc = sweep > HALF_TURN_DEGREES;
    return {
      segment,
      d: isFull ? '' : wedgePath(radius, startAngle, endAngle, largeArc),
      startAngle,
      endAngle,
      largeArc,
      isFull,
    };
  });
}
