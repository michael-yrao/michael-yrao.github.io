const SPLIT_KEY = 'po-practice-split';

export const DEFAULT_PROBLEM_SHARE = 0.5;
export const MIN_PROBLEM_SHARE = 0.25;
export const MAX_PROBLEM_SHARE = 0.75;
export const KEYBOARD_STEP = 0.02;

const PERCENT = 100;
/** The split's fixed track weights, as the practice page's `--problem-track` / `--work-track` bindings. */
export const PROBLEM_TRACK = `${DEFAULT_PROBLEM_SHARE * PERCENT}fr`;
export const WORK_TRACK = `${(1 - DEFAULT_PROBLEM_SHARE) * PERCENT}fr`;

/** The share held inside the allowed range. */
export function clampShare(share: number): number {
  return Math.min(MAX_PROBLEM_SHARE, Math.max(MIN_PROBLEM_SHARE, share));
}

/** The left pane's share for a pointer at `pointerX` over a split starting at `splitLeft`,
 *  `splitWidth` wide; the default when the split has no width. */
export function shareFromPointer(pointerX: number, splitLeft: number, splitWidth: number): number {
  if (splitWidth <= 0) return DEFAULT_PROBLEM_SHARE;
  return clampShare((pointerX - splitLeft) / splitWidth);
}

/** A stored share, or the default when it is missing, not a number, or out of range. */
export function parseStoredShare(raw: string | null): number {
  if (raw === null) return DEFAULT_PROBLEM_SHARE;
  const parsed = Number(raw);
  const isInRange = parsed >= MIN_PROBLEM_SHARE && parsed <= MAX_PROBLEM_SHARE;
  return isInRange ? parsed : DEFAULT_PROBLEM_SHARE;
}

/** The viewer's saved share, or the default when none is saved or storage is unavailable. */
export function loadShare(): number {
  try {
    return parseStoredShare(localStorage.getItem(SPLIT_KEY));
  } catch (err) {
    console.error(`Practice split: could not read ${SPLIT_KEY}`, err);
    return DEFAULT_PROBLEM_SHARE;
  }
}

export function saveShare(share: number): void {
  try {
    localStorage.setItem(SPLIT_KEY, String(share));
  } catch (err) {
    console.error(`Practice split: could not save ${SPLIT_KEY}`, err);
  }
}
