import { Streak } from '../../core/models/progress.model';
import { addDaysISO, daysBetweenISO } from '../../core/utils/local-date';

// The day after `lastStudyDay` is still "today not over": only days strictly between the last
// study day and today count as missed. Mirrors the producer's `_TODAY_NOT_OVER_DAYS`.
const TODAY_NOT_OVER_DAYS = 1;

/** The dates strictly between `lastStudyDay` and `todayISO`, oldest first. */
function trailingMisses(lastStudyDay: string, todayISO: string): string[] {
  const count = Math.max(0, daysBetweenISO(lastStudyDay, todayISO) - TODAY_NOT_OVER_DAYS);
  return Array.from({ length: count }, (_, i) => addDaysISO(lastStudyDay, i + 1));
}

/** The streak as it stands on the viewer's `todayISO`: the generated summary only knows the
 *  day it was written, so the days missed since then are spent against the freeze bank here.
 *  Mirrors gamify.py compute_streak (live while trailing misses <= bank, else broken). Returns
 *  a new object; a legacy streak without `freezes` or `lastStudyDay` comes back unchanged. */
export function liveStreak(streak: Streak, todayISO: string): Streak {
  const { freezes: bank, lastStudyDay } = streak;
  if (bank === undefined || lastStudyDay === null) return streak;

  const trailing = trailingMisses(lastStudyDay, todayISO);
  // Generated frozenDays may already hold trailing dates up to the generation day; keep only
  // those bridging gaps before the last study day, then re-derive the trailing ones.
  const bridged = (streak.frozenDays ?? []).filter((day) => day <= lastStudyDay);
  const isLive = trailing.length <= bank;

  return {
    ...streak,
    current: isLive ? streak.current : 0,
    freezesLeft: isLive ? bank - trailing.length : 0,
    frozenDays: isLive ? [...bridged, ...trailing] : bridged,
  };
}
