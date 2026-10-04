/**
 * The interviewer's key pair (WebCrypto ECDSA P-256, SHA-256). The private half rides in the
 * interviewer link (`?host=`, packed as d||x||y); the public half rides in the candidate link
 * (`?join=`, the raw uncompressed point). Every connection proves possession with a signed challenge.
 * All binary values are base64url without padding.
 *
 * The private key must never be logged: error messages say what was wrong, never the value.
 */

export type SignaturePurpose = 'proof' | 'hello';

export interface HostKeys {
  readonly privateKey: CryptoKey;
  readonly publicKey: CryptoKey;
  /** base64url of the 65-byte uncompressed point (0x04||x||y): the `?join=` value. */
  readonly publicRaw: string;
  /** base64url of d||x||y (96 bytes): the `?host=` value. */
  readonly packed: string;
}

const COORDINATE_BYTES = 32;
const UNCOMPRESSED_PREFIX = 0x04;
const PREFIX_BYTES = 1;
const POINT_BYTES = PREFIX_BYTES + 2 * COORDINATE_BYTES;
const PACKED_BYTES = 3 * COORDINATE_BYTES;
const SIGNATURE_BYTES = 2 * COORDINATE_BYTES;
const BITS_PER_BYTE = 8;
const BITS_PER_CHAR = 6;
const BASE64_BLOCK_CHARS = 4;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const PROBE = new TextEncoder().encode('po-host-key-probe');

const KEY_ALGORITHM: EcKeyImportParams = { name: 'ECDSA', namedCurve: 'P-256' };
const SIGN_ALGORITHM: EcdsaParams = { name: 'ECDSA', hash: 'SHA-256' };

function encodedLength(byteCount: number): number {
  return Math.ceil((byteCount * BITS_PER_BYTE) / BITS_PER_CHAR);
}

export const NONCE_BYTES = 32;
export const NONCE_LENGTH = encodedLength(NONCE_BYTES);
export const SIGNATURE_LENGTH = encodedLength(SIGNATURE_BYTES);
const POINT_LENGTH = encodedLength(POINT_BYTES);
const PACKED_LENGTH = encodedLength(PACKED_BYTES);

function encodeBase64Url(bytes: Uint8Array): string {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Decodes base64url text already checked for charset and length. */
export function decodeBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const base64 = text.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64.padEnd(Math.ceil(base64.length / BASE64_BLOCK_CHARS) * BASE64_BLOCK_CHARS, '='));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

function isBase64Url(text: string, length: number): boolean {
  return text.length === length && BASE64URL_PATTERN.test(text);
}

function concatBytes(...parts: readonly Uint8Array[]): Uint8Array<ArrayBuffer> {
  const result = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  parts.forEach((part) => {
    result.set(part, offset);
    offset += part.length;
  });
  return result;
}

function publicJwk(x: string, y: string): JsonWebKey {
  return { kty: 'EC', crv: 'P-256', x, y };
}

function pointBytes(x: Uint8Array, y: Uint8Array): Uint8Array<ArrayBuffer> {
  return concatBytes(Uint8Array.of(UNCOMPRESSED_PREFIX), x, y);
}

export async function generateHostKeys(): Promise<HostKeys> {
  const pair = await crypto.subtle.generateKey(KEY_ALGORITHM, true, ['sign', 'verify']);
  const { d, x, y } = await crypto.subtle.exportKey('jwk', pair.privateKey);
  if (d === undefined || x === undefined || y === undefined) {
    throw new Error('Host key export is missing a component');
  }
  const [dBytes, xBytes, yBytes] = [d, x, y].map(decodeBase64Url);
  return {
    privateKey: pair.privateKey,
    publicKey: pair.publicKey,
    publicRaw: encodeBase64Url(pointBytes(xBytes, yBytes)),
    packed: encodeBase64Url(concatBytes(dBytes, xBytes, yBytes)),
  };
}

