const SPLIT_KEY = 'po-practice-split';
const OUTPUT_SPLIT_KEY = 'po-practice-output-split';

export const DEFAULT_PROBLEM_SHARE = 0.5;
export const MIN_PROBLEM_SHARE = 0.25;
export const MAX_PROBLEM_SHARE = 0.75;
export const DEFAULT_OUTPUT_SHARE = 0.4;
export const MIN_OUTPUT_SHARE = 0.15;
export const MAX_OUTPUT_SHARE = 0.7;
export const KEYBOARD_STEP = 0.02;

const PERCENT = 100;
/** The split's fixed track weights, as the practice page's `--problem-track` / `--work-track` bindings. */
export const PROBLEM_TRACK = `${DEFAULT_PROBLEM_SHARE * PERCENT}fr`;
export const WORK_TRACK = `${(1 - DEFAULT_PROBLEM_SHARE) * PERCENT}fr`;

/** One divider's share range, its default, and the storage key its share is saved under. */
export interface ShareSpec {
  readonly key: string;
  readonly min: number;
  readonly max: number;
  readonly fallback: number;
}

/** The problem pane's share of the split's width. */
export const PROBLEM_SPEC: ShareSpec = {
  key: SPLIT_KEY,
  min: MIN_PROBLEM_SHARE,
  max: MAX_PROBLEM_SHARE,
  fallback: DEFAULT_PROBLEM_SHARE,
};

/** The Output pane's share of the work column's height. */
export const OUTPUT_SPEC: ShareSpec = {
  key: OUTPUT_SPLIT_KEY,
  min: MIN_OUTPUT_SHARE,
  max: MAX_OUTPUT_SHARE,
  fallback: DEFAULT_OUTPUT_SHARE,
};

/** The share held inside the spec's range. */
export function clampShare(share: number, spec: ShareSpec = PROBLEM_SPEC): number {
  return Math.min(spec.max, Math.max(spec.min, share));
}

/** The share for a pointer at `position`, measured from the pane's `start` over `size`; the spec's
 *  default when the pane has no size. For a share that grows from the far edge (Output, anchored at
 *  the bottom), pass the distance from that edge as `position` and 0 as `start`. */
export function shareFromPointer(position: number, start: number, size: number, spec: ShareSpec = PROBLEM_SPEC): number {
  if (size <= 0) return spec.fallback;
  return clampShare((position - start) / size, spec);
}

/** A stored share, or the spec's default when it is missing, not a number, or out of range. */
export function parseStoredShare(raw: string | null, spec: ShareSpec = PROBLEM_SPEC): number {
  if (raw === null) return spec.fallback;
  const parsed = Number(raw);
  const isInRange = parsed >= spec.min && parsed <= spec.max;
  return isInRange ? parsed : spec.fallback;
}

/** The viewer's saved share, or the default when none is saved or storage is unavailable. */
export function loadShare(spec: ShareSpec = PROBLEM_SPEC): number {
  try {
    return parseStoredShare(localStorage.getItem(spec.key), spec);
  } catch (err) {
    console.error(`Practice split: could not read ${spec.key}`, err);
    return spec.fallback;
  }
}

export function saveShare(share: number, spec: ShareSpec = PROBLEM_SPEC): void {
  try {
    localStorage.setItem(spec.key, String(share));
  } catch (err) {
    console.error(`Practice split: could not save ${spec.key}`, err);
  }
}
