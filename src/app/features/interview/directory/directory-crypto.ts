/**
 * The interview directory's cryptography. The strings and sizes below are the derivation: changing one orphans every
 * stored record. Nothing here logs a code, key, token or plaintext.
 */

import { decodeBase64Url, encodeBase64Url } from '../session/host-key';
import { SignedProblem } from '../session/interview-problem';
import { InterviewSchedule, parseSchedule } from '../session/interview-schedule';
import { isSignedProblem } from '../session/session-message';
import { CIPHERTEXT_MAX_LENGTH, IV_LENGTH } from './directory-contract';

export const KDF_ITERATIONS = 100_000;

const CANDIDATE_PREFIX = 'po-interview:v1:candidate:';
const INTERVIEWER_SALT = 'po-interview:v1:interviewer';
const LOOKUP_INFO = 'po-interview:v1:lookup';
const WRITE_INFO = 'po-interview:v1:write';
const ENCRYPT_INFO = 'po-interview:v1:encrypt';
const LOOKUP_ID_BYTES = 24;
const WRITE_TOKEN_BYTES = 32;
const BITS_PER_BYTE = 8;
const MASTER_BITS = 256;
const AES_KEY_BITS = 256;
const IV_BYTES = 12;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;
const PLAINTEXT_VERSION = 1;

const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });

export interface InterviewerSecrets {
  readonly lookupId: string;
  readonly writeToken: string;
  readonly key: CryptoKey;
}

export interface DirectoryPlaintext {
  readonly v: 1;
  readonly packed: string;
  readonly problem: SignedProblem;
  readonly createdAt: number;
  readonly candidateCode: string;
  /** Absent for an interview published without one. */
  readonly schedule?: InterviewSchedule;
}

export interface Sealed {
  readonly iv: string;
  readonly ciphertext: string;
}

/** The candidate's lookup id for the normalised `code`: it names the record but is no secret. */
export async function candidateLookupId(code: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(`${CANDIDATE_PREFIX}${code}`));
  return encodeBase64Url(new Uint8Array(digest).slice(0, LOOKUP_ID_BYTES));
}

async function masterSecret(code: string): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey('raw', encoder.encode(code), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: encoder.encode(INTERVIEWER_SALT), iterations: KDF_ITERATIONS },
    material,
    MASTER_BITS,
  );
  return crypto.subtle.importKey('raw', bits, 'HKDF', false, ['deriveBits', 'deriveKey']);
}

function hkdf(info: string): HkdfParams {
  return { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(0), info: encoder.encode(info) };
}

async function deriveText(master: CryptoKey, info: string, byteCount: number): Promise<string> {
  const bits = await crypto.subtle.deriveBits(hkdf(info), master, byteCount * BITS_PER_BYTE);
  return encodeBase64Url(new Uint8Array(bits));
}

/** The lookup id, write token and encryption key for the normalised interviewer `code`. Runs PBKDF2 once. */
export async function deriveInterviewerSecrets(code: string): Promise<InterviewerSecrets> {
  const master = await masterSecret(code);
  const [lookupId, writeToken, key] = await Promise.all([
    deriveText(master, LOOKUP_INFO, LOOKUP_ID_BYTES),
    deriveText(master, WRITE_INFO, WRITE_TOKEN_BYTES),
    crypto.subtle.deriveKey(hkdf(ENCRYPT_INFO), master, { name: 'AES-GCM', length: AES_KEY_BITS }, false, ['encrypt', 'decrypt']),
  ]);
  return { lookupId, writeToken, key };
}

/** Encrypts `plain` under a fresh random nonce. */
export async function seal(key: CryptoKey, plain: DirectoryPlaintext): Promise<Sealed> {
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(JSON.stringify(plain)));
  return { iv: encodeBase64Url(iv), ciphertext: encodeBase64Url(new Uint8Array(cipher)) };
}

function isPlaintext(value: unknown): value is DirectoryPlaintext {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    record['v'] === PLAINTEXT_VERSION &&
    typeof record['packed'] === 'string' &&
    isSignedProblem(record['problem']) &&
    typeof record['createdAt'] === 'number' &&
    Number.isFinite(record['createdAt']) &&
    typeof record['candidateCode'] === 'string'
  );
}

/** `plain` with its schedule kept when valid and dropped when not; the rest of the plaintext is never rejected for it. */
function withValidSchedule(plain: DirectoryPlaintext): DirectoryPlaintext {
  const { schedule, ...rest } = plain;
  const valid = schedule === undefined ? null : parseSchedule(schedule);
  return valid === null ? rest : { ...rest, schedule: valid };
}

function isSealedShape(sealed: Sealed): boolean {
  return (
    typeof sealed.iv === 'string' &&
    sealed.iv.length === IV_LENGTH &&
    BASE64URL_PATTERN.test(sealed.iv) &&
    typeof sealed.ciphertext === 'string' &&
    sealed.ciphertext.length > 0 &&
    sealed.ciphertext.length <= CIPHERTEXT_MAX_LENGTH &&
    BASE64URL_PATTERN.test(sealed.ciphertext)
  );
}

/** The plaintext in `sealed`, or null for a wrong key, tampering, bad text or a wrong shape. Never throws. */
export async function unseal(key: CryptoKey, sealed: Sealed): Promise<DirectoryPlaintext | null> {
  if (!isSealedShape(sealed)) {
    return null;
  }
  try {
    const bytes = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: decodeBase64Url(sealed.iv) }, key, decodeBase64Url(sealed.ciphertext));
    const value: unknown = JSON.parse(decoder.decode(bytes));
    return isPlaintext(value) ? withValidSchedule(value) : null;
  } catch {
    // The caught error can echo what was decrypted, so it is deliberately not logged.
    return null;
  }
}
