import { generateHostKeys } from './host-key';
import { hostPeerIdFromPacked, sessionIdFromPublicKey } from './session-id';

describe('hostPeerIdFromPacked (plan test 1)', () => {
  it('is stable per key, distinct from the session id, and distinct per key', async () => {
    const [first, second] = await Promise.all([generateHostKeys(), generateHostKeys()]);

    const [firstId, firstAgain, secondId, firstSession] = await Promise.all([
      hostPeerIdFromPacked(first.packed),
      hostPeerIdFromPacked(first.packed),
      hostPeerIdFromPacked(second.packed),
      sessionIdFromPublicKey(first.publicRaw),
    ]);

    expect(firstAgain).toBe(firstId);
    expect(firstId).not.toBe(firstSession);
    expect(secondId).not.toBe(firstId);
  });
});
