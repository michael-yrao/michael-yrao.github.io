/** Wire contract of the interview directory. Mirrored byte for byte between worker/src/interviews/contract.ts and src/app/features/interview/directory/directory-contract.ts. */
export const DIRECTORY_VERSION = 1;
export const LOOKUP_ID_LENGTH = 32;
export const WRITE_TOKEN_LENGTH = 43;
export const PUBLIC_KEY_LENGTH = 87;
export const IV_LENGTH = 16;
export const CIPHERTEXT_MAX_LENGTH = 409_600;
export const BODY_MAX_BYTES = 425_984;

export interface CandidateRecordResponse {
  readonly v: 1;
  readonly publicRaw: string;
}

export interface InterviewerRecordResponse {
  readonly v: 1;
  readonly rev: number;
  readonly iv: string;
  readonly ciphertext: string;
}

export interface PutInterviewRequest {
  readonly v: 1;
  readonly rev: number;
  readonly candidateId: string;
  readonly publicRaw: string;
  readonly iv: string;
  readonly ciphertext: string;
}

export interface PutInterviewResponse {
  readonly rev: number;
}

export type DirectoryErrorCode =
  | 'bad-id'
  | 'bad-request'
  | 'unauthorized'
  | 'forbidden'
  | 'not-found'
  | 'deleted'
  | 'stale'
  | 'candidate-taken'
  | 'immutable'
  | 'too-large'
  | 'unsupported-media-type'
  | 'rate-limited'
  | 'method-not-allowed';

export interface DirectoryError {
  readonly error: DirectoryErrorCode;
  readonly rev?: number;
}
