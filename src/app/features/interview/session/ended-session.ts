import { EMPTY_NOTES, EndSummary } from './debrief';
import { InterviewProblem } from './interview-problem';
import { CandidateSeat } from './session-message';
import { loadNotes } from './notes-store';

const SUMMARY_VERSION = 1;

/** What a side keeps when a session that had a candidate ends; the page saves the debrief from it. */
export interface EndedSession {
  readonly sessionId: string;
  readonly role: 'candidate' | 'interviewer';
  readonly title: string;
  readonly source: number | null;
  readonly summary: EndSummary;
  readonly finalCode: string;
}

/** The host's summary for `end`: no code in it. */
export function buildEndSummary(sessionId: string, startedAt: number, seat: CandidateSeat, endedAt: number): EndSummary {
  return {
    v: SUMMARY_VERSION,
    startedAt,
    endedAt,
    awayCount: seat.awayCount,
    pasteCount: seat.pasteCount,
    notes: loadNotes(sessionId) ?? EMPTY_NOTES,
  };
}

export function endedSessionOf(
  sessionId: string,
  role: EndedSession['role'],
  problem: InterviewProblem | null,
  summary: EndSummary,
  finalCode: string,
): EndedSession {
  return { sessionId, role, title: problem?.title ?? '', source: problem?.source ?? null, summary, finalCode };
}
