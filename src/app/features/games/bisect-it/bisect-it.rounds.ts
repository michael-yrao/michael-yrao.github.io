// Pure data + solver logic for the Bisect It game. No Angular imports here so every
// instance generator, predicate, and reference trace is unit-testable in isolation.

export type Flavour = 'koko' | 'ship' | 'magnet';
export type Direction = 'minimise' | 'maximise';

export interface TraceStep {
  readonly l: number;
  readonly r: number;
  readonly mid: number;
  readonly feasible: boolean;
}

export interface BisectInstance {
  readonly flavour: Flavour;
  readonly question: string;
  readonly itemLabel: string;
  readonly items: readonly number[];
  readonly paramLabel: string;
  readonly paramValue: number;
  readonly lo: number;
  readonly hi: number;
  readonly direction: Direction;
  readonly answer: number;
  readonly trace: readonly TraceStep[];
  readonly predicate: (x: number) => boolean;
}

export interface Range {
  readonly lo: number;
  readonly hi: number;
}

interface SolveResult {
  readonly trace: readonly TraceStep[];
  readonly answer: number;
}

// ── Reference binary-search solvers ──────────────────────────────────────────────

/** Min-boundary form: while l < r, mid = floor((l+r)/2); feasible -> r = mid, else l = mid+1. */
function solveMinimise(lo: number, hi: number, predicate: (x: number) => boolean): SolveResult {
  const trace: TraceStep[] = [];
  let l = lo;
  let r = hi;
  while (l < r) {
    const mid = Math.floor((l + r) / 2);
    const feasible = predicate(mid);
    trace.push({ l, r, mid, feasible });
    if (feasible) {
      r = mid;
    } else {
      l = mid + 1;
    }
  }
  return { trace, answer: l };
}

/** Max-boundary form (mirrored): mid = ceil((l+r)/2); feasible -> l = mid, else r = mid-1. */
function solveMaximise(lo: number, hi: number, predicate: (x: number) => boolean): SolveResult {
  const trace: TraceStep[] = [];
  let l = lo;
  let r = hi;
  while (l < r) {
    const mid = Math.ceil((l + r) / 2);
    const feasible = predicate(mid);
    trace.push({ l, r, mid, feasible });
    if (feasible) {
      l = mid;
    } else {
      r = mid - 1;
    }
  }
  return { trace, answer: l };
}

/** Par: the number of probes an optimal binary search needs on this range. */
export function parFor(lo: number, hi: number): number {
  return Math.ceil(Math.log2(hi - lo + 1));
}

/**
 * Narrows the alive range after a probe. Minimise: feasible keeps [lo, x], infeasible
 * keeps [x+1, hi]. Maximise: feasible keeps [x, hi], infeasible keeps [lo, x-1]. Always
 * narrows (or holds steady at an edge probe) — never widens the range.
 */
export function applyProbe(range: Range, x: number, feasible: boolean, direction: Direction): Range {
  if (direction === 'minimise') {
    return feasible ? { lo: range.lo, hi: x } : { lo: x + 1, hi: range.hi };
  }
  return feasible ? { lo: x, hi: range.hi } : { lo: range.lo, hi: x - 1 };
}

// ── Koko Eating Bananas (LC 875) ─────────────────────────────────────────────────

const KOKO_LO = 1;
const KOKO_MIN_PILES = 4;
const KOKO_MAX_PILES = 6;
const KOKO_MIN_PILE_VALUE = 3;
const KOKO_MAX_PILE_VALUE = 40;

function kokoFeasible(piles: readonly number[], h: number, k: number): boolean {
  const hoursNeeded = piles.reduce((sum, pile) => sum + Math.ceil(pile / k), 0);
  return hoursNeeded <= h;
}

export function kokoInstance(piles: readonly number[], h: number): BisectInstance {
  const hi = Math.max(...piles);
  const predicate = (k: number) => kokoFeasible(piles, h, k);
  const { trace, answer } = solveMinimise(KOKO_LO, hi, predicate);
  return {
    flavour: 'koko',
    question: `What is the MINIMUM eating speed k so Koko finishes every pile within ${h} hours?`,
    itemLabel: 'Pile sizes',
    items: piles,
    paramLabel: 'Hours available (h)',
    paramValue: h,
    lo: KOKO_LO,
    hi,
    direction: 'minimise',
    answer,
    trace,
    predicate,
  };
}

function randomKokoPiles(): number[] {
  const count = randomInt(KOKO_MIN_PILES, KOKO_MAX_PILES);
  return Array.from({ length: count }, () => randomInt(KOKO_MIN_PILE_VALUE, KOKO_MAX_PILE_VALUE));
}

export function generateKokoInstance(): BisectInstance {
  const piles = randomKokoPiles();
  const h = randomInt(piles.length, piles.length * 2);
  return kokoInstance(piles, h);
}

