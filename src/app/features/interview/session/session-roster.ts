// Owns who is in the session as the host last announced it, the candidate's last marks, and when the candidate first connected.
import { Signal, signal } from '@angular/core';

import { EndSummary } from './debrief';
import { buildEndSummary } from './ended-session';
import { CandidateSeat, NO_MARKS, Participant } from './session-message';
import { loadStartedAt, saveStartedAt } from './store/session-store';

export class SessionRoster {
  private readonly participantsState = signal<readonly Participant[]>([]);
  private readonly startedAtState = signal<number | null>(null);
  /** The candidate's marks from the latest roster that had a candidate: the seed when this tab takes over as host. */
  private seat: CandidateSeat = NO_MARKS;

  /** Everyone in the session as the host last announced it; empty until the first roster arrives. */
  readonly participants: Signal<readonly Participant[]> = this.participantsState.asReadonly();
  /** When a candidate first connected to this session, as the host knows it; null before that and for a candidate. Survives a host reload. */
  readonly startedAt: Signal<number | null> = this.startedAtState.asReadonly();

  get candidateSeat(): CandidateSeat {
    return this.seat;
  }

  hasCandidate(): boolean {
    return this.participantsState().some((participant) => participant.role === 'candidate');
  }

  /** Takes a roster the host announced, keeping the candidate's marks for a later takeover. */
  update(participants: readonly Participant[]): void {
    const { isAway, awayCount, pasteCount } = participants.find((participant) => participant.role === 'candidate') ?? this.seat;
    this.seat = { isAway, awayCount, pasteCount };
    this.participantsState.set(participants);
  }

  /** Empties the roster; the marks and the start time stay. */
  clear(): void {
    this.participantsState.set([]);
  }

  /** Back to a session with nobody in it. */
  reset(): void {
    this.clear();
    this.seat = NO_MARKS;
    this.startedAtState.set(null);
  }

  /** Reads the start time this browser saved for `sessionId`. */
  restoreStart(sessionId: string): void {
    this.startedAtState.set(loadStartedAt(sessionId));
  }

  /** An interviewer tab remembers when it first saw a candidate, and keeps it for a reload. */
  stampStart(sessionId: string | null, isInterviewer: boolean): void {
    if (!this.hasCandidate() || sessionId === null || !isInterviewer || this.startedAtState() !== null) {
      return;
    }
    const startedAt = Date.now();
    this.startedAtState.set(startedAt);
    saveStartedAt(sessionId, startedAt);
  }

  /** The summary the hosting tab sends with `end`; null until a candidate has connected. */
  summary(sessionId: string | null): EndSummary | null {
    const startedAt = this.startedAtState();
    return startedAt === null || sessionId === null ? null : buildEndSummary(sessionId, startedAt, this.seat, Date.now());
  }
}
