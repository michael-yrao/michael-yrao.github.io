import { buildFeed, type FetchImpl } from './aggregate';
import { corsHeaders } from './cors';
import { SOURCES } from './sources';
import {
  createInterviewHandler,
  LimiterUnavailableError,
  ROUTE_PREFIX,
  type LimitBucket,
} from './interviews/handler';
import { handle as handleAuth, ROUTE_PREFIX as AUTH_PREFIX } from './auth/handler';
import {
  handle as handlePatternSense,
  ROUTE_PREFIX as PATTERN_SENSE_PREFIX,
  type PatternSenseEnv,
} from './pattern-sense/handler';
import { handle as handlePractice, ROUTE_PREFIX as PRACTICE_PREFIX } from './practice/handler';

// How long a built feed is served from the in-memory memo before the next request rebuilds it.
const MEMO_TTL_MS = 5 * 60 * 1000;
// Matches the memo TTL: the browser/edge can hold this response for the same window.
const CACHE_CONTROL_MAX_AGE_SECONDS = 300;

export interface WorkerDeps {
  fetchImpl: FetchImpl;
  now: () => number;
}

interface Memo {
  builtAt: number;
  body: string;
}

/**
 * Builds the request handler with its dependencies (fetch, clock) injected, so tests can drive
 * the memo and CORS logic deterministically with no real network or wall-clock time. Each
 * worker instance gets its own memo closure; a redeploy or eviction just rebuilds it once.
 */
export function createWorker(deps: WorkerDeps) {
  let memo: Memo | null = null;

  async function feedBody(nowMs: number): Promise<string> {
    if (memo && nowMs - memo.builtAt < MEMO_TTL_MS) {
      return memo.body;
    }
    const feed = await buildFeed(SOURCES, deps.fetchImpl, nowMs);
    const body = JSON.stringify(feed);
    memo = { builtAt: nowMs, body };
    return body;
  }

  async function handle(request: Request): Promise<Response> {
    const headers = corsHeaders(request.headers.get('Origin'));

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }
    if (request.method !== 'GET') {
      headers.set('Allow', 'GET, OPTIONS');
      return new Response('Method Not Allowed', { status: 405, headers });
    }

    const body = await feedBody(deps.now());
    headers.set('Content-Type', 'application/json');
    headers.set(
      'Cache-Control',
      `public, max-age=${CACHE_CONTROL_MAX_AGE_SECONDS}, s-maxage=${CACHE_CONTROL_MAX_AGE_SECONDS}`,
    );
    return new Response(body, { status: 200, headers });
  }

  return { handle };
}

const productionWorker = createWorker({
  fetchImpl: (input, init) => fetch(input, init),
  now: () => Date.now(),
});

interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface Env extends PatternSenseEnv {
  INTERVIEWS: KVNamespace;
  INTERVIEW_READS?: RateLimiter;
  INTERVIEW_WRITES?: RateLimiter;
}

/** The interview directory for one request, wired to this request's bindings. */
export function interviewHandlerFor(env: Env) {
  const limiters: Record<LimitBucket, RateLimiter | undefined> = {
    reads: env.INTERVIEW_READS,
    writes: env.INTERVIEW_WRITES,
  };
  return createInterviewHandler({
    kv: env.INTERVIEWS,
    limit: async (bucket, key) => {
      const limiter = limiters[bucket];
      // Fail closed: wrangler dev simulates the [[ratelimits]] bindings locally, so no dev opt-out exists.
      if (!limiter) {
        throw new LimiterUnavailableError();
      }
      return (await limiter.limit({ key })).success;
    },
    now: () => Date.now(),
  });
}

export default {
  fetch: (request: Request, env: Env) => {
    const { pathname } = new URL(request.url);
    if (pathname.startsWith(AUTH_PREFIX)) {
      return handleAuth(request, env, (input, init) => fetch(input, init));
    }
    if (pathname.startsWith(PATTERN_SENSE_PREFIX)) {
      return handlePatternSense(request, env, (input, init) => fetch(input, init));
    }
    if (pathname.startsWith(PRACTICE_PREFIX)) {
      return handlePractice(request, env, (input, init) => fetch(input, init));
    }
    return pathname.startsWith(ROUTE_PREFIX)
      ? interviewHandlerFor(env).handle(request)
      : productionWorker.handle(request);
  },
};
