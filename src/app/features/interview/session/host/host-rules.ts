// The host's pure decisions: which doc becomes canonical, who may be admitted, and how names and the candidate's seat change.
import { CandidateSeat, HelloMessage, NAME_MAX_LENGTH, Participant, RevisedDoc } from '../session-message';

/** What the host knows when it must decide which text becomes the canonical document. */
export interface AuthorityInputs {
  /** The doc saved for the interviewer role in this browser. */
  readonly saved: RevisedDoc | null;
  /** A tab that took over: its own synced doc. */
  readonly takeover: RevisedDoc | null;
  /** The doc of each hello received so far, in arrival order; null when that side had none. */
  readonly hellos: readonly (RevisedDoc | null)[];
  /** True while a connected peer has not finished its handshake: its doc may still arrive, so the stub must wait. */
  readonly hasPendingHandshake: boolean;
}

/**
 * The text the session starts from: the candidate with the highest revision among the saved doc, the
 * takeover doc and the hellos (a tie keeps that order, so the first hello wins among hellos), else (every hello
 * was empty and no handshake is pending) the stub at revision 0. Null while there is nothing to decide on yet.
 */
export function chooseAuthorityDoc(inputs: AuthorityInputs, stubFn: () => string): RevisedDoc | null {
  const candidates = [inputs.saved, inputs.takeover, ...inputs.hellos].filter((entry) => entry !== null);
  const newest = candidates.reduce<RevisedDoc | null>((best, entry) => (best === null || entry.rev > best.rev ? entry : best), null);
  if (newest !== null) {
    return newest;
  }
  return inputs.hellos.length > 0 && !inputs.hasPendingHandshake ? { doc: stubFn(), rev: 0 } : null;
}

export function cleanName(name: string): string {
  return name.trim().slice(0, NAME_MAX_LENGTH);
}

/** The seat after the candidate's `away` report: a repeat changes nothing, and only a new absence is counted. */
export function withAway(seat: CandidateSeat, isAway: boolean): CandidateSeat {
  if (seat.isAway === isAway) {
    return seat;
  }
  return { ...seat, isAway, awayCount: isAway ? seat.awayCount + 1 : seat.awayCount };
}

/** One candidate at most, and no id twice (the host's own, `selfId`, included). */
export function isHelloRefused(hello: HelloMessage, selfId: string, admitted: readonly Participant[]): boolean {
  const isIdTaken = hello.id === selfId || admitted.some((participant) => participant.id === hello.id);
  const isSecondCandidate = hello.role === 'candidate' && admitted.some((participant) => participant.role === 'candidate');
  return isIdTaken || isSecondCandidate;
}
