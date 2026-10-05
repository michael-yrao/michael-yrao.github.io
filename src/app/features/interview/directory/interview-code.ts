import { CODE_PARAM, HOST_PARAM, JOIN_PARAM } from '../session/interview-params';

/** Interview codes: Crockford base32 (no I, L, O, U), 8 characters for a candidate and 12 for an interviewer. */

export type CodeRole = 'candidate' | 'interviewer';

export const CODE_LENGTH: Readonly<Record<CodeRole, number>> = { candidate: 8, interviewer: 12 };

export interface InterviewCode {
  readonly role: CodeRole;
  readonly code: string;
}

const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const ALPHABET_MASK = 31;
const GROUP_SIZE = 4;
const GROUP_SEPARATOR = '-';
const CODE_PATH = '/interview';
const IGNORED_CHARACTERS = /[\s-]/g;
const LOOKALIKES: Readonly<Record<string, string>> = { O: '0', I: '1', L: '1' };

export function generateCode(role: CodeRole): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH[role]));
  return Array.from(bytes, (byte) => ALPHABET[byte & ALPHABET_MASK]).join('');
}

/** The role and canonical code for what a person typed, or null when it is not a code. */
export function normalizeCode(input: string): InterviewCode | null {
  const code = Array.from(input.toUpperCase().replace(IGNORED_CHARACTERS, ''), (char) => LOOKALIKES[char] ?? char).join('');
  if (![...code].every((char) => ALPHABET.includes(char))) {
    return null;
  }
  if (code.length === CODE_LENGTH.candidate) {
    return { role: 'candidate', code };
  }
  return code.length === CODE_LENGTH.interviewer ? { role: 'interviewer', code } : null;
}

/** Groups of four joined by a hyphen. */
export function formatCode(code: string): string {
  return (code.match(new RegExp(`.{1,${GROUP_SIZE}}`, 'g')) ?? []).join(GROUP_SEPARATOR);
}

/** The page's `/interview?code=` link for `code`, keeping `pageUrl`'s origin and other query, and dropping its `host` and `join` params and its fragment. */
export function codeUrl(pageUrl: string, code: string): string {
  const url = new URL(pageUrl);
  url.pathname = CODE_PATH;
  url.hash = '';
  url.searchParams.delete(HOST_PARAM);
  url.searchParams.delete(JOIN_PARAM);
  url.searchParams.set(CODE_PARAM, formatCode(code));
  return url.toString();
}