// ── Capacity to Ship Packages (LC 1011) ──────────────────────────────────────────

const SHIP_MIN_ITEMS = 5;
const SHIP_MAX_ITEMS = 7;
const SHIP_MIN_WEIGHT = 1;
const SHIP_MAX_WEIGHT = 20;
const SHIP_MIN_DAYS = 2;

function shipDaysNeeded(weights: readonly number[], capacity: number): number {
  let days = 1;
  let load = 0;
  for (const weight of weights) {
    if (load + weight > capacity) {
      days += 1;
      load = 0;
    }
    load += weight;
  }
  return days;
}

function shipFeasible(weights: readonly number[], days: number, capacity: number): boolean {
  return shipDaysNeeded(weights, capacity) <= days;
}

export function shipInstance(weights: readonly number[], days: number): BisectInstance {
  const lo = Math.max(...weights);
  const hi = weights.reduce((sum, weight) => sum + weight, 0);
  const predicate = (capacity: number) => shipFeasible(weights, days, capacity);
  const { trace, answer } = solveMinimise(lo, hi, predicate);
  return {
    flavour: 'ship',
    question: `What is the MINIMUM ship capacity to ship everything within ${days} days?`,
    itemLabel: 'Package weights',
    items: weights,
    paramLabel: 'Days allowed (D)',
    paramValue: days,
    lo,
    hi,
    direction: 'minimise',
    answer,
    trace,
    predicate,
  };
}

function randomShipWeights(): number[] {
  const count = randomInt(SHIP_MIN_ITEMS, SHIP_MAX_ITEMS);
  return Array.from({ length: count }, () => randomInt(SHIP_MIN_WEIGHT, SHIP_MAX_WEIGHT));
}

export function generateShipInstance(): BisectInstance {
  const weights = randomShipWeights();
  const days = randomInt(SHIP_MIN_DAYS, weights.length);
  return shipInstance(weights, days);
}

// ── Magnetic Force Between Two Balls (LC 1552) ───────────────────────────────────

const MAGNET_LO = 1;
const MAGNET_MIN_POSITIONS = 5;
const MAGNET_MAX_POSITIONS = 7;
const MAGNET_MIN_VALUE = 0;
const MAGNET_MAX_VALUE = 40;
const MAGNET_MIN_BALLS = 2;
const MAGNET_MAX_BALLS = 3;

function magnetBallsPlaced(positions: readonly number[], minDist: number): number {
  let count = 1;
  let lastPlaced = positions[0];
  for (let i = 1; i < positions.length; i++) {
    if (positions[i] - lastPlaced >= minDist) {
      count += 1;
      lastPlaced = positions[i];
    }
  }
  return count;
}

function magnetFeasible(positions: readonly number[], m: number, minDist: number): boolean {
  return magnetBallsPlaced(positions, minDist) >= m;
}

export function magnetInstance(positions: readonly number[], m: number): BisectInstance {
  const hi = Math.max(...positions) - Math.min(...positions);
  const predicate = (dist: number) => magnetFeasible(positions, m, dist);
  const { trace, answer } = solveMaximise(MAGNET_LO, hi, predicate);
  return {
    flavour: 'magnet',
    question: 'What is the MAXIMUM possible minimum distance between any two balls?',
    itemLabel: 'Basket positions',
    items: positions,
    paramLabel: 'Balls to place (m)',
    paramValue: m,
    lo: MAGNET_LO,
    hi,
    direction: 'maximise',
    answer,
    trace,
    predicate,
  };
}

function randomMagnetPositions(): number[] {
  const count = randomInt(MAGNET_MIN_POSITIONS, MAGNET_MAX_POSITIONS);
  const chosen = new Set<number>();
  while (chosen.size < count) {
    chosen.add(randomInt(MAGNET_MIN_VALUE, MAGNET_MAX_VALUE));
  }
  return [...chosen].sort((a, b) => a - b);
}

export function generateMagnetInstance(): BisectInstance {
  const positions = randomMagnetPositions();
  const m = randomInt(MAGNET_MIN_BALLS, MAGNET_MAX_BALLS);
  return magnetInstance(positions, m);
}

// ── Round deck ────────────────────────────────────────────────────────────────

const INSTANCES_PER_FLAVOUR = 2;
const FLAVOUR_GENERATORS = [generateKokoInstance, generateShipInstance, generateMagnetInstance];

export function buildRoundDeck(): BisectInstance[] {
  const rounds = FLAVOUR_GENERATORS.flatMap((generate) =>
    Array.from({ length: INSTANCES_PER_FLAVOUR }, () => generate()),
  );
  return shuffle(rounds);
}

// ── Shared helpers ────────────────────────────────────────────────────────────

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(arr: readonly T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
