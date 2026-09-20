// The client-side mirror of the cse-coach progress contract (progress.schema.json,
// emitted by cse-progress/scripts/gamify.py). Kept in lockstep with that schema:
// SCHEMA_VERSION guards against rendering an incompatible file.

export const PROGRESS_SCHEMA_VERSION = 1;

export type Comfort = '🔴' | '🟡' | '🟢' | '🎓' | '🏆';

export interface TimelinePoint {
  date: string;
  comfort: Comfort | null; // null where a rep predates the schedule archive (activity dot)
  level: number | null; // comfort as an ordinal 0-4, for plotting
}

export interface ProblemProgress {
  lcNumber: number;
  title: string;
  url?: string | null;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  category?: string | null;
  comfort: Comfort;
  level: number | null;
  streak: number;
  nextReview?: string;
  repDates: string[];
  timeline: TimelinePoint[];
}

export interface RetiredProblem {
  lcNumber: number;
  title: string;
  retiredOn?: string;
}

export interface Pipeline {
  blank: number;
  shaky: number;
  clean: { s0: number; s1: number; s2plus: number; total: number };
  graduated: number;
  retired: number;
}

export interface Streak {
  current: number;
  longest: number;
  lastStudyDay: string | null;
  studyDays: number;
  restDayAllowance: number;
}

export interface Coverage {
  total: number;
  started: number;
  noGreen: number;
  thin: number;
  variantGaps: number;
}

export interface OnSchedule {
  totalActive: number;
  dueToday: number;
  overdue: number;
}

export interface Badge {
  id: string;
  title: string;
  icon?: string;
  description?: string;
  earned: boolean;
}

export interface ProgressData {
  schemaVersion: number;
  generatedAt: string;
  totals: { problems: number; solutions: number; reps: number };
  pipeline: Pipeline;
  difficulty?: { Easy: number; Medium: number; Hard: number };
  streak: Streak;
  coverage: Coverage | null;
  onSchedule?: OnSchedule;
  trophyCase?: { graduated: ProblemProgress[]; retired: RetiredProblem[] };
  badges: Badge[];
  problems: ProblemProgress[];
  warnings?: string[];
}
