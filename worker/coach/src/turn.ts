import type { Options, SDKUserMessage } from '@anthropic-ai/claude-agent-sdk';
import {
  ALLOWED_TOOLS,
  CLAUDE_CONFIG_DIR,
  DEFAULT_TZ,
  EFFORT,
  MAX_TURNS,
  MODEL,
  REPOS,
  type RepoSpec,
} from './config.js';
import type { CoachErrorCode, CoachEvent, CoachMessageRequest } from './contract.js';
import { preToolUseGuard, type RepoRoots } from './guardrails.js';
import { toCoachEvents, toTurnResult, type TurnResult } from './map-sdk.js';
import { buildPrompt } from './prompt.js';
import type { SyncResult } from './repo.js';
import {
  chooseMode,
  createInputQueue,
  type LiveQuery,
  type QueryFn,
  type Session,
  type SessionMode,
} from './session.js';

export interface TurnRepo {
  writeCredentials(token: string): Promise<void>;
  ensureClone(repo: RepoSpec): Promise<boolean>;
  sync(dir: string): Promise<SyncResult>;
  remoteHead(dir: string): Promise<string>;
  isDirty(dir: string): Promise<boolean>;
  /** Starts the background sd-progress clone; a failure there never reaches the turn. */
  startSdClone(): void;
  hasSdClone(): Promise<boolean>;
}

export interface TurnDeps {
  readonly query: QueryFn;
  readonly repo: TurnRepo;
  readonly session: Session;
  readonly transcriptExists: (sessionId: string) => Promise<boolean>;
  readonly processEnv: NodeJS.ProcessEnv;
}

export interface TurnInput {
  readonly request: CoachMessageRequest;
  readonly token: string;
}

const ROOTS: RepoRoots = { cse: REPOS.cse.dir, sd: REPOS.sd.dir };

/** The SDK child's environment: named keys only. Nothing else from the process env, and no GitHub token. */
export function buildSdkEnv(source: NodeJS.ProcessEnv): Record<string, string | undefined> {
  return {
    PATH: source['PATH'],
    HOME: source['HOME'],
    TZ: source['COACH_TZ'] ?? DEFAULT_TZ,
    ANTHROPIC_API_KEY: source['ANTHROPIC_API_KEY'],
    CLAUDE_CONFIG_DIR,
    CLAUDE_CODE_DISABLE_AUTO_MEMORY: '1',
    ENABLE_PROMPT_CACHING_1H: '1',
    PO_COACH_RUNTIME: '1',
    PYTHONIOENCODING: 'utf-8',
    // The SDK child does not inherit the image's ENV: without these a credential failure in the coach's own git hangs.
    GIT_TERMINAL_PROMPT: '0',
    LANG: 'C.UTF-8',
  };
}

export function buildOptions(args: {
  readonly resumeId: string | null;
  readonly hasSd: boolean;
  readonly processEnv: NodeJS.ProcessEnv;
}): Options {
  return {
    cwd: REPOS.cse.dir,
    settingSources: ['project'],
    systemPrompt: { type: 'preset', preset: 'claude_code' },
    permissionMode: 'dontAsk',
    allowedTools: [...ALLOWED_TOOLS],
    hooks: {
      PreToolUse: [
        {
          hooks: [
            async (input) => (input.hook_event_name === 'PreToolUse' ? preToolUseGuard(input, ROOTS) : {}),
          ],
        },
      ],
    },
    model: MODEL,
    effort: EFFORT,
    includePartialMessages: true,
    maxTurns: MAX_TURNS,
    env: buildSdkEnv(args.processEnv),
    ...(args.hasSd ? { additionalDirectories: [REPOS.sd.dir] } : {}),
    ...(args.resumeId === null ? {} : { resume: args.resumeId }),
  };
}

function userMessage(text: string): SDKUserMessage {
  return { type: 'user', message: { role: 'user', content: text }, parent_tool_use_id: null };
}

type Prepared =
  | { readonly kind: 'ready'; readonly head: string; readonly dirty: boolean }
  | { readonly kind: 'failed'; readonly code: CoachErrorCode };

async function prepareRepo(deps: TurnDeps, token: string): Promise<Prepared> {
  try {
    await deps.repo.writeCredentials(token);
    const cloned = await deps.repo.ensureClone(REPOS.cse);
    if (cloned) deps.repo.startSdClone();
    const synced = await deps.repo.sync(REPOS.cse.dir);
    if (synced.kind === 'conflict') return { kind: 'failed', code: 'pull-conflict' };
    return { kind: 'ready', head: synced.head, dirty: synced.dirty };
  } catch (error) {
    logFailure('repo preparation failed', error);
    return { kind: 'failed', code: 'clone-failed' };
  }
}

function logFailure(what: string, error: unknown): void {
  console.error(what, error instanceof Error ? error.message : 'unknown error');
}

