import { decodeBase64Url } from './host-key';

/**
 * Session identity. The interviewer holds an ECDSA P-256 key pair; the candidate link carries only
 * the raw public key. Two PeerJS ids hang off the keys:
 *
 * - The session id, derived from the public key, is the CANDIDATE's listening id. It also binds every
 *   signature and keys the saved entries. Anyone holding the candidate link can compute it, so anyone may
 *   register it, but registering it blocks nobody: the interviewers never listen on it.
 * - The host peer id, derived from the packed private value, is where the INTERVIEWERS' tabs register (one
 *   hosts, the others dial). Only an interviewer-link holder can compute it, and it is never sent to the
 *   candidate: the hosting tab dials the candidate from a fresh Peer with a random id.
 *
 * Every connection still runs a challenge/proof handshake, so only the holder of the private key is
 * accepted as the host, whoever dials whom.
 */

const SESSION_ID_PREFIX = 'po-';
const HOST_PEER_ID_PREFIX = 'po-h-';
const HOST_PEER_ID_DOMAIN = 'po-host-id:';
const PEER_ID_HEX_LENGTH = 32;
const HEX_RADIX = 16;
const HEX_DIGITS_PER_BYTE = 2;

async function sha256Hex(data: BufferSource): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(HEX_RADIX).padStart(HEX_DIGITS_PER_BYTE, '0')).join('');
}

/** `po-` plus the first 32 hex characters of SHA-256 over the raw public key bytes. */
export async function sessionIdFromPublicKey(publicRaw: string): Promise<string> {
  const hex = await sha256Hex(decodeBase64Url(publicRaw));
  return SESSION_ID_PREFIX + hex.slice(0, PEER_ID_HEX_LENGTH);
}

/** `po-h-` plus the first 32 hex characters of SHA-256 over `po-host-id:` and the packed private value. */
export async function hostPeerIdFromPacked(packed: string): Promise<string> {
  const hex = await sha256Hex(new TextEncoder().encode(HOST_PEER_ID_DOMAIN + packed));
  return HOST_PEER_ID_PREFIX + hex.slice(0, PEER_ID_HEX_LENGTH);
}
