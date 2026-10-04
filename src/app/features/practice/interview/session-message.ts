import { NONCE_LENGTH, SIGNATURE_LENGTH } from './host-key';

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
  readonly problem: number;
  readonly version: number;
  /** The session revision at `version`. */
  readonly rev: number;
  readonly doc: string;
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
}

export interface NameMessage {
  readonly type: 'name';
  readonly name: string;
}

export type ParticipantRole = 'interviewer' | 'candidate';

export interface Participant {
  readonly id: string;
  readonly role: ParticipantRole;
  readonly name: string;
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
}

export interface RosterMessage {
  readonly type: 'roster';
  readonly participants: readonly Participant[];
}

export type SessionMessage =
  | InitMessage
  | PushMessage
  | UpdatesMessage
  | EndMessage
  | NameMessage
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

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

function isParticipant(value: unknown): value is Participant {
  return isRecord(value) && isParticipantId(value['id']) && isRole(value['role']) && isName(value['name']);
}

function parseHello(data: Record<string, unknown>): HelloMessage | null {
  const { id, role, name, doc, rev, signature } = data;
  const isDocValid = doc === null || typeof doc === 'string';
  const isSignatureValid = signature === undefined || isBase64UrlOfLength(signature, SIGNATURE_LENGTH);
  if (!isParticipantId(id) || !isRole(role) || !isName(name) || !isDocValid || !isCount(rev) || !isSignatureValid) {
    return null;
  }
  return signature === undefined
    ? { type: 'hello', id, role, name, doc, rev }
    : { type: 'hello', id, role, name, doc, rev, signature };
}

function parseShape(data: Record<string, unknown>): SessionMessage | null {
  switch (data['type']) {
    case 'init':
      return isCount(data['problem']) && isCount(data['version']) && isCount(data['rev']) && typeof data['doc'] === 'string'
        ? { type: 'init', problem: data['problem'], version: data['version'], rev: data['rev'], doc: data['doc'] }
        : null;
    case 'push':
      return isCount(data['version']) && isWireUpdateList(data['updates'])
        ? { type: 'push', version: data['version'], updates: data['updates'] }
        : null;
    case 'updates':
      return isWireUpdateList(data['updates']) ? { type: 'updates', updates: data['updates'] } : null;
    case 'end':
      return { type: 'end' };
    case 'name':
      return isName(data['name']) ? { type: 'name', name: data['name'] } : null;
    case 'challenge':
      return isBase64UrlOfLength(data['nonce'], NONCE_LENGTH) ? { type: 'challenge', nonce: data['nonce'] } : null;
    case 'proof':
      return isBase64UrlOfLength(data['signature'], SIGNATURE_LENGTH) && isBase64UrlOfLength(data['nonce'], NONCE_LENGTH)
        ? { type: 'proof', signature: data['signature'], nonce: data['nonce'] }
        : null;
    case 'hello':
      return parseHello(data);
    case 'roster':
      return Array.isArray(data['participants']) && data['participants'].every(isParticipant)
        ? { type: 'roster', participants: data['participants'] }
        : null;
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
