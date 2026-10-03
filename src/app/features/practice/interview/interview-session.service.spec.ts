import { Injector } from '@angular/core';
import { Router } from '@angular/router';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

import { CONNECT_TIMEOUT_MS, InterviewSessionService } from './interview-session.service';
import { PEER_FACTORY, PeerFactory, Transport } from './peer-transport';

const HOST_ID = 'host-1';
const STUB = 'stub';
const PROBLEM = 7;
const OTHER_PROBLEM = 3;
const SETTLE_ROUNDS = 8;

/** An in-memory stand-in for the PeerJS broker. Delivery is a macrotask, as on a real data channel. */
function createNetwork() {
  let onConnection: ((transport: Transport) => void) | null = null;
  const closers: (() => void)[] = [];

  function createPair(): [Transport, Transport] {
    const handlers = [
      { message: null as null | ((data: unknown) => void), close: null as null | (() => void) },
      { message: null as null | ((data: unknown) => void), close: null as null | (() => void) },
    ];
    let isClosed = false;
    const close = () => {
      if (isClosed) {
        return;
      }
      isClosed = true;
      handlers.forEach((side) => setTimeout(() => side.close?.()));
    };
    closers.push(close);
    const endpoint = (self: number): Transport => ({
      send: (message) => {
        const data = JSON.parse(JSON.stringify(message));
        setTimeout(() => handlers[1 - self].message?.(data));
      },
      onMessage: (handler) => (handlers[self].message = handler),
      onClose: (handler) => (handlers[self].close = handler),
      close,
    });
    return [endpoint(0), endpoint(1)];
  }

  const factory: PeerFactory = {
    host: async (callback) => {
      onConnection = callback;
      return { id: HOST_ID, destroy: () => undefined };
    },
    connect: async () => {
      const [hostSide, candidateSide] = createPair();
      onConnection?.(hostSide);
      return candidateSide;
    },
  };
  return { factory, dropAll: () => closers.forEach((close) => close()) };
}

async function settle(): Promise<void> {
  for (let round = 0; round < SETTLE_ROUNDS; round++) {
    await new Promise<void>((resolve) => setTimeout(resolve));
  }
}

function createPeer(factory: PeerFactory) {
  const navigate = vi.fn().mockResolvedValue(true);
  const injector = Injector.create({
    providers: [
      { provide: PEER_FACTORY, useValue: factory },
      { provide: Router, useValue: { navigate } },
      { provide: InterviewSessionService, useClass: InterviewSessionService },
    ],
  });
  return { service: injector.get(InterviewSessionService), navigate };
}

function mountEditor(service: InterviewSessionService): EditorView {
  const shared = service.sharedDoc();
  if (shared === null) {
    throw new Error('no shared doc to mount');
  }
  return new EditorView({
    state: EditorState.create({ doc: shared.doc, extensions: service.collabExtensions() }),
    parent: document.body,
  });
}

interface Scenario {
  readonly name: string;
  readonly run: () => Promise<void>;
}

