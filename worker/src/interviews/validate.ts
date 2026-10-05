import {
  CIPHERTEXT_MAX_LENGTH,
  IV_LENGTH,
  LOOKUP_ID_LENGTH,
  PUBLIC_KEY_LENGTH,
  WRITE_TOKEN_LENGTH,
  type PutInterviewRequest,
} from './contract';

const BASE64URL = /^[A-Za-z0-9_-]+$/;
const BEARER_PREFIX = 'Bearer ';
const PUT_KEYS: readonly string[] = ['v', 'rev', 'candidateId', 'publicRaw', 'iv', 'ciphertext'];

function isBase64url(value: unknown, minLength: number, maxLength: number): value is string {
  return (
    typeof value === 'string' &&
    value.length >= minLength &&
    value.length <= maxLength &&
    BASE64URL.test(value)
  );
}

function isExactBase64url(value: unknown, length: number): value is string {
  return isBase64url(value, length, length);
}

export function isValidId(value: string): boolean {
  return isExactBase64url(value, LOOKUP_ID_LENGTH);
}

/** The bearer token from an Authorization header, or null when absent or malformed. */
export function parseBearer(header: string | null): string | null {
  if (header === null || !header.startsWith(BEARER_PREFIX)) {
    return null;
  }
  const token = header.slice(BEARER_PREFIX.length);
  return isExactBase64url(token, WRITE_TOKEN_LENGTH) ? token : null;
}

/** Validates a parsed JSON value as a PutInterviewRequest; null when it is not one. */
export function parsePutBody(value: unknown): PutInterviewRequest | null {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }
  const record = value as Record<string, unknown>;
  const keys = Object.keys(record);
  if (keys.length !== PUT_KEYS.length || !PUT_KEYS.every((key) => keys.includes(key))) {
    return null;
  }
  const { v, rev, candidateId, publicRaw, iv, ciphertext } = record;
  if (
    v !== 1 ||
    typeof rev !== 'number' ||
    !Number.isSafeInteger(rev) ||
    rev < 1 ||
    !isExactBase64url(candidateId, LOOKUP_ID_LENGTH) ||
    !isExactBase64url(publicRaw, PUBLIC_KEY_LENGTH) ||
    !isExactBase64url(iv, IV_LENGTH) ||
    !isBase64url(ciphertext, 1, CIPHERTEXT_MAX_LENGTH)
  ) {
    return null;
  }
  return { v, rev, candidateId, publicRaw, iv, ciphertext };
}
