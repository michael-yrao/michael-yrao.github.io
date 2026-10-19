import type { Options, SDKUserMessage } from '@anthropic-ai/claude-agent-sdk';

// Single-flight session state for the one owner. One long-lived SDK query serves many turns; this
// module only holds it, the busy flag, the interrupt flag and the cost meter.

export type SessionMode = 'continue' | 'resume' | 'new';

export interface QueryLike {
  next(): Promise<IteratorResult<unknown, unknown>>;
  interrupt(): Promise<unknown>;
  close(): void;
}

export type QueryFn = (params: { prompt: AsyncIterable<SDKUserMessage>; options: Options }) => QueryLike;

export interface InputQueue<T> extends AsyncIterable<T> {
  push(item: T): void;
  close(): void;
}

export interface LiveQuery {
  readonly query: QueryLike;
  readonly input: InputQueue<SDKUserMessage>;
}

export interface SessionSnapshot {
  readonly sessionId: string | null;
  readonly busy: boolean;
  readonly sessionCostUsd: number;
  readonly repoHead: string | null;
  readonly dirty: boolean;
}

export interface CostReading {
  readonly turnCostUsd: number;
  readonly sessionCostUsd: number;
}

export interface Session {
  snapshot(): SessionSnapshot;
  tryAcquire(): boolean;
  release(): void;
  live(): LiveQuery | null;
  attach(live: LiveQuery): void;
  dropLive(): void;
  setSessionId(sessionId: string): void;
  recordCost(totalCostUsd: number): CostReading;
  setRepoState(head: string, dirty: boolean): void;
  requestInterrupt(): Promise<void>;
  wasInterrupted(): boolean;
}

/** Continue the live query, resume a saved transcript, or start fresh. */
export function chooseMode(args: {
  readonly hasLive: boolean;
  readonly currentId: string | null;
  readonly requestedId: string | null;
  readonly transcriptExists: boolean;
}): SessionMode {
  if (args.requestedId === null) return 'new';
  if (args.hasLive && args.requestedId === args.currentId) return 'continue';
  return args.transcriptExists ? 'resume' : 'new';
}

/** An async iterable fed by `push`: the streaming-input prompt that keeps a query open across turns. */
export function createInputQueue<T>(): InputQueue<T> {
  const buffered: T[] = [];
  let waiting: ((result: IteratorResult<T>) => void) | null = null;
  let isClosed = false;

  const finished: IteratorResult<T> = { value: undefined, done: true };

  return {
    push(item) {
      if (isClosed) return;
      if (waiting === null) {
        buffered.push(item);
        return;
      }
      const resolve = waiting;
      waiting = null;
      resolve({ value: item, done: false });
    },
    close() {
      isClosed = true;
      waiting?.(finished);
      waiting = null;
    },
    [Symbol.asyncIterator]() {
      return {
        next(): Promise<IteratorResult<T>> {
          const item = buffered.shift();
          if (item !== undefined) return Promise.resolve({ value: item, done: false });
          if (isClosed) return Promise.resolve(finished);
          return new Promise((resolve) => {
            waiting = resolve;
          });
        },
      };
    },
  };
}

export function createSession(): Session {
  let liveQuery: LiveQuery | null = null;
  let sessionId: string | null = null;
  let isBusy = false;
  let isInterrupted = false;
  let costTotalUsd = 0;
  let repoHead: string | null = null;
  let isDirty = false;

  return {
    snapshot: () => ({ sessionId, busy: isBusy, sessionCostUsd: costTotalUsd, repoHead, dirty: isDirty }),
    tryAcquire() {
      if (isBusy) return false;
      isBusy = true;
      isInterrupted = false;
      return true;
    },
    release() {
      isBusy = false;
    },
    live: () => liveQuery,
    attach(live) {
      liveQuery = live;
      sessionId = null;
      costTotalUsd = 0;
    },
    dropLive() {
      liveQuery?.input.close();
      liveQuery?.query.close();
      liveQuery = null;
    },
    setSessionId(id) {
      sessionId = id;
    },
    recordCost(totalCostUsd) {
      const turnCostUsd = Math.max(0, totalCostUsd - costTotalUsd);
      costTotalUsd = Math.max(costTotalUsd, totalCostUsd);
      return { turnCostUsd, sessionCostUsd: costTotalUsd };
    },
    setRepoState(head, dirty) {
      repoHead = head;
      isDirty = dirty;
    },
    async requestInterrupt() {
      if (!isBusy) return;
      isInterrupted = true;
      await liveQuery?.query.interrupt();
    },
    wasInterrupted: () => isInterrupted,
  };
}