const SCENARIOS: readonly Scenario[] = [
  {
    name: 'converges after an update made in the mount gap and concurrent edits',
    run: async () => {
      const network = createNetwork();
      const interviewer = createPeer(network.factory).service;
      const candidate = createPeer(network.factory).service;
      await interviewer.start(PROBLEM, STUB, 'https://site.test/practice/7?repo=x');
      await candidate.join(HOST_ID, PROBLEM);
      await settle();

      const interviewerView = mountEditor(interviewer);
      interviewerView.dispatch({ changes: { from: 0, insert: 'gap-' } });
      await settle();

      const candidateView = mountEditor(candidate);
      await settle();
      expect(candidateView.state.doc.toString()).toBe('gap-stub');

      interviewerView.dispatch({ changes: { from: 0, insert: 'I:' } });
      candidateView.dispatch({ changes: { from: candidateView.state.doc.length, insert: ':C' } });
      await settle();

      const text = interviewerView.state.doc.toString();
      expect(candidateView.state.doc.toString()).toBe(text);
      expect(text).toContain('I:');
      expect(text).toContain(':C');
    },
  },
  {
    name: 'a reconnecting candidate is sent the current text, not the stub',
    run: async () => {
      const network = createNetwork();
      const interviewer = createPeer(network.factory).service;
      await interviewer.start(PROBLEM, STUB, 'https://site.test/practice/7');
      const first = createPeer(network.factory).service;
      await first.join(HOST_ID, PROBLEM);
      await settle();
      mountEditor(interviewer).dispatch({ changes: { from: 0, insert: 'edit-' } });
      await settle();

      network.dropAll();
      await settle();
      expect(interviewer.status()).toBe('closed');

      const second = createPeer(network.factory).service;
      await second.join(HOST_ID, PROBLEM);
      await settle();
      expect(second.sharedDoc()).toEqual({ problem: PROBLEM, version: 1, doc: 'edit-stub' });
      expect(interviewer.status()).toBe('open');
    },
  },
  {
    name: 'a second connection while one is open is closed',
    run: async () => {
      const network = createNetwork();
      const interviewer = createPeer(network.factory).service;
      await interviewer.start(PROBLEM, STUB, 'https://site.test/practice/7');
      const first = createPeer(network.factory).service;
      const second = createPeer(network.factory).service;
      await first.join(HOST_ID, PROBLEM);
      await settle();
      await second.join(HOST_ID, PROBLEM);
      await settle();

      expect([first.status(), second.status(), second.sharedDoc()]).toEqual(['open', 'closed', null]);
    },
  },
  {
    name: 'a candidate on another problem is told the session problem and navigates to it',
    run: async () => {
      const network = createNetwork();
      const interviewer = createPeer(network.factory).service;
      await interviewer.start(PROBLEM, STUB, 'https://site.test/practice/7?repo=x');
      const candidate = createPeer(network.factory);
      await candidate.service.join(HOST_ID, OTHER_PROBLEM);
      await settle();

      expect(candidate.service.sharedDoc()?.problem).toBe(PROBLEM);
      expect(candidate.navigate).toHaveBeenCalledWith(['/practice', PROBLEM], { queryParamsHandling: 'preserve' });
    },
  },
  {
    name: 'each side sees the other side name, and a later change',
    run: async () => {
      const network = createNetwork();
      const interviewer = createPeer(network.factory).service;
      const candidate = createPeer(network.factory).service;
      await interviewer.start(PROBLEM, STUB, 'https://site.test/practice/7');
      interviewer.setMyName('  Ada  ');
      expect(candidate.peerName()).toBeNull();
      await candidate.join(HOST_ID, PROBLEM);
      await settle();
      expect(candidate.peerName()).toBe('Ada');

      candidate.setMyName('Grace');
      await settle();
      expect(interviewer.peerName()).toBe('Grace');
    },
  },
  {
    name: 'a connect that never settles errors after the time limit, and a late transport is closed',
    run: async () => {
      vi.useFakeTimers();
      try {
        const lateTransport = { send: vi.fn(), onMessage: vi.fn(), onClose: vi.fn(), close: vi.fn() };
        let settleConnect: (transport: Transport) => void = () => undefined;
        const factory: PeerFactory = {
          host: async () => ({ id: HOST_ID, destroy: () => undefined }),
          connect: () => new Promise<Transport>((resolve) => (settleConnect = resolve)),
        };
        const candidate = createPeer(factory).service;
        void candidate.join(HOST_ID, PROBLEM);
        await vi.advanceTimersByTimeAsync(CONNECT_TIMEOUT_MS - 1);
        expect(candidate.status()).toBe('connecting');
        await vi.advanceTimersByTimeAsync(1);
        expect(candidate.status()).toBe('error');

        settleConnect(lateTransport);
        await vi.advanceTimersByTimeAsync(0);
        expect(lateTransport.close).toHaveBeenCalledTimes(1);
        expect(lateTransport.onMessage).not.toHaveBeenCalled();
      } finally {
        vi.useRealTimers();
      }
    },
  },
  {
    name: 'ending as the interviewer returns the service to its starting state',
    run: async () => {
      const network = createNetwork();
      const interviewer = createPeer(network.factory).service;
      await interviewer.start(PROBLEM, STUB, 'https://site.test/practice/7');
      await createPeer(network.factory).service.join(HOST_ID, PROBLEM);
      await settle();

      interviewer.end();
      expect([interviewer.role(), interviewer.status(), interviewer.sharedDoc(), interviewer.inviteUrl()]).toEqual([
        'none',
        'idle',
        null,
        null,
      ]);
    },
  },
];

describe('InterviewSessionService peer contract', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorage.clear();
    document.body.innerHTML = '';
  });

  it.each(SCENARIOS)('$name', async ({ run }) => {
    await run();
  });
});
