import type { Options } from '@anthropic-ai/claude-agent-sdk';
import { describe, expect, it } from 'vitest';
import { REPOS } from './config.js';
import type { CoachEvent, CoachMessageRequest } from './contract.js';
import type { SyncResult } from './repo.js';
import { createSession, type QueryFn, type QueryLike, type Session } from './session.js';
import { runTurn, type TurnDeps, type TurnRepo } from './turn.js';

const TOKEN = 'tok-test';
const REQUEST: CoachMessageRequest = {
  sessionId: null,
  message: 'starting this one',
  context: { route: '/practice/1', repo: 'cse-progress' },
};
const TEXT = { type: 'stream_event', session_id: 's1', parent_tool_use_id: null, event: { type: 'content_block_delta', delta: { type: 'text_delta', text: 'Hi' } } };
const RESULT_OK = { type: 'result', subtype: 'success', is_error: false, session_id: 's1', total_cost_usd: 0.5 };
const RESULT_INTERRUPTED = { type: 'result', subtype: 'error_during_execution', is_error: true, session_id: 's1', total_cost_usd: 0.2 };

interface FakeQuery {
  readonly fn: QueryFn;
  readonly options: Options[];
  readonly queries: QueryLike[];
}

/** A query that replays `script`; an Error entry throws. With an empty script it waits for interrupt(). */
function fakeQuery(script: unknown[]): FakeQuery {
  const options: Options[] = [];
  const queries: QueryLike[] = [];
  const fn: QueryFn = (params) => {
    options.push(params.options);
    const queue = [...script];
    let isInterrupted = false;
    let wake: (() => void) | null = null;
    const query: QueryLike = {
      async next() {
        const item = queue.shift();
        if (item instanceof Error) throw item;
        if (item !== undefined) return { value: item, done: false };
        if (!isInterrupted) await new Promise<void>((resolve) => (wake = resolve));
        return { value: RESULT_INTERRUPTED, done: false };
      },
      async interrupt() {
        isInterrupted = true;
        wake?.();
      },
      close: () => undefined,
    };
    queries.push(query);
    return query;
  };
  return { fn, options, queries };
}

function fakeRepo(options: { sync?: SyncResult; headAfter?: string; dirtyAfter?: boolean; cloneThrows?: boolean } = {}): TurnRepo & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls,
    writeCredentials: async () => void calls.push('credentials'),
    ensureClone: async () => {
      calls.push('clone');
      if (options.cloneThrows) throw new Error('boom');
      return false;
    },
    sync: async () => options.sync ?? { kind: 'ok', head: 'h1', dirty: false },
    remoteHead: async () => options.headAfter ?? 'h1',
    isDirty: async () => options.dirtyAfter ?? false,
    startSdClone: () => void calls.push('sd'),
    hasSdClone: async () => false,
  };
}

function rig(script: unknown[], repoOptions: Parameters<typeof fakeRepo>[0] = {}) {
  const query = fakeQuery(script);
  const repo = fakeRepo(repoOptions);
  const session: Session = createSession();
  session.tryAcquire();
  const processEnv = { PATH: '/bin', HOME: '/home/coach', ANTHROPIC_API_KEY: 'key-test', COACH_TZ: 'America/New_York', GH_TOKEN: TOKEN, STRAY: 'x' };
  const deps: TurnDeps = { query: query.fn, repo, session, transcriptExists: async () => false, processEnv };
  return { deps, query, repo, session };
}

async function collect(generator: AsyncGenerator<CoachEvent>): Promise<CoachEvent[]> {
  const events: CoachEvent[] = [];
  for await (const event of generator) events.push(event);
  return events;
}

const turnEnd = (events: readonly CoachEvent[]) => events.find((event) => event.type === 'turn_end');

