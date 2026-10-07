import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, InjectionToken, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { isRecord } from '../../../core/contracts/is-record';
import { INTERVIEW_CODES_ENABLED, WORKER_API_URL } from '../../../core/data/site-links';
import { HostKeys, parsePackedKey, verifyProblem } from '../session/crypto/host-key';
import { PreparedEntry } from '../session/store/prepared-store';
import { deriveIds } from '../session/session-support';
import {
  CandidateRecordResponse,
  CIPHERTEXT_MAX_LENGTH,
  DIRECTORY_VERSION,
  DirectoryError,
  InterviewerRecordResponse,
  IV_LENGTH,
  PUBLIC_KEY_LENGTH,
  PutInterviewRequest,
} from './directory-contract';
import {
  DirectoryPlaintext,
  InterviewerSecrets,
  candidateLookupId,
  deriveInterviewerSecrets,
  seal,
  unseal,
} from './directory-crypto';
import { normalizeCode } from './interview-code';

export type DirectoryFailure = 'disabled' | 'offline' | 'rate-limited' | 'not-found' | 'deleted' | 'unreadable';
export type CandidateLookup = { readonly status: 'found'; readonly publicRaw: string } | { readonly status: DirectoryFailure };
export type InterviewerFetch =
  | { readonly status: 'found'; readonly rev: number; readonly entry: DirectoryPlaintext }
  | { readonly status: DirectoryFailure };
export type PushOutcome = 'published' | 'stale' | 'candidate-taken' | 'forbidden' | 'deleted' | 'offline' | 'rate-limited' | 'disabled';
export type RemoveOutcome = 'removed' | 'not-found' | 'forbidden' | 'offline' | 'disabled';

/** Whether the directory is on; overridable so a spec can switch it without touching the build flag. */
export const DIRECTORY_ENABLED = new InjectionToken<boolean>('DIRECTORY_ENABLED', {
  providedIn: 'root',
  factory: () => INTERVIEW_CODES_ENABLED,
});

/** The status `HttpClient` reports for a network failure: no response reached the server. */
const OFFLINE_STATUS = 0;
const STATUS_OK = 200;
const STATUS_CREATED = 201;
const STATUS_NO_CONTENT = 204;
const STATUS_UNAUTHORIZED = 401;
const STATUS_FORBIDDEN = 403;
const STATUS_NOT_FOUND = 404;
const STATUS_CONFLICT = 409;
const STATUS_GONE = 410;
const STATUS_RATE_LIMITED = 429;
const STATUS_SERVER_ERROR = 500;
const BASE64URL_PATTERN = /^[A-Za-z0-9_-]+$/;

interface RawResponse {
  readonly status: number;
  readonly body: unknown;
}

interface KeyIdentity {
  readonly keys: HostKeys;
  readonly sessionId: string;
}

function isBase64UrlOfLength(value: unknown, length: number): value is string {
  return typeof value === 'string' && value.length === length && BASE64URL_PATTERN.test(value);
}

function isRevision(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}

function isCandidateRecord(body: unknown): body is CandidateRecordResponse {
  return isRecord(body) && body['v'] === DIRECTORY_VERSION && isBase64UrlOfLength(body['publicRaw'], PUBLIC_KEY_LENGTH);
}

function isInterviewerRecord(body: unknown): body is InterviewerRecordResponse {
  return (
    isRecord(body) &&
    body['v'] === DIRECTORY_VERSION &&
    isRevision(body['rev']) &&
    isBase64UrlOfLength(body['iv'], IV_LENGTH) &&
    typeof body['ciphertext'] === 'string' &&
    body['ciphertext'].length > 0 &&
    body['ciphertext'].length <= CIPHERTEXT_MAX_LENGTH &&
    BASE64URL_PATTERN.test(body['ciphertext'])
  );
}

function isUnreachable(status: number): boolean {
  return status === OFFLINE_STATUS || status >= STATUS_SERVER_ERROR;
}

