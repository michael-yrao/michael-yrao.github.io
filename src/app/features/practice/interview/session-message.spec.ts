import { SessionMessage, parseSessionMessage } from './session-message';

const UPDATE = { clientID: 'a', changes: [0, [0, 'x']] };

const CASES: readonly { name: string; data: unknown; expected: SessionMessage | null }[] = [
  {
    name: 'init parses',
    data: { type: 'init', problem: 5, version: 2, doc: 'x' },
    expected: { type: 'init', problem: 5, version: 2, doc: 'x' },
  },
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
  { name: 'unknown type is null', data: { type: 'nope' }, expected: null },
  { name: 'missing field is null', data: { type: 'init', problem: 5, doc: 'x' }, expected: null },
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
