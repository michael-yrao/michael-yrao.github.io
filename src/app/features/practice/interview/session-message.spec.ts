import { Participant, SessionMessage, parseSessionMessage } from './session-message';

const UPDATE = { clientID: 'a', changes: [0, [0, 'x']] };
const NONCE = 'N'.repeat(43);
const SIGNATURE = 'S'.repeat(86);
const PARTICIPANT: Participant = { id: 'c1', role: 'candidate', name: 'Ada' };
const HELLO = { type: 'hello', id: 'c1', role: 'candidate', name: 'Ada', doc: 'x', rev: 3 };

const CASES: readonly { name: string; data: unknown; expected: SessionMessage | null }[] = [
  {
    name: 'init parses',
    data: { type: 'init', problem: 5, version: 2, rev: 7, doc: 'x' },
    expected: { type: 'init', problem: 5, version: 2, rev: 7, doc: 'x' },
  },
  { name: 'init without a rev is null', data: { type: 'init', problem: 5, version: 2, doc: 'x' }, expected: null },
  { name: 'init with a negative rev is null', data: { type: 'init', problem: 5, version: 2, rev: -1, doc: 'x' }, expected: null },
  {
    name: 'push parses',
    data: { type: 'push', version: 1, updates: [UPDATE] },
    expected: { type: 'push', version: 1, updates: [UPDATE] },
  },
  {
    name: 'updates parses',
    data: { type: 'updates', updates: [UPDATE] },
    expected: { type: 'updates', updates: [UPDATE] },
  },
  { name: 'end parses', data: { type: 'end' }, expected: { type: 'end' } },
  { name: 'name parses', data: { type: 'name', name: 'Ada' }, expected: { type: 'name', name: 'Ada' } },
  { name: 'name over the limit after trim is null', data: { type: 'name', name: ` ${'a'.repeat(41)} ` }, expected: null },
  { name: 'non-string name is null', data: { type: 'name', name: 5 }, expected: null },
  { name: 'challenge parses', data: { type: 'challenge', nonce: NONCE }, expected: { type: 'challenge', nonce: NONCE } },
  { name: 'challenge with a short nonce is null', data: { type: 'challenge', nonce: 'N'.repeat(42) }, expected: null },
  {
    name: 'proof parses',
    data: { type: 'proof', signature: SIGNATURE, nonce: NONCE },
    expected: { type: 'proof', signature: SIGNATURE, nonce: NONCE },
  },
  { name: 'proof with a bad signature length is null', data: { type: 'proof', signature: 'S', nonce: NONCE }, expected: null },
  {
    name: 'interviewer hello with a signature parses',
    data: { ...HELLO, role: 'interviewer', doc: null, signature: SIGNATURE },
    expected: { type: 'hello', id: 'c1', role: 'interviewer', name: 'Ada', doc: null, rev: 3, signature: SIGNATURE },
  },
  {
    name: 'candidate hello without a signature parses',
    data: HELLO,
    expected: { type: 'hello', id: 'c1', role: 'candidate', name: 'Ada', doc: 'x', rev: 3 },
  },
  { name: 'hello without a rev is null', data: { ...HELLO, rev: undefined }, expected: null },
  { name: 'hello with a negative rev is null', data: { ...HELLO, rev: -1 }, expected: null },
  { name: 'hello with a bad signature is null', data: { ...HELLO, signature: 'S' }, expected: null },
  { name: 'hello with a bad role is null', data: { ...HELLO, role: 'admin' }, expected: null },
  { name: 'hello with an overlong id is null', data: { ...HELLO, id: 'i'.repeat(65) }, expected: null },
  { name: 'hello with a non-string doc is null', data: { ...HELLO, doc: 5 }, expected: null },
  { name: 'the old hello with only a doc is null', data: { type: 'hello', doc: 'x' }, expected: null },
  {
    name: 'roster parses',
    data: { type: 'roster', participants: [PARTICIPANT] },
    expected: { type: 'roster', participants: [PARTICIPANT] },
  },
  { name: 'roster with a bad participant is null', data: { type: 'roster', participants: [{ ...PARTICIPANT, id: '' }] }, expected: null },
  { name: 'unknown type is null', data: { type: 'nope' }, expected: null },
  { name: 'missing field is null', data: { type: 'init', problem: 5, rev: 0, doc: 'x' }, expected: null },
  {
    name: 'wrong field type is null',
    data: { type: 'push', version: '1', updates: [UPDATE] },
    expected: null,
  },
  { name: 'non-object is null', data: 'hi', expected: null },
];

describe('parseSessionMessage', () => {
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => undefined));
  afterEach(() => vi.restoreAllMocks());

  it.each(CASES)('$name', ({ data, expected }) => {
    expect(parseSessionMessage(data)).toEqual(expected);
  });
});
