// The coach chat contract used by the coach container. This block is character-for-character identical to
// worker/src/coach/contract.ts and src/app/core/models/coach.model.ts; do not reformat, do not run
// Prettier over it, do not add fields. If it needs to change, change all three copies together.
export const COACH_CONTRACT_VERSION = 1;
export const COACH_LIMITS = { messageChars: 8_000, codeChars: 50_000, routeChars: 200, verdictChars: 200 } as const;
export const COACH_TOKEN_HEADER = 'X-PO-GitHub-Token';
export const SSE_HEARTBEAT_MS = 15_000;
export interface CoachPageContext { readonly route: string; readonly repo: string;
  readonly problem?: { readonly number: number; readonly title: string };
  readonly code?: string;
  readonly run?: { readonly passed: number; readonly total: number; readonly verdicts: string } }   // verdicts: marks like "✓✓✗⏱"
export interface CoachMessageRequest { readonly sessionId: string | null; readonly message: string;
  readonly context: CoachPageContext }
export type CoachStopReason = 'done' | 'interrupted' | 'max-turns' | 'error';
export type CoachErrorCode = 'busy' | 'clone-failed' | 'pull-conflict' | 'sdk-error' | 'bad-request'
  | 'unauthorized' | 'not-owner' | 'rate-limited' | 'container-unavailable';
export type CoachEvent =
  | { readonly type: 'session'; readonly sessionId: string | null; readonly resumed: boolean;
      readonly repoHead: string }
  | { readonly type: 'text'; readonly delta: string }
  | { readonly type: 'tool_start'; readonly id: string; readonly label: string }
  | { readonly type: 'tool_end'; readonly id: string; readonly ok: boolean }
  | { readonly type: 'turn_end'; readonly sessionId: string; readonly turnCostUsd: number;
      readonly sessionCostUsd: number; readonly repoHead: string; readonly repoChanged: boolean;
      readonly dirty: boolean; readonly stopReason: CoachStopReason }
  | { readonly type: 'error'; readonly code: CoachErrorCode };
export interface CoachStatus { readonly awake: boolean; readonly busy: boolean; readonly sessionId: string | null;
  readonly repoHead: string | null; readonly dirty: boolean; readonly sessionCostUsd: number }
