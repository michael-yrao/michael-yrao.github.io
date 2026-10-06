import { parseInterviewProblem, type InterviewProblem } from '../session/interview-problem';

export const INTERVIEW_DRAFT_KEY = 'po-interview-draft';

/** The empty template every interview starts from. */
export const EMPTY_PROBLEM: InterviewProblem = {
  title: '',
  statement: '',
  starter: '',
  entry: null,
  compare: 'exact',
  cases: [],
  result: null,
  types: null,
  figure: null,
  source: null,
};

/** A stored draft's raw text as a problem; absent, bad JSON or an invalid problem (logged) is the empty problem. */
export function parseDraft(raw: string | null): InterviewProblem {
  if (raw === null) return EMPTY_PROBLEM;
  try {
    const problem = parseInterviewProblem(JSON.parse(raw));
    if (problem) return problem;
    console.error(`Interview: ${INTERVIEW_DRAFT_KEY} is not a valid problem`);
  } catch (err) {
    console.error(`Interview: could not parse ${INTERVIEW_DRAFT_KEY}`, err);
  }
  return EMPTY_PROBLEM;
}

/** The saved draft; storage is external input, so a read error is logged and read as empty. */
export function loadInterviewDraft(): InterviewProblem {
  try {
    return parseDraft(localStorage.getItem(INTERVIEW_DRAFT_KEY));
  } catch (err) {
    console.error(`Interview: could not read ${INTERVIEW_DRAFT_KEY}`, err);
    return EMPTY_PROBLEM;
  }
}

export function saveInterviewDraft(problem: InterviewProblem): void {
  try {
    localStorage.setItem(INTERVIEW_DRAFT_KEY, JSON.stringify(problem));
  } catch (err) {
    console.error(`Interview: could not save ${INTERVIEW_DRAFT_KEY}`, err);
  }
}

/** Removes the saved draft, for a draft that has become a saved problem. */
export function clearInterviewDraft(): void {
  try {
    localStorage.removeItem(INTERVIEW_DRAFT_KEY);
  } catch (err) {
    console.error(`Interview: could not remove ${INTERVIEW_DRAFT_KEY}`, err);
  }
}