/** The failure a status that is not a success stands for in a read. */
function failureOf(status: number): DirectoryFailure {
  if (status === STATUS_NOT_FOUND) {
    return 'not-found';
  }
  if (status === STATUS_GONE) {
    return 'deleted';
  }
  if (status === STATUS_RATE_LIMITED) {
    return 'rate-limited';
  }
  return isUnreachable(status) ? 'offline' : 'unreadable';
}

/** The outcome of a write that was not accepted; a refusal that retrying cannot fix is `forbidden`. */
function pushFailureOf(status: number, body: unknown): { readonly outcome: PushOutcome; readonly serverRev?: number } {
  const error: Partial<DirectoryError> = isRecord(body) ? body : {};
  if (status === STATUS_CONFLICT && error.error === 'stale') {
    return isRevision(error.rev) ? { outcome: 'stale', serverRev: error.rev } : { outcome: 'stale' };
  }
  if (status === STATUS_CONFLICT && error.error === 'candidate-taken') {
    return { outcome: 'candidate-taken' };
  }
  if (status === STATUS_GONE) {
    return { outcome: 'deleted' };
  }
  if (status === STATUS_RATE_LIMITED) {
    return { outcome: 'rate-limited' };
  }
  return { outcome: isUnreachable(status) ? 'offline' : 'forbidden' };
}

/**
 * The client of the worker's interview directory. Every failure is a named result, never a throw; no code, token,
 * key, plaintext or request body is logged. PBKDF2 runs once per interviewer code for this service's lifetime.
 */
@Injectable({ providedIn: 'root' })
export class InterviewDirectoryService {
  private readonly http = inject(HttpClient);
  readonly isEnabled: boolean = inject(DIRECTORY_ENABLED);

  private readonly secretsByCode = new Map<string, Promise<InterviewerSecrets>>();
  private readonly identitiesByPacked = new Map<string, Promise<KeyIdentity | null>>();

  async lookupCandidate(code: string): Promise<CandidateLookup> {
    if (!this.isEnabled) {
      return { status: 'disabled' };
    }
    const response = await this.send('GET', `interviews/c/${await candidateLookupId(code)}`);
    if (response.status !== STATUS_OK) {
      return { status: failureOf(response.status) };
    }
    return isCandidateRecord(response.body) ? { status: 'found', publicRaw: response.body.publicRaw } : { status: 'unreadable' };
  }

  /** The interviewer's record for `code`, decrypted and verified against its own key; anything wrong is `unreadable`. */
  async fetchInterviewer(code: string): Promise<InterviewerFetch> {
    if (!this.isEnabled) {
      return { status: 'disabled' };
    }
    const secrets = await this.secretsFor(code);
    const response = await this.send('GET', `interviews/i/${secrets.lookupId}`);
    if (response.status !== STATUS_OK) {
      return { status: failureOf(response.status) };
    }
    if (!isInterviewerRecord(response.body)) {
      return { status: 'unreadable' };
    }
    const entry = await unseal(secrets.key, response.body);
    const isConsistent = entry !== null && entry.problem.rev === response.body.rev && (await this.isVerified(entry));
    return isConsistent ? { status: 'found', rev: response.body.rev, entry } : { status: 'unreadable' };
  }

  async push(entry: PreparedEntry): Promise<{ readonly outcome: PushOutcome; readonly serverRev?: number }> {
    if (!this.isEnabled) {
      return { outcome: 'disabled' };
    }
    const [secrets, identity] = await Promise.all([this.secretsFor(entry.interviewerCode), this.identityOf(entry.packed)]);
    const body = identity === null ? null : await this.requestBody(entry, secrets, identity);
    if (body === null) {
      return { outcome: 'forbidden' };
    }
    const response = await this.send('PUT', `interviews/i/${secrets.lookupId}`, body, secrets.writeToken);
    if (response.status === STATUS_OK || response.status === STATUS_CREATED) {
      return { outcome: 'published', serverRev: entry.problem.rev };
    }
    return pushFailureOf(response.status, response.body);
  }

