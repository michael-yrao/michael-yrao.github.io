import { isRecord } from '../../../core/contracts/is-record';
import { NONCE_LENGTH, SIGNATURE_LENGTH } from './crypto/host-key';
import { InterviewProblem, PROBLEM_JSON_MAX_LENGTH, SignedProblem, parseInterviewProblem } from './interview-problem';

/** One accepted or pending edit on the wire: the sender's id and a `ChangeSet` as JSON. */
export interface WireUpdate {
  readonly clientID: string;
  readonly changes: readonly unknown[];
}

/** A document and its revision: the count of updates accepted over the session's whole life, across hosts. */
export interface RevisedDoc {
  readonly doc: string;
  readonly rev: number;
}

export interface InitMessage {
  readonly type: 'init';
  readonly version: number;
  /** The session revision at `version`. */
  readonly rev: number;
  readonly doc: string;
  /** The session's problem as the host holds it; absent while it holds none. */
  readonly problem?: SignedProblem;
}

/** Host to everyone: the problem changed. */
export interface ProblemMessage {
  readonly type: 'problem';
  readonly problem: SignedProblem;
}

/** Interviewer to host: the problem as the interviewer now wants it; the host signs and numbers it. */
export interface EditProblemMessage {
  readonly type: 'edit-problem';
  readonly problem: InterviewProblem;
}
export interface PushMessage {
  readonly type: 'push';
  readonly version: number;
  readonly updates: readonly WireUpdate[];
}
export interface UpdatesMessage {
  readonly type: 'updates';
  readonly updates: readonly WireUpdate[];
}
export interface EndMessage {
  readonly type: 'end';
  /** The host's debrief summary; carried as received and checked by `parseEndSummary` where it is used. */
  readonly summary?: unknown;
}

export interface NameMessage {
  readonly type: 'name';
  readonly name: string;
}

export type ParticipantRole = 'interviewer' | 'candidate';

/** What the candidate's browser reported about the candidate's attention; the host keeps it across reconnects. */
export interface CandidateSeat {
  readonly isAway: boolean;
  readonly awayCount: number;
  readonly pasteCount: number;
}

/** The marks of every participant who is not the candidate. */
export const NO_MARKS: CandidateSeat = { isAway: false, awayCount: 0, pasteCount: 0 };

export interface Participant extends CandidateSeat {
  readonly id: string;
  readonly role: ParticipantRole;
  readonly name: string;
}

/** Candidate to host: the tab is now hidden or unfocused (`true`), or back (`false`). */
export interface AwayMessage {
  readonly type: 'away';
  readonly isAway: boolean;
}

/** Candidate to host: a large paste into the editor. */
export interface PasteMessage {
  readonly type: 'paste';
}

/** The host's first message on every connection: a nonce the client must sign. */
export interface ChallengeMessage {
  readonly type: 'challenge';
  readonly nonce: string;
}

/** The client's answer to a challenge; `nonce` is the host's nonce for the client to sign. */
export interface ProofMessage {
  readonly type: 'proof';
  readonly signature: string;
  readonly nonce: string;
}

/** A participant's first message after the handshake: who it is and its current text, or null when it has none. */
export interface HelloMessage {
  readonly type: 'hello';
  /** The sender's collab clientID; the roster uses it so a tab can find its own slot. */
  readonly id: string;
  readonly role: ParticipantRole;
  readonly name: string;
  readonly doc: string | null;
  /** The session revision of `doc`; 0 when `doc` is null. */
  readonly rev: number;
  /** An interviewer's signature over the host nonce; absent for the candidate. */
  readonly signature?: string;
  /** The signed problem this tab holds, when it holds one. */
  readonly problem?: SignedProblem;
}

export interface RosterMessage {
  readonly type: 'roster';
  readonly participants: readonly Participant[];
}

export type SessionMessage =
  | InitMessage
  | ProblemMessage
  | EditProblemMessage
  | PushMessage
  | UpdatesMessage
  | EndMessage
  | NameMessage
  | AwayMessage
  | PasteMessage
  | ChallengeMessage
  | ProofMessage
  | HelloMessage
  | RosterMessage;

/** The longest name, after trimming, that the wire accepts. */
export const NAME_MAX_LENGTH = 40;

/** The longest participant id the wire accepts. */
export const PARTICIPANT_ID_MAX_LENGTH = 64;

const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const ROLES: readonly string[] = ['interviewer', 'candidate'];

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isWireUpdate(value: unknown): value is WireUpdate {
  return isRecord(value) && typeof value['clientID'] === 'string' && Array.isArray(value['changes']);
}

function isWireUpdateList(value: unknown): value is readonly WireUpdate[] {
  return Array.isArray(value) && value.every(isWireUpdate);
}

function isBase64UrlOfLength(value: unknown, length: number): value is string {
  return typeof value === 'string' && value.length === length && BASE64URL_PATTERN.test(value);
}

function isName(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length <= NAME_MAX_LENGTH;
}

function isRole(value: unknown): value is ParticipantRole {
  return typeof value === 'string' && ROLES.includes(value);
}

