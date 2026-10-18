import { PatternSenseData, PatternSenseFamily, PatternSenseProblem } from '../models/pattern-sense.model';

/** Results-code format tag; the cse-progress `ingest` refuses any other. */
const CODE_TAG = 'PS1';
const CORRECT_MARK = '+';
const SKIPPED_MARK = '.';
const TOKEN_PATTERN = /^(\d+):(\+|\d+)\/(\+|\d+|\.)$/;

export type WeekPhase = 'family' | 'technique' | 'reveal' | 'done';

/** What was chosen for one problem, already encoded: `+` correct, else the 1-based chip
 *  index; `.` for a technique step that was skipped. */
export interface ProblemAnswer {
  readonly family: string;
  readonly technique: string;
}

export interface WeekRunState {
  readonly index: number;
  readonly phase: WeekPhase;
  /** 1-based chip picked at the current problem's steps; null before that step is answered. */
  readonly familyPick: number | null;
  readonly techniquePick: number | null;
  /** One entry per problem that has reached its reveal. */
  readonly answers: readonly ProblemAnswer[];
}

export function startWeekRun(): WeekRunState {
  return { index: 0, phase: 'family', familyPick: null, techniquePick: null, answers: [] };
}

export function currentProblem(data: PatternSenseData, state: WeekRunState): PatternSenseProblem {
  return data.problems[state.index];
}

/** 1-based chip index of the problem's correct family in `data.families`. */
export function correctFamilyIndex(data: PatternSenseData, problem: PatternSenseProblem): number {
  return data.families.findIndex((f) => f.id === problem.family) + 1;
}

export function correctFamily(data: PatternSenseData, problem: PatternSenseProblem): PatternSenseFamily {
  return data.families[correctFamilyIndex(data, problem) - 1];
}

/** 1-based chip index of the problem's correct technique within its family. */
export function correctTechniqueIndex(data: PatternSenseData, problem: PatternSenseProblem): number {
  return correctFamily(data, problem).techniques.indexOf(problem.technique) + 1;
}

function markFor(pick: number, correctIndex: number): string {
  return pick === correctIndex ? CORRECT_MARK : String(pick);
}

function isChipIndex(pick: number, chipCount: number): boolean {
  return Number.isInteger(pick) && pick >= 1 && pick <= chipCount;
}

/** Step 1. Ignored unless the run is at a family step and `pick` is a real chip. A family
 *  with a single technique skips step 2 and goes straight to the reveal. */
export function chooseFamily(
  state: WeekRunState,
  data: PatternSenseData,
  pick: number,
): WeekRunState {
  if (state.phase !== 'family' || !isChipIndex(pick, data.families.length)) return state;

  const problem = currentProblem(data, state);
  const familyMark = markFor(pick, correctFamilyIndex(data, problem));
  if (correctFamily(data, problem).techniques.length > 1) {
    return { ...state, phase: 'technique', familyPick: pick };
  }
  return {
    ...state,
    phase: 'reveal',
    familyPick: pick,
    answers: [...state.answers, { family: familyMark, technique: SKIPPED_MARK }],
  };
}

/** Step 2, always asked against the CORRECT family's techniques, even after a wrong family. */
export function chooseTechnique(
  state: WeekRunState,
  data: PatternSenseData,
  pick: number,
): WeekRunState {
  if (state.phase !== 'technique' || state.familyPick === null) return state;

  const problem = currentProblem(data, state);
  if (!isChipIndex(pick, correctFamily(data, problem).techniques.length)) return state;

  const answer: ProblemAnswer = {
    family: markFor(state.familyPick, correctFamilyIndex(data, problem)),
    technique: markFor(pick, correctTechniqueIndex(data, problem)),
  };
  return { ...state, phase: 'reveal', techniquePick: pick, answers: [...state.answers, answer] };
}

/** Leaves the reveal: the next problem's family step, or `done` after the last. */
export function advance(state: WeekRunState, data: PatternSenseData): WeekRunState {
  if (state.phase !== 'reveal') return state;
  if (state.index + 1 >= data.problems.length) return { ...state, phase: 'done' };
  return { ...startWeekRun(), index: state.index + 1, answers: state.answers };
}

/** `PS1 <week> <vocabHash> <n>:<f>/<t> …` — problems in deck order, single spaces. */
export function encodeResults(data: PatternSenseData, answers: readonly ProblemAnswer[]): string {
  if (data.week === null) throw new Error('Cannot encode results for a deck with no week.');
  const tokens = data.problems.map(
    (problem, i) => `${problem.lcNumber}:${answers[i].family}/${answers[i].technique}`,
  );
  return [CODE_TAG, data.week, data.vocabHash, ...tokens].join(' ');
}

/** The stored code when it is a well-formed result for exactly this deck (same week, hash
 *  and problem numbers in order); else null, so a stale or foreign entry never replaces play. */
export function restoreCode(data: PatternSenseData, stored: string | null): string | null {
  if (stored === null || data.week === null) return null;

  const [tag, week, hash, ...tokens] = stored.split(' ');
  if (tag !== CODE_TAG || week !== data.week || hash !== data.vocabHash) return null;
  if (tokens.length !== data.problems.length) return null;

  const isDeckResult = tokens.every(
    (token, i) => TOKEN_PATTERN.exec(token)?.[1] === String(data.problems[i].lcNumber),
  );
  return isDeckResult ? stored : null;
}