/** Signs a fixed probe with the private key and checks the public key verifies it: d must match x,y. */
async function pairMatches(privateKey: CryptoKey, publicKey: CryptoKey): Promise<boolean> {
  const signature = await crypto.subtle.sign(SIGN_ALGORITHM, privateKey, PROBE);
  return crypto.subtle.verify(SIGN_ALGORITHM, publicKey, signature, PROBE);
}

/** `?host=` value to keys, or null (logged without the value) when malformed or when d does not match x,y. */
export async function parsePackedKey(packed: string): Promise<HostKeys | null> {
  if (!isBase64Url(packed, PACKED_LENGTH)) {
    console.error('Host key: the value is not base64url of the expected length');
    return null;
  }
  try {
    const bytes = decodeBase64Url(packed);
    const d = bytes.slice(0, COORDINATE_BYTES);
    const x = bytes.slice(COORDINATE_BYTES, 2 * COORDINATE_BYTES);
    const y = bytes.slice(2 * COORDINATE_BYTES);
    const [dText, xText, yText] = [d, x, y].map(encodeBase64Url);
    const [privateKey, publicKey] = await Promise.all([
      crypto.subtle.importKey('jwk', { ...publicJwk(xText, yText), d: dText }, KEY_ALGORITHM, false, ['sign']),
      crypto.subtle.importKey('jwk', publicJwk(xText, yText), KEY_ALGORITHM, true, ['verify']),
    ]);
    if (!(await pairMatches(privateKey, publicKey))) {
      console.error('Host key: the private part does not match the public point');
      return null;
    }
    return { privateKey, publicKey, publicRaw: encodeBase64Url(pointBytes(x, y)), packed };
  } catch {
    // The caught error can echo key material, so it is deliberately not logged.
    console.error('Host key: could not import the key');
    return null;
  }
}

/** `?join=` value to a verify key, or null (logged) when malformed or not a valid P-256 point. */
export async function parsePublicKey(publicRaw: string): Promise<CryptoKey | null> {
  if (!isBase64Url(publicRaw, POINT_LENGTH)) {
    console.error('Public key: the value is not base64url of the expected length');
    return null;
  }
  try {
    const bytes = decodeBase64Url(publicRaw);
    if (bytes[0] !== UNCOMPRESSED_PREFIX) {
      console.error('Public key: the point is not in uncompressed form');
      return null;
    }
    return await crypto.subtle.importKey('raw', bytes, KEY_ALGORITHM, true, ['verify']);
  } catch (err) {
    console.error('Public key: could not import the point', err);
    return null;
  }
}

/** A fresh base64url nonce. */
export function createNonce(): string {
  return encodeBase64Url(crypto.getRandomValues(new Uint8Array(NONCE_BYTES)));
}

function challengeBytes(purpose: SignaturePurpose, nonce: string, sessionId: string): Uint8Array<ArrayBuffer> {
  return new TextEncoder().encode(`${purpose}:${nonce}:${sessionId}`);
}

/** Signs the UTF-8 of `${purpose}:${nonce}:${sessionId}`. */
export async function signChallenge(
  privateKey: CryptoKey,
  purpose: SignaturePurpose,
  nonce: string,
  sessionId: string,
): Promise<string> {
  const signature = await crypto.subtle.sign(SIGN_ALGORITHM, privateKey, challengeBytes(purpose, nonce, sessionId));
  return encodeBase64Url(new Uint8Array(signature));
}

/** True only for a valid signature over the same purpose, nonce and session id; false (never throws) otherwise. */
export async function verifyChallenge(
  publicKey: CryptoKey,
  purpose: SignaturePurpose,
  nonce: string,
  sessionId: string,
  signature: string,
): Promise<boolean> {
  if (!isBase64Url(signature, SIGNATURE_LENGTH)) {
    console.error('Challenge: the signature is not base64url of the expected length');
    return false;
  }
  try {
    return await crypto.subtle.verify(
      SIGN_ALGORITHM,
      publicKey,
      decodeBase64Url(signature),
      challengeBytes(purpose, nonce, sessionId),
    );
  } catch (err) {
    console.error('Challenge: could not verify the signature', err);
    return false;
  }
}
