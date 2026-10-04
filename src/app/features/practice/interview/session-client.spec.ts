import type { Mock, Mocked } from 'vitest';

import { HostKeys, createNonce, generateHostKeys, signChallenge, verifyChallenge } from './host-key';
import { Transport } from './peer-transport';
import { ClientConnection, ClientHooks, ClientIdentity } from './session-client';
import { HelloMessage } from './session-message';

const SESSION_ID = 'po-session';

interface FakeTransport extends Transport {
  readonly send: Mock<(message: unknown) => void>;
  readonly close: Mock<() => void>;
  deliver(data: unknown): void;
}

function createFakeTransport(): FakeTransport {
  let messageHandler: (data: unknown) => void = () => undefined;
  return {
    send: vi.fn(),
    onMessage: (handler) => {
      messageHandler = handler;
    },
    onClose: () => undefined,
    close: vi.fn(),
    deliver: (data) => messageHandler(data),
  };
}

function createHooks(): Mocked<ClientHooks> {
  return {
    getName: vi.fn(() => 'Alex'),
    getDoc: vi.fn(() => null),
    onVerified: vi.fn(),
    onInit: vi.fn(),
    onUpdates: vi.fn(),
    onRoster: vi.fn(),
    onEnd: vi.fn(),
    onClosed: vi.fn(),
  };
}

let keys: HostKeys;
let otherKeys: HostKeys;

/** Connects an interviewer client and answers its challenge with a proof signed by `signer`. */
async function connectInterviewer(signer: CryptoKey) {
  const transport = createFakeTransport();
  const hooks = createHooks();
  const identity: ClientIdentity = {
    sessionId: SESSION_ID,
    publicKey: keys.publicKey,
    privateKey: keys.privateKey,
    clientId: 'client-1',
    role: 'interviewer',
  };
  const connection = new ClientConnection(transport, identity, hooks);
  const challenge = transport.send.mock.calls[0][0] as { nonce: string };
  const hostNonce = createNonce();
  const signature = await signChallenge(signer, 'proof', challenge.nonce, SESSION_ID);
  transport.deliver({ type: 'proof', signature, nonce: hostNonce });
  return { connection, transport, hooks, hostNonce };
}

const PROOF_CASES: readonly { name: string; isReal: boolean }[] = [
  { name: 'real host: sends its signed hello', isReal: true },
  { name: 'impostor host (proof signed by another key): closes and sends no hello', isReal: false },
];

describe('ClientConnection', () => {
  beforeAll(async () => {
    keys = await generateHostKeys();
    otherKeys = await generateHostKeys();
  });
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => undefined));
  afterEach(() => vi.restoreAllMocks());

  it.each(PROOF_CASES)('the client after the host\'s proof: $name', async ({ isReal }) => {
    const { transport, hostNonce } = await connectInterviewer(isReal ? keys.privateKey : otherKeys.privateKey);
    await vi.waitFor(() => expect(isReal ? transport.send.mock.calls.length : transport.close.mock.calls.length).toBeGreaterThan(isReal ? 1 : 0));

    const hello = transport.send.mock.calls.map(([message]) => message as { type: string }).find((m) => m.type === 'hello') as
      | HelloMessage
      | undefined;
    expect(hello !== undefined).toBe(isReal);
    expect(transport.close.mock.calls.length > 0).toBe(!isReal);
    if (hello !== undefined) {
      expect(await verifyChallenge(keys.publicKey, 'hello', hostNonce, SESSION_ID, hello.signature ?? '')).toBe(true);
    }
  });
});
