import { decodeBase64Url } from './host-key';

/**
 * Session identity. The interviewer holds an ECDSA P-256 key pair; the candidate link carries only
 * the raw public key. The session id (the PeerJS id the interviewer's tab registers) is derived from
 * that public key, so the private key never reaches the candidate.
 *
 * Anyone holding the public key could register the peer id while the interviewer is away, but every
 * connection runs a challenge/proof handshake, so only the holder of the private key is accepted as
 * the interviewer.
 */

const PEER_ID_PREFIX = 'po-';
const PEER_ID_HEX_LENGTH = 32;
const HEX_RADIX = 16;
const HEX_DIGITS_PER_BYTE = 2;

/** `po-` plus the first 32 hex characters of SHA-256 over the raw public key bytes. */
export async function sessionIdFromPublicKey(publicRaw: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', decodeBase64Url(publicRaw));
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(HEX_RADIX).padStart(HEX_DIGITS_PER_BYTE, '0')).join('');
  return PEER_ID_PREFIX + hex.slice(0, PEER_ID_HEX_LENGTH);
}
