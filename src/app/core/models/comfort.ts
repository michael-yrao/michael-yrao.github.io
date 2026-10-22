import { Comfort } from './progress.model';

export type ComfortKey = 'blank' | 'shaky' | 'clean' | 'graduated' | 'retired' | 'unknown';

export type ComfortStageKey =
  | 'blank'
  | 'shaky'
  | 's0'
  | 's1'
  | 's2'
  | 'clean'
  | 'graduated'
  | 'retired'
  | 'unknown';

export interface ComfortStage {
  readonly key: ComfortStageKey;
  readonly ordinal: number;
  readonly spoken: string;
}

/** The clean tier's emoji, so templates can bind the clean mark without an emoji literal. */
export const CLEAN_COMFORT: Comfort = '🟢';

/** Comfort tiers, weakest to strongest — the same progression the Mastery pipeline bar
 *  (segmented-bar.component.scss's .seg-* vocabulary) already encodes. */
export const COMFORT_ORDER: readonly Comfort[] = ['🔴', '🟡', CLEAN_COMFORT, '🎓', '🏆'];

const TIER_KEYS: Readonly<Record<string, ComfortKey>> = {
  '🔴': 'blank',
  '🟡': 'shaky',
  '🟢': 'clean',
  '🎓': 'graduated',
  '🏆': 'retired',
};

const STREAK_S1 = 1;
const STREAK_S2 = 2;

const ORDINAL_UNKNOWN = 0;
const ORDINAL_BLANK = 1;
const ORDINAL_SHAKY = 2;
const ORDINAL_S0 = 3;
const ORDINAL_S1 = 4;
const ORDINAL_CLEAN = 5;
const ORDINAL_GRADUATED = 6;
const ORDINAL_RETIRED = 7;

function stage(key: ComfortStageKey, ordinal: number, spoken: string): ComfortStage {
  return { key, ordinal, spoken };
}

const STAGES: Readonly<Record<string, ComfortStage>> = {
  blank: stage('blank', ORDINAL_BLANK, 'Comfort: blank'),
  shaky: stage('shaky', ORDINAL_SHAKY, 'Comfort: shaky'),
  s0: stage('s0', ORDINAL_S0, 'Comfort: clean, streak 0'),
  s1: stage('s1', ORDINAL_S1, 'Comfort: clean, streak 1'),
  s2: stage('s2', ORDINAL_CLEAN, 'Comfort: clean, streak 2 or more'),
  clean: stage('clean', ORDINAL_CLEAN, 'Comfort: clean'),
  graduated: stage('graduated', ORDINAL_GRADUATED, 'Comfort: graduated'),
  retired: stage('retired', ORDINAL_RETIRED, 'Comfort: retired'),
  unknown: stage('unknown', ORDINAL_UNKNOWN, 'Comfort: unknown'),
};

function cleanStageKey(streak: number | null | undefined): ComfortStageKey {
  if (streak === null || streak === undefined) return 'clean';
  if (streak >= STREAK_S2) return 's2';
  return streak >= STREAK_S1 ? 's1' : 's0';
}

/** The seven-stage mark for a comfort emoji; a green is split by `streak` when it is known. */
export function comfortStage(
  comfort: string | null | undefined,
  streak?: number | null,
): ComfortStage {
  const tier = (comfort && TIER_KEYS[comfort]) || 'unknown';
  return STAGES[tier === 'clean' ? cleanStageKey(streak) : tier];
}

/** The streak a start- or end-note code implies (`s0`/`prov` 0, `s1` 1, `s2` 2), or null for any other code. */
export function streakFromNote(note: string | null | undefined): number | null {
  if (note === 's0' || note === 'prov') return 0;
  if (note === 's1') return STREAK_S1;
  return note === 's2' ? STREAK_S2 : null;
}

/** The tier name for a comfort emoji (`unknown` for anything else), for spoken text. */
export function comfortName(comfort: string | null | undefined): ComfortKey {
  return (comfort && TIER_KEYS[comfort]) || 'unknown';
}