async function openLive(
  deps: TurnDeps,
  mode: SessionMode,
  requestedId: string | null,
): Promise<LiveQuery> {
  const { session } = deps;
  const existing = session.live();
  if (mode === 'continue' && existing !== null) return existing;

  session.dropLive();
  const input = createInputQueue<SDKUserMessage>();
  const resumeId = mode === 'resume' ? requestedId : null;
  const options = buildOptions({
    resumeId,
    hasSd: await deps.repo.hasSdClone(),
    processEnv: deps.processEnv,
  });
  const live: LiveQuery = { query: deps.query({ prompt: input, options }), input };
  session.attach(live);
  if (resumeId !== null) session.setSessionId(resumeId);
  return live;
}

function sessionIdOf(message: unknown): string | null {
  const id = (message as { session_id?: unknown } | null)?.session_id;
  return typeof id === 'string' ? id : null;
}

/** Streams the query's messages as coach events until the turn's result message; returns that result. */
async function* streamUntilResult(
  live: LiveQuery,
  session: Session,
): AsyncGenerator<CoachEvent, TurnResult> {
  for (;;) {
    const next = await live.query.next();
    if (next.done === true) throw new Error('the SDK stream ended before a result');
    const sessionId = sessionIdOf(next.value);
    if (sessionId !== null) session.setSessionId(sessionId);
    yield* toCoachEvents(next.value);
    const result = toTurnResult(next.value);
    if (result !== null) return result;
  }
}

async function* finishTurn(
  deps: TurnDeps,
  result: TurnResult,
  headBefore: string,
): AsyncGenerator<CoachEvent> {
  const { session, repo } = deps;
  const sessionId = result.sessionId ?? session.snapshot().sessionId;
  if (sessionId === null) throw new Error('the turn ended without a session id');

  const cost = session.recordCost(result.totalCostUsd);
  const repoHead = await repo.remoteHead(REPOS.cse.dir);
  const dirty = await repo.isDirty(REPOS.cse.dir);
  session.setRepoState(repoHead, dirty);
  yield {
    type: 'turn_end',
    sessionId,
    turnCostUsd: cost.turnCostUsd,
    sessionCostUsd: cost.sessionCostUsd,
    repoHead,
    repoChanged: repoHead !== headBefore,
    dirty,
    stopReason: session.wasInterrupted() ? 'interrupted' : result.stopReason,
  };
}

/** The `turn_end` for a turn whose SDK stream threw after an interrupt; null when the session id or repo state is unreadable. */
async function interruptedTurnEnd(deps: TurnDeps, headBefore: string): Promise<CoachEvent | null> {
  const { session, repo } = deps;
  const { sessionId, sessionCostUsd } = session.snapshot();
  if (sessionId === null) return null;
  try {
    const repoHead = await repo.remoteHead(REPOS.cse.dir);
    const dirty = await repo.isDirty(REPOS.cse.dir);
    session.setRepoState(repoHead, dirty);
    return {
      type: 'turn_end',
      sessionId,
      turnCostUsd: 0,
      sessionCostUsd,
      repoHead,
      repoChanged: repoHead !== headBefore,
      dirty,
      stopReason: 'interrupted',
    };
  } catch (error) {
    logFailure('reading repo state after an interrupt failed', error);
    return null;
  }
}

/**
 * One coached turn. The caller owns the single-flight lock (`session.tryAcquire`) and releases it.
 * Failures become one `error` event; an interrupt ends the turn with stopReason `interrupted`.
 */
export async function* runTurn(input: TurnInput, deps: TurnDeps): AsyncGenerator<CoachEvent> {
  const { request, token } = input;
  const { session } = deps;

  const prepared = await prepareRepo(deps, token);
  if (prepared.kind === 'failed') {
    yield { type: 'error', code: prepared.code };
    return;
  }
  session.setRepoState(prepared.head, prepared.dirty);

  try {
    const mode = chooseMode({
      hasLive: session.live() !== null,
      currentId: session.snapshot().sessionId,
      requestedId: request.sessionId,
      transcriptExists: request.sessionId !== null && (await deps.transcriptExists(request.sessionId)),
    });
    const live = await openLive(deps, mode, request.sessionId);
    yield {
      type: 'session',
      sessionId: session.snapshot().sessionId,
      resumed: mode !== 'new',
      repoHead: prepared.head,
    };

    live.input.push(userMessage(buildPrompt(request.message, request.context)));
    const result = yield* streamUntilResult(live, session);
    yield* finishTurn(deps, result, prepared.head);
  } catch (error) {
    logFailure('coach turn failed', error);
    session.dropLive();
    const interruptedEnd = session.wasInterrupted() ? await interruptedTurnEnd(deps, prepared.head) : null;
    yield interruptedEnd ?? { type: 'error', code: 'sdk-error' };
  }
}
