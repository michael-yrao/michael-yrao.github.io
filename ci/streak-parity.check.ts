import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

import { liveStreak } from '../src/app/features/progress/live-streak';
import { countOnSchedule } from '../src/app/features/progress/progress-page/progress-derivations';
import { OnSchedule, ProblemProgress, Streak } from '../src/app/core/models/progress.model';

const PARITY_JSON_ENV_VAR = 'STREAK_PARITY_JSON';
const SUPPORTED_SCHEMA_VERSION = 1;

interface StreakCase {
  name: string;
  t2: string;
  atT1: Streak;
  atT2: Streak;
}

interface OnScheduleCase {
  name: string;
  today: string;
  rows: { due: string | null }[];
  expected: OnSchedule;
}

interface ParityFixture {
  schemaVersion: number;
  streak: StreakCase[];
  onSchedule: OnScheduleCase[];
}

/** Reads and validates the fixture the env var points at, or throws a message naming what's wrong. */
function loadFixture(path: string | undefined): ParityFixture {
  if (!path) {
    throw new Error(
      `${PARITY_JSON_ENV_VAR} is not set — point it at streak-parity.json (fetched by scripts/fetch-content.mjs).`,
    );
  }
  let fixture: ParityFixture;
  try {
    fixture = JSON.parse(readFileSync(path, 'utf-8')) as ParityFixture;
  } catch (err) {
    throw new Error(`Could not read ${PARITY_JSON_ENV_VAR} at "${path}": ${(err as Error).message}`);
  }
  if (fixture.schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
    throw new Error(
      `streak-parity.json schemaVersion ${fixture.schemaVersion} is not ${SUPPORTED_SCHEMA_VERSION}.`,
    );
  }
  return fixture;
}

/** The minimal row `countOnSchedule` reads: only `nextReview` matters. */
function rowWithDue(due: string | null): ProblemProgress {
  return { nextReview: due } as unknown as ProblemProgress;
}

function streakFields(s: Streak) {
  return {
    current: s.current,
    longest: s.longest,
    freezesLeft: s.freezesLeft,
    frozenDays: s.frozenDays,
  };
}

const fixture = loadFixture(process.env[PARITY_JSON_ENV_VAR]);

describe('liveStreak matches gamify.py compute_streak', () => {
  it.each(fixture.streak.map((c) => [c.name, c] as const))('%s', (_name, c) => {
    expect(streakFields(liveStreak(c.atT1, c.t2))).toEqual(streakFields(c.atT2));
  });
});

describe('countOnSchedule matches gamify.py on_schedule', () => {
  it.each(fixture.onSchedule.map((c) => [c.name, c] as const))('%s', (_name, c) => {
    const result = countOnSchedule(c.rows.map((r) => rowWithDue(r.due)), c.today);
    expect(result).toEqual(c.expected);
  });
});