  async remove(interviewerCode: string): Promise<RemoveOutcome> {
    if (!this.isEnabled) {
      return 'disabled';
    }
    const secrets = await this.secretsFor(interviewerCode);
    const { status } = await this.send('DELETE', `interviews/i/${secrets.lookupId}`, undefined, secrets.writeToken);
    if (status === STATUS_NO_CONTENT) {
      return 'removed';
    }
    if (status === STATUS_NOT_FOUND) {
      return 'not-found';
    }
    return status === STATUS_UNAUTHORIZED || status === STATUS_FORBIDDEN ? 'forbidden' : 'offline';
  }

  private async requestBody(entry: PreparedEntry, secrets: InterviewerSecrets, identity: KeyIdentity): Promise<PutInterviewRequest | null> {
    const plain: DirectoryPlaintext = {
      v: DIRECTORY_VERSION,
      packed: entry.packed,
      problem: entry.problem,
      createdAt: entry.createdAt,
      candidateCode: entry.candidateCode,
      ...(entry.schedule === undefined ? {} : { schedule: entry.schedule }),
    };
    const [sealed, candidateId] = await Promise.all([seal(secrets.key, plain), candidateLookupId(entry.candidateCode)]);
    if (sealed.ciphertext.length > CIPHERTEXT_MAX_LENGTH) {
      console.error('Interview directory: the entry is too large to publish');
      return null;
    }
    return { v: DIRECTORY_VERSION, rev: entry.problem.rev, candidateId, publicRaw: identity.keys.publicRaw, ...sealed };
  }

  /** The entry's candidate code is well formed and its signed problem verifies against its own packed key. */
  private async isVerified(entry: DirectoryPlaintext): Promise<boolean> {
    const identity = await this.identityOf(entry.packed);
    const isCandidateCode = normalizeCode(entry.candidateCode)?.role === 'candidate';
    return isCandidateCode && identity !== null && (await verifyProblem(identity.keys.publicKey, identity.sessionId, entry.problem)) !== null;
  }

  private secretsFor(code: string): Promise<InterviewerSecrets> {
    const cached = this.secretsByCode.get(code);
    if (cached !== undefined) {
      return cached;
    }
    const derived = deriveInterviewerSecrets(code);
    this.secretsByCode.set(code, derived);
    derived.catch(() => this.secretsByCode.delete(code));
    return derived;
  }

  private identityOf(packed: string): Promise<KeyIdentity | null> {
    const cached = this.identitiesByPacked.get(packed);
    if (cached !== undefined) {
      return cached;
    }
    const parsed = this.parseIdentity(packed);
    this.identitiesByPacked.set(packed, parsed);
    return parsed;
  }

  private async parseIdentity(packed: string): Promise<KeyIdentity | null> {
    const keys = await parsePackedKey(packed);
    return keys === null ? null : { keys, sessionId: (await deriveIds(keys)).sessionId };
  }

  /** One request; a network failure is status 0, and the response body is untrusted until a caller validates it. */
  private async send(method: string, path: string, body?: PutInterviewRequest, token?: string): Promise<RawResponse> {
    const headers = token === undefined ? undefined : new HttpHeaders({ Authorization: `Bearer ${token}` });
    try {
      const response = await firstValueFrom(
        this.http.request<unknown>(method, `${WORKER_API_URL}${path}`, { body, headers, observe: 'response', responseType: 'json' }),
      );
      return { status: response.status, body: response.body };
    } catch (error) {
      if (error instanceof HttpErrorResponse) {
        return { status: error.status, body: error.error };
      }
      console.error('Interview directory: the request failed before a response');
      return { status: OFFLINE_STATUS, body: null };
    }
  }
}