describe('runTurn', () => {
  it('streams a turn and reports repoChanged when origin/main moved, with the SDK env allow-listed', async () => {
    const { deps, query } = rig([TEXT, RESULT_OK], { headAfter: 'h2' });
    const events = await collect(runTurn({ request: REQUEST, token: TOKEN }, deps));
    expect(events.map((event) => event.type)).toEqual(['session', 'text', 'turn_end']);
    expect(events[0]).toEqual({ type: 'session', sessionId: null, resumed: false, repoHead: 'h1' });
    expect(turnEnd(events)).toEqual({
      type: 'turn_end', sessionId: 's1', turnCostUsd: 0.5, sessionCostUsd: 0.5,
      repoHead: 'h2', repoChanged: true, dirty: false, stopReason: 'done',
    });

    const options = query.options[0];
    expect(Object.keys(options?.env ?? {}).sort()).toEqual([
      'ANTHROPIC_API_KEY', 'CLAUDE_CODE_DISABLE_AUTO_MEMORY', 'CLAUDE_CONFIG_DIR', 'ENABLE_PROMPT_CACHING_1H',
      'GIT_TERMINAL_PROMPT', 'HOME', 'LANG', 'PATH', 'PO_COACH_RUNTIME', 'PYTHONIOENCODING', 'TZ',
    ]);
    expect(options?.env).toMatchObject({ GIT_TERMINAL_PROMPT: '0', LANG: 'C.UTF-8' });
    expect(JSON.stringify(options)).not.toContain(TOKEN);
    expect(options).toMatchObject({ cwd: REPOS.cse.dir, permissionMode: 'dontAsk', settingSources: ['project'], model: 'claude-opus-5-5', includePartialMessages: true });
  });

  it('reports repoChanged false and dirty true when nothing was pushed and files are left over', async () => {
    const { deps } = rig([RESULT_OK], { dirtyAfter: true });
    const end = turnEnd(await collect(runTurn({ request: REQUEST, token: TOKEN }, deps)));
    expect(end).toMatchObject({ repoChanged: false, dirty: true });
  });

  it('refuses a turn on a pull conflict before the SDK starts', async () => {
    const { deps, query } = rig([RESULT_OK], { sync: { kind: 'conflict' } });
    expect(await collect(runTurn({ request: REQUEST, token: TOKEN }, deps))).toEqual([{ type: 'error', code: 'pull-conflict' }]);
    expect(query.options).toHaveLength(0);
  });

  it('reports clone-failed when the repo cannot be prepared', async () => {
    const { deps } = rig([RESULT_OK], { cloneThrows: true });
    expect(await collect(runTurn({ request: REQUEST, token: TOKEN }, deps))).toEqual([{ type: 'error', code: 'clone-failed' }]);
  });

  it('ends with stopReason interrupted after an interrupt', async () => {
    const { deps, session } = rig([TEXT]);
    const events: CoachEvent[] = [];
    for await (const event of runTurn({ request: REQUEST, token: TOKEN }, deps)) {
      events.push(event);
      if (event.type === 'text') await session.requestInterrupt();
    }
    expect(turnEnd(events)).toMatchObject({ stopReason: 'interrupted' });
  });

  it('ends with turn_end interrupted when the SDK throws after an interrupt', async () => {
    const { deps, session } = rig([TEXT, new Error('aborted')]);
    const events: CoachEvent[] = [];
    for await (const event of runTurn({ request: REQUEST, token: TOKEN }, deps)) {
      events.push(event);
      if (event.type === 'text') await session.requestInterrupt();
    }
    expect(events.at(-1)).toEqual({
      type: 'turn_end', sessionId: 's1', turnCostUsd: 0, sessionCostUsd: 0,
      repoHead: 'h1', repoChanged: false, dirty: false, stopReason: 'interrupted',
    });
    expect(session.live()).toBeNull();
  });

  it('turns an SDK throw into an error event and drops the live query', async () => {
    const { deps, session } = rig([TEXT, new Error('sdk down')]);
    const events = await collect(runTurn({ request: REQUEST, token: TOKEN }, deps));
    expect(events.at(-1)).toEqual({ type: 'error', code: 'sdk-error' });
    expect(session.live()).toBeNull();
  });
});
