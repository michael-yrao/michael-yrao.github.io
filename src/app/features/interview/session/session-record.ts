import { Signal, signal } from '@angular/core';

import { clearCandidateLock, writeCandidateLock } from './candidate-lock';
import { verifyProblem } from './host-key';
import { InterviewProblem, SignedProblem } from './interview-problem';
import { RevisedDoc } from './session-message';
import { StoredSession, loadSession, saveSession } from './session-store';

/** The revision a tab with no problem holds: below every signed one. */
const NO_PROBLEM_REV = 0;

export interface SessionRecordHooks {
  readonly sessionId: () => string | null;
  readonly publicKey: () => CryptoKey | null;
  /** The session's generation; a changed one means the work was superseded. */
  readonly generation: () => number;
  readonly isCandidate: () => boolean;
  /** The synced text with its revision, or null before the first init or adoption. */
  readonly synced: () => RevisedDoc | null;
  /** A verified problem is now held under `sessionId`. */
  readonly mirror: (sessionId: string, signed: SignedProblem) => void;
}

/**
 * What a tab keeps of its session: the problem, held only once it verified against the session key (newest
 * revision wins), and the copy saved under this tab's role so a reloaded tab can send it in its hello.
 */
export class SessionRecord {
  private signedProblem: SignedProblem | null = null;
  private readonly problemState = signal<InterviewProblem | null>(null);
  /** The problem as last verified against the session key; null until this tab holds one. */
  readonly problem: Signal<InterviewProblem | null> = this.problemState.asReadonly();

  constructor(private readonly hooks: SessionRecordHooks) {}

  /** The signed form of `problem`: what the hello carries and the store keeps. */
  get signed(): SignedProblem | null {
    return this.signedProblem;
  }

  reset(): void {
    this.signedProblem = null;
    this.problemState.set(null);
  }

  /** The saved doc for this role, or null with no session id or nothing saved. */
  savedDoc(): RevisedDoc | null {
    const saved = this.load();
    return saved === null ? null : { doc: saved.doc, rev: saved.rev };
  }

  /** Saves the synced text under this tab's role; nothing is saved while no doc has synced. */
  persist(): void {
    const synced = this.hooks.synced();
    const sessionId = this.hooks.sessionId();
    if (synced === null || sessionId === null) {
      return;
    }
    saveSession(this.role(), sessionId, synced.doc, synced.rev, this.signedProblem);
  }

  /** The saved problem for this role, taken like any other: only once it verifies. */
  async adoptStored(): Promise<void> {
    await this.adopt(this.load()?.problem);
  }

  /**
   * Takes `signed` as the session's problem when its revision is above the held one and the session key signed it
   * for this session and revision; anything else is dropped. Re-checks the revision after the async verify, since
   * another problem may have been taken meanwhile.
   */
  async adopt(signed: SignedProblem | undefined): Promise<void> {
    const { sessionId, publicKey, generation } = this.hooks;
    const id = sessionId();
    const key = publicKey();
    const startGeneration = generation();
    if (signed === undefined || id === null || key === null || signed.rev <= this.heldRev()) {
      return;
    }
    const problem = await verifyProblem(key, id, signed);
    if (startGeneration !== generation() || signed.rev <= this.heldRev()) {
      return;
    }
    if (problem === null) {
      console.error('Interview: ignored a problem that the session key did not sign for this revision');
      return;
    }
    this.hold(signed, problem);
  }

  /** `problem` is verified: show it, keep it with the saved copy, and let a candidate's lock follow its source. */
  hold(signed: SignedProblem, problem: InterviewProblem): void {
    this.signedProblem = signed;
    this.problemState.set(problem);
    if (this.hooks.isCandidate()) {
      this.followCandidateLock(problem.source);
    }
    this.persist();
    const sessionId = this.hooks.sessionId();
    if (sessionId !== null) {
      this.hooks.mirror(sessionId, signed);
    }
  }

  private role(): 'interviewer' | 'candidate' {
    return this.hooks.isCandidate() ? 'candidate' : 'interviewer';
  }

  private load(): StoredSession | null {
    const sessionId = this.hooks.sessionId();
    return sessionId === null ? null : loadSession(this.role(), sessionId);
  }

  private heldRev(): number {
    return this.signedProblem?.rev ?? NO_PROBLEM_REV;
  }

  /** The candidate may not open the solution of the site problem the interview was imported from; none, no lock. */
  private followCandidateLock(source: number | null): void {
    if (source === null) {
      clearCandidateLock();
      return;
    }
    writeCandidateLock(source);
  }
}
