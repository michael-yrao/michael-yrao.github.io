import { decodeBase64Url, encodeBase64Url } from '../session/host-key';
import { SignedProblem } from '../session/interview-problem';
import { InterviewSchedule } from '../session/interview-schedule';
import { DirectoryPlaintext, InterviewerSecrets, Sealed, candidateLookupId, deriveInterviewerSecrets, seal, unseal } from './directory-crypto';

/** Known answers, computed once with an independent script: they pin the derivation strings and sizes. */
const CANDIDATE_CODE = 'K7QF2M9X';
const CANDIDATE_LOOKUP_ID = 'Jo5mAa5dy22B-_80r9clgZizI2VvuZOu';
const INTERVIEWER_CODE = '4TPD8HNW3RXA';
const INTERVIEWER_LOOKUP_ID = 'noGJsr2bGkXNfJRyd8__o9fdwl3OWeTp';
const INTERVIEWER_WRITE_TOKEN = 'Otv2M37yA9ZARhip5f62vot2wKJrlJkd4VCcODXAl6g';
const OTHER_INTERVIEWER_CODE = '4TPD8HNW3RXB';

const SIGNED: SignedProblem = { rev: 1, json: '{"title":"naïve ✓"}', signature: 'S'.repeat(86) };
const PLAIN: DirectoryPlaintext = { v: 1, packed: 'PACKED', problem: SIGNED, createdAt: 1_700_000_000_000, candidateCode: CANDIDATE_CODE };
const SCHEDULE: InterviewSchedule = {
  problemId: 'problem-1',
  scheduledAt: 1_800_000_000_000,
  durationMin: 45,
  candidateName: 'Ada',
  candidateEmail: '',
  interviewerName: 'Grace',
  notes: 'Graphs.',
};

function flipFirstByte(text: string): string {
  const bytes = decodeBase64Url(text);
  bytes[0] ^= 1;
  return encodeBase64Url(bytes);
}

describe('directory crypto', () => {
  let secrets: InterviewerSecrets;
  let otherSecrets: InterviewerSecrets;

  beforeAll(async () => {
    [secrets, otherSecrets] = await Promise.all([deriveInterviewerSecrets(INTERVIEWER_CODE), deriveInterviewerSecrets(OTHER_INTERVIEWER_CODE)]);
  });

  it('derives the known candidate lookup id, interviewer lookup id and write token', async () => {
    expect(await candidateLookupId(CANDIDATE_CODE)).toBe(CANDIDATE_LOOKUP_ID);
    expect(secrets.lookupId).toBe(INTERVIEWER_LOOKUP_ID);
    expect(secrets.writeToken).toBe(INTERVIEWER_WRITE_TOKEN);
  });

  it('a sealed plaintext opens to itself, and two seals of it differ in nonce', async () => {
    const [first, second] = await Promise.all([seal(secrets.key, PLAIN), seal(secrets.key, PLAIN)]);

    expect(await unseal(secrets.key, first)).toEqual(PLAIN);
    expect(first.iv).not.toBe(second.iv);
  });

  it.each<{ name: string; schedule: unknown; expected: DirectoryPlaintext }>([
    { name: 'a schedule survives seal and unseal', schedule: SCHEDULE, expected: { ...PLAIN, schedule: SCHEDULE } },
    { name: 'a malformed schedule is dropped and the plaintext still returned', schedule: { ...SCHEDULE, durationMin: 1 }, expected: PLAIN },
  ])('$name', async ({ schedule, expected }) => {
    const sealed = await seal(secrets.key, { ...PLAIN, schedule } as DirectoryPlaintext);

    expect(await unseal(secrets.key, sealed)).toEqual(expected);
  });

  it('unseal gives null for anything but the sealed bytes under the sealing key', async () => {
    const sealed = await seal(secrets.key, PLAIN);
    const wrongShape = await seal(secrets.key, { ...PLAIN, createdAt: 'later' } as unknown as DirectoryPlaintext);
    const cases: readonly { name: string; key: CryptoKey; sealed: Sealed }[] = [
      { name: 'wrong key', key: otherSecrets.key, sealed },
      { name: 'flipped ciphertext byte', key: secrets.key, sealed: { ...sealed, ciphertext: flipFirstByte(sealed.ciphertext) } },
      { name: 'flipped nonce', key: secrets.key, sealed: { ...sealed, iv: flipFirstByte(sealed.iv) } },
      { name: 'truncated ciphertext', key: secrets.key, sealed: { ...sealed, ciphertext: sealed.ciphertext.slice(0, -8) } },
      { name: 'empty ciphertext', key: secrets.key, sealed: { ...sealed, ciphertext: '' } },
      { name: 'short nonce', key: secrets.key, sealed: { ...sealed, iv: sealed.iv.slice(1) } },
      { name: 'right bytes, wrong plaintext shape', key: secrets.key, sealed: wrongShape },
    ];

    const results = await Promise.all(cases.map(({ key, sealed: input }) => unseal(key, input)));

    expect(results.map((result, index) => [cases[index].name, result])).toEqual(cases.map(({ name }) => [name, null]));
  });
});
