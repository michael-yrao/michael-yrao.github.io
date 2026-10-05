import { HostKeys } from './host-key';
import { hostPeerIdFromPacked, sessionIdFromPublicKey } from './session-id';
import { NAME_MAX_LENGTH } from './session-message';

/** The pause between dial/host attempts, between a drop and the re-dial, and between broker reconnects. */
export const RECONNECT_DELAY_MS = 3_000;
/** How long a tab keeps failing to hold its session id (hosting, or the candidate's registration) before the connection counts as failed. */
export const RECLAIM_TIMEOUT_MS = 60_000;
/** How long an ending side waits for `end` to be delivered before it closes the transport anyway. */
export const END_GRACE_MS = 1_000;
const NAME_STORAGE_KEY = 'po-interview-name';
const INTERVIEW_PATH = '/interview';
const UNAVAILABLE_ID_TYPE = 'unavailable-id';
const BROKER_ERROR_TYPES: readonly string[] = ['network', 'socket-error', 'socket-closed', 'server-error'];

export function errorType(error: unknown): unknown {
  return typeof error === 'object' && error !== null ? (error as { type?: unknown }).type : undefined;
}

export function isUnavailableId(error: unknown): boolean {
  return errorType(error) === UNAVAILABLE_ID_TYPE;
}

export function isBrokerError(error: unknown): boolean {
  return BROKER_ERROR_TYPES.includes(String(errorType(error)));
}

/** The page URL with `keep` set to `value` and the other role's param removed. */
export function buildRoleUrl(pageUrl: string, keep: string, value: string, drop: string): string {
  const url = new URL(pageUrl);
  url.searchParams.delete(drop);
  url.searchParams.set(keep, value);
  return url.toString();
}

/** `pageUrl` re-pointed at the interview page, keeping its query and dropping its fragment (an interviewer link's fragment holds the problem). */
export function interviewUrl(pageUrl: string): string {
  const url = new URL(pageUrl);
  url.pathname = INTERVIEW_PATH;
  url.hash = '';
  return url.toString();
}

/** Both peer ids an interviewer's keys name. */
export async function deriveIds(keys: HostKeys): Promise<{ sessionId: string; hostPeerId: string }> {
  const [sessionId, hostPeerId] = await Promise.all([sessionIdFromPublicKey(keys.publicRaw), hostPeerIdFromPacked(keys.packed)]);
  return { sessionId, hostPeerId };
}

export function loadName(): string {
  try {
    return localStorage.getItem(NAME_STORAGE_KEY)?.trim().slice(0, NAME_MAX_LENGTH) ?? '';
  } catch (err) {
    console.error(`Interview name: could not read ${NAME_STORAGE_KEY}`, err);
    return '';
  }
}

export function saveName(name: string): void {
  try {
    localStorage.setItem(NAME_STORAGE_KEY, name);
  } catch (err) {
    console.error(`Interview name: could not save ${NAME_STORAGE_KEY}`, err);
  }
}

