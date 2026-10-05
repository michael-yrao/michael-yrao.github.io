import { HostKeys, generateHostKeys, createNonce, parsePackedKey, parsePublicKey, signChallenge, signProblem, verifyChallenge, verifyProblem } from './host-key';
import { InterviewProblem } from './interview-problem';

const SESSION_ID = 'po-abc';
const OTHER_SESSION_ID = 'po-xyz';
const PACKED_LENGTH = 128;
const POINT_LENGTH = 87;
const COORDINATE_LENGTH = 43;

let keys: HostKeys;
let otherKeys: HostKeys;

/** `?host=` with a real d paired to another key's x,y. */
function mismatchedPacked(): string {
  return keys.packed.slice(0, COORDINATE_LENGTH) + otherKeys.packed.slice(COORDINATE_LENGTH);
}

const SIGNED_REV = 2;
const PROBLEM: InterviewProblem = {
  title: 'Pair sum',
  statement: 'Find a pair.',
  starter: '',
  entry: null,
  compare: 'exact',
  cases: [],
  result: null,
  types: null,
  figure: null,
  source: null,
};
const PROBLEM_JSON = JSON.stringify(PROBLEM);

/** Signs the problem at `SIGNED_REV` for `SESSION_ID`, then verifies what is `presented` under `sessionId`. */
async function isProblemAccepted(presented: { rev?: number; json?: string } = {}, sessionId = SESSION_ID): Promise<boolean> {
  const signature = await signProblem(keys.privateKey, SESSION_ID, SIGNED_REV, PROBLEM_JSON);
  const signed = { rev: presented.rev ?? SIGNED_REV, json: presented.json ?? PROBLEM_JSON, signature };
  return (await verifyProblem(keys.publicKey, sessionId, signed)) !== null;
}

const VERIFY_CASES: readonly { name: string; isExpected: boolean; run: () => Promise<boolean> }[] = [
  {
    name: 'a packed key round-trips to the same public key and signs verifiably',
    isExpected: true,
    run: async () => {
      const parsed = await parsePackedKey(keys.packed);
      const nonce = createNonce();
      const signature = await signChallenge(parsed!.privateKey, 'proof', nonce, SESSION_ID);
      return parsed!.publicRaw === keys.publicRaw && (await verifyChallenge(keys.publicKey, 'proof', nonce, SESSION_ID, signature));
    },
  },
  {
    name: 'a signature from the right key passes',
    isExpected: true,
    run: async () => {
      const nonce = createNonce();
      const signature = await signChallenge(keys.privateKey, 'hello', nonce, SESSION_ID);
      return verifyChallenge(keys.publicKey, 'hello', nonce, SESSION_ID, signature);
    },
  },
  {
    name: 'a wrong key fails',
    isExpected: false,
    run: async () => {
      const nonce = createNonce();
      const signature = await signChallenge(otherKeys.privateKey, 'proof', nonce, SESSION_ID);
      return verifyChallenge(keys.publicKey, 'proof', nonce, SESSION_ID, signature);
    },
  },
  {
    name: 'a tampered signature fails',
    isExpected: false,
    run: async () => {
      const nonce = createNonce();
      const signature = await signChallenge(keys.privateKey, 'proof', nonce, SESSION_ID);
      const tampered = (signature[0] === 'A' ? 'B' : 'A') + signature.slice(1);
      return verifyChallenge(keys.publicKey, 'proof', nonce, SESSION_ID, tampered);
    },
  },
  {
    name: 'a wrong session id fails',
    isExpected: false,
    run: async () => {
      const nonce = createNonce();
      const signature = await signChallenge(keys.privateKey, 'proof', nonce, SESSION_ID);
      return verifyChallenge(keys.publicKey, 'proof', nonce, OTHER_SESSION_ID, signature);
    },
  },
  { name: 'a problem signed with the session key passes', isExpected: true, run: () => isProblemAccepted() },
  { name: 'a problem under another session id fails', isExpected: false, run: () => isProblemAccepted({}, OTHER_SESSION_ID) },
  { name: 'a problem presented at another revision fails', isExpected: false, run: () => isProblemAccepted({ rev: SIGNED_REV + 1 }) },
  { name: 'a problem with altered JSON fails', isExpected: false, run: () => isProblemAccepted({ json: JSON.stringify({ ...PROBLEM, title: 'Other' }) }) },
];

const MALFORMED_CASES: readonly { name: string; run: () => Promise<unknown> }[] = [
  { name: 'packed key of the wrong length', run: () => parsePackedKey('A'.repeat(PACKED_LENGTH - 1)) },
  { name: 'packed key with a non-base64url char', run: () => parsePackedKey('+'.repeat(PACKED_LENGTH)) },
  { name: 'packed key whose d does not match x,y', run: () => parsePackedKey(mismatchedPacked()) },
  { name: 'public key of the wrong length', run: () => parsePublicKey('A'.repeat(POINT_LENGTH - 1)) },
  { name: 'public key with a bad prefix and point', run: () => parsePublicKey('A'.repeat(POINT_LENGTH)) },
];

describe('host key', () => {
  beforeAll(async () => {
    keys = await generateHostKeys();
    otherKeys = await generateHostKeys();
  });
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => undefined));
  afterEach(() => vi.restoreAllMocks());

  it.each(VERIFY_CASES)('$name', async ({ isExpected, run }) => {
    expect(await run()).toBe(isExpected);
  });

  it.each(MALFORMED_CASES)('rejects $name', async ({ run }) => {
    expect(await run()).toBeNull();
  });
});
