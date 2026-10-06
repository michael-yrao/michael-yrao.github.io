/** How often the bar's clock reads the time. */
export const CLOCK_TICK_MS = 1_000;

const MS_PER_SECOND = 1_000;
const SECONDS_PER_MINUTE = 60;
const SECOND_DIGITS = 2;

/** Elapsed time as `mm:ss`; the minutes may pass 59 (`75:03`). A negative span reads as zero. */
export function formatElapsed(elapsedMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(elapsedMs / MS_PER_SECOND));
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE);
  const seconds = totalSeconds % SECONDS_PER_MINUTE;
  return `${String(minutes).padStart(SECOND_DIGITS, '0')}:${String(seconds).padStart(SECOND_DIGITS, '0')}`;
}