function isParticipantId(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= PARTICIPANT_ID_MAX_LENGTH;
}

/** The shape only: the signature is checked by `verifyProblem`, never here. */
export function isSignedProblem(value: unknown): value is SignedProblem {
  return (
    isRecord(value) &&
    isCount(value['rev']) &&
    typeof value['json'] === 'string' &&
    value['json'].length <= PROBLEM_JSON_MAX_LENGTH &&
    isBase64UrlOfLength(value['signature'], SIGNATURE_LENGTH)
  );
}

/** An absent `problem` is valid; a present one must be a whole signed problem. */
function isOptionalSignedProblem(value: unknown): boolean {
  return value === undefined || isSignedProblem(value);
}

/** A fresh copy, so a message never carries the peer's own object. */
function copySigned(value: SignedProblem): SignedProblem {
  return { rev: value.rev, json: value.json, signature: value.signature };
}

/** A fresh `problem` field for a message, or nothing when the peer sent none. */
function problemField(value: unknown): { readonly problem?: SignedProblem } {
  return isSignedProblem(value) ? { problem: copySigned(value) } : {};
}

function parseInit(data: Record<string, unknown>): InitMessage | null {
  const { version, rev, doc, problem } = data;
  if (!isCount(version) || !isCount(rev) || typeof doc !== 'string' || !isOptionalSignedProblem(problem)) {
    return null;
  }
  return { type: 'init', version, rev, doc, ...problemField(problem) };
}

function parseProblem(data: Record<string, unknown>): ProblemMessage | null {
  const problem = data['problem'];
  return isSignedProblem(problem) ? { type: 'problem', problem: copySigned(problem) } : null;
}

function parseEditProblem(data: Record<string, unknown>): EditProblemMessage | null {
  const problem = parseInterviewProblem(data['problem']);
  return problem === null ? null : { type: 'edit-problem', problem };
}

function parseParticipant(value: unknown): Participant | null {
  if (!isRecord(value)) {
    return null;
  }
  const { id, role, name, isAway, awayCount, pasteCount } = value;
  if (!isParticipantId(id) || !isRole(role) || !isName(name) || typeof isAway !== 'boolean' || !isCount(awayCount) || !isCount(pasteCount)) {
    return null;
  }
  return { id, role, name, isAway, awayCount, pasteCount };
}

function parseRoster(list: unknown): RosterMessage | null {
  if (!Array.isArray(list)) {
    return null;
  }
  const participants = list.map(parseParticipant);
  return participants.every((participant) => participant !== null) ? { type: 'roster', participants } : null;
}

function parseHello(data: Record<string, unknown>): HelloMessage | null {
  const { id, role, name, doc, rev, signature, problem } = data;
  const isDocValid = doc === null || typeof doc === 'string';
  const isSignatureValid = signature === undefined || isBase64UrlOfLength(signature, SIGNATURE_LENGTH);
  if (!isParticipantId(id) || !isRole(role) || !isName(name) || !isDocValid || !isCount(rev) || !isSignatureValid || !isOptionalSignedProblem(problem)) {
    return null;
  }
  return {
    type: 'hello',
    id,
    role,
    name,
    doc,
    rev,
    ...(signature === undefined ? {} : { signature }),
    ...problemField(problem),
  };
}

function parseShape(data: Record<string, unknown>): SessionMessage | null {
  switch (data['type']) {
    case 'init':
      return parseInit(data);
    case 'problem':
      return parseProblem(data);
    case 'edit-problem':
      return parseEditProblem(data);
    case 'push':
      return isCount(data['version']) && isWireUpdateList(data['updates'])
        ? { type: 'push', version: data['version'], updates: data['updates'] }
        : null;
    case 'updates':
      return isWireUpdateList(data['updates']) ? { type: 'updates', updates: data['updates'] } : null;
    case 'end':
      return data['summary'] === undefined ? { type: 'end' } : { type: 'end', summary: data['summary'] };
    case 'name':
      return isName(data['name']) ? { type: 'name', name: data['name'] } : null;
    case 'away':
      return typeof data['isAway'] === 'boolean' ? { type: 'away', isAway: data['isAway'] } : null;
    case 'paste':
      return { type: 'paste' };
    case 'challenge':
      return isBase64UrlOfLength(data['nonce'], NONCE_LENGTH) ? { type: 'challenge', nonce: data['nonce'] } : null;
    case 'proof':
      return isBase64UrlOfLength(data['signature'], SIGNATURE_LENGTH) && isBase64UrlOfLength(data['nonce'], NONCE_LENGTH)
        ? { type: 'proof', signature: data['signature'], nonce: data['nonce'] }
        : null;
    case 'hello':
      return parseHello(data);
    case 'roster':
      return parseRoster(data['participants']);
    default:
      return null;
  }
}

/** Data from a peer is external input: returns the typed message, or null (logged) when its shape is wrong. */
export function parseSessionMessage(data: unknown): SessionMessage | null {
  const message = isRecord(data) ? parseShape(data) : null;
  if (message === null) {
    console.error('Dropped a malformed session message', data);
  }
  return message;
}
