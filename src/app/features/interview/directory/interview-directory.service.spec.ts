import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';

import { WORKER_API_URL } from '../../../core/data/site-links';
import { HostKeys, generateHostKeys, signProblemAt } from '../session/crypto/host-key';
import { InterviewProblem } from '../session/interview-problem';
import { PreparedEntry } from '../session/store/prepared-store';
import { deriveIds } from '../session/session-support';
import { DirectoryPlaintext, candidateLookupId, deriveInterviewerSecrets, seal } from './directory-crypto';
import { DIRECTORY_ENABLED, InterviewDirectoryService } from './interview-directory.service';

const CANDIDATE_CODE = 'K7QF2M9X';
const INTERVIEWER_CODE = '4TPD8HNW3RXA';
const PUBLIC_RAW = 'B'.repeat(87);
const OFFLINE = 0;
const PROBLEM: InterviewProblem = {
  title: 'Pair sum',
  statement: 'Find a pair.',
  starter: 'stub',
  entry: null,
  compare: 'exact',
  cases: [],
  result: null,
  types: null,
  figure: null,
  source: null,
};

interface Setup {
  readonly service: InterviewDirectoryService;
  readonly http: HttpTestingController;
}

function setup(isEnabled = true): Setup {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), { provide: DIRECTORY_ENABLED, useValue: isEnabled }],
  });
  return { service: TestBed.inject(InterviewDirectoryService), http: TestBed.inject(HttpTestingController) };
}

/** Waits for the one request to `url` (the service derives keys first) and answers it. */
async function answer(http: HttpTestingController, method: string, url: string, status: number, body: object | null): Promise<TestRequest> {
  const request = await vi.waitFor(() => http.expectOne({ method, url: `${WORKER_API_URL}${url}` }));
  if (status === OFFLINE) {
    request.error(new ProgressEvent('error'));
  } else {
    request.flush(body, { status, statusText: String(status) });
  }
  return request;
}

async function preparedEntry(keys: HostKeys): Promise<PreparedEntry> {
  const { sessionId } = await deriveIds(keys);
  const problem = await signProblemAt(keys.privateKey, sessionId, 1, PROBLEM);
  return { packed: keys.packed, problem, createdAt: 1, candidateCode: CANDIDATE_CODE, interviewerCode: INTERVIEWER_CODE, pushedRev: 0 };
}

/** A record body as the server would hold it: `signer` signs the problem, the packed key is `keys`'. */
async function recordBody(keys: HostKeys, signer: HostKeys, rev = 1): Promise<Record<string, unknown>> {
  const { sessionId } = await deriveIds(keys);
  const problem = await signProblemAt(signer.privateKey, sessionId, rev, PROBLEM);
  const plain: DirectoryPlaintext = { v: 1, packed: keys.packed, problem, createdAt: 1, candidateCode: CANDIDATE_CODE };
  const { key } = await deriveInterviewerSecrets(INTERVIEWER_CODE);
  return { v: 1, rev, ...(await seal(key, plain)) };
}

describe('InterviewDirectoryService', () => {
  let keys: HostKeys;
  let otherKeys: HostKeys;
  beforeAll(async () => {
    [keys, otherKeys] = await Promise.all([generateHostKeys(), generateHostKeys()]);
  });
  beforeEach(() => vi.spyOn(console, 'error').mockImplementation(() => undefined));
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
  });

  it.each([
    { status: 200, body: { v: 1, publicRaw: PUBLIC_RAW }, expected: { status: 'found', publicRaw: PUBLIC_RAW } },
    { status: 200, body: { v: 1, publicRaw: 'short' }, expected: { status: 'unreadable' } },
    { status: 200, body: { v: 2, publicRaw: PUBLIC_RAW }, expected: { status: 'unreadable' } },
    { status: 200, body: null, expected: { status: 'unreadable' } },
    { status: 400, body: { error: 'bad-id' }, expected: { status: 'unreadable' } },
    { status: 404, body: { error: 'not-found' }, expected: { status: 'not-found' } },
    { status: 429, body: { error: 'rate-limited' }, expected: { status: 'rate-limited' } },
    { status: 503, body: null, expected: { status: 'offline' } },
    { status: OFFLINE, body: null, expected: { status: 'offline' } },
  ])('lookupCandidate: status $status with $body gives $expected', async ({ status, body, expected }) => {
    const { service, http } = setup();
    const result = service.lookupCandidate(CANDIDATE_CODE);

    await answer(http, 'GET', `interviews/c/${await candidateLookupId(CANDIDATE_CODE)}`, status, body);

    expect(await result).toEqual(expected);
  });

  it.each<{ name: string; status: number; body: () => Promise<object>; expected: { status: string; rev?: number } }>([
    { name: 'a record signed by its own key', status: 200, body: () => recordBody(keys, keys, 3), expected: { status: 'found', rev: 3 } },
    { name: 'a problem signed by another key', status: 200, body: () => recordBody(keys, otherKeys), expected: { status: 'unreadable' } },
    {
      name: 'a revision that is not the problem revision',
      status: 200,
      body: async () => ({ ...(await recordBody(keys, keys, 2)), rev: 5 }),
      expected: { status: 'unreadable' },
    },
    { name: 'a malformed record', status: 200, body: async () => ({ v: 1, rev: 0, iv: 'x', ciphertext: '' }), expected: { status: 'unreadable' } },
    {
      name: 'ciphertext that does not decrypt',
      status: 200,
      body: async () => ({ v: 1, rev: 1, iv: 'A'.repeat(16), ciphertext: 'AAAA' }),
      expected: { status: 'unreadable' },
    },
    { name: 'a deleted record', status: 410, body: async () => ({ error: 'deleted' }), expected: { status: 'deleted' } },
    { name: 'no record', status: 404, body: async () => ({ error: 'not-found' }), expected: { status: 'not-found' } },
  ])('fetchInterviewer: $name', async ({ status, body, expected }) => {
    const { service, http } = setup();
    const result = service.fetchInterviewer(INTERVIEWER_CODE);
    const { lookupId } = await deriveInterviewerSecrets(INTERVIEWER_CODE);

    await answer(http, 'GET', `interviews/i/${lookupId}`, status, await body());

    expect(await result).toMatchObject(expected);
  });

  it.each([
    { status: 201, body: { rev: 1 }, expected: { outcome: 'published', serverRev: 1 } },
    { status: 200, body: { rev: 1 }, expected: { outcome: 'published', serverRev: 1 } },
    { status: 409, body: { error: 'stale', rev: 4 }, expected: { outcome: 'stale', serverRev: 4 } },
    { status: 409, body: { error: 'candidate-taken' }, expected: { outcome: 'candidate-taken' } },
    { status: 409, body: { error: 'immutable' }, expected: { outcome: 'forbidden' } },
    { status: 401, body: { error: 'unauthorized' }, expected: { outcome: 'forbidden' } },
    { status: 403, body: { error: 'forbidden' }, expected: { outcome: 'forbidden' } },
    { status: 413, body: { error: 'too-large' }, expected: { outcome: 'forbidden' } },
    { status: 410, body: { error: 'deleted' }, expected: { outcome: 'deleted' } },
    { status: 429, body: { error: 'rate-limited' }, expected: { outcome: 'rate-limited' } },
    { status: 502, body: null, expected: { outcome: 'offline' } },
    { status: OFFLINE, body: null, expected: { outcome: 'offline' } },
  ])('push: status $status with $body gives $expected', async ({ status, body, expected }) => {
    const { service, http } = setup();
    const entry = await preparedEntry(keys);
    const result = service.push(entry);
    const { lookupId, writeToken } = await deriveInterviewerSecrets(INTERVIEWER_CODE);

    const request = await answer(http, 'PUT', `interviews/i/${lookupId}`, status, body);

    expect(await result).toEqual(expected);
    expect(request.request.headers.get('Authorization')).toBe(`Bearer ${writeToken}`);
    expect(request.request.body).toMatchObject({ v: 1, rev: 1, publicRaw: keys.publicRaw, candidateId: await candidateLookupId(CANDIDATE_CODE) });
  });

  it.each([
    { status: 204, expected: 'removed' },
    { status: 404, expected: 'not-found' },
    { status: 401, expected: 'forbidden' },
    { status: 403, expected: 'forbidden' },
    { status: OFFLINE, expected: 'offline' },
  ])('remove: status $status gives $expected', async ({ status, expected }) => {
    const { service, http } = setup();
    const result = service.remove(INTERVIEWER_CODE);
    const { lookupId, writeToken } = await deriveInterviewerSecrets(INTERVIEWER_CODE);

    const request = await answer(http, 'DELETE', `interviews/i/${lookupId}`, status, null);

    expect(await result).toBe(expected);
    expect(request.request.headers.get('Authorization')).toBe(`Bearer ${writeToken}`);
  });

  it('a disabled directory sends nothing and says so', async () => {
    const { service, http } = setup(false);

    const results = [
      await service.lookupCandidate(CANDIDATE_CODE),
      await service.fetchInterviewer(INTERVIEWER_CODE),
      await service.push(await preparedEntry(keys)),
      await service.remove(INTERVIEWER_CODE),
    ];

    expect(results).toEqual([{ status: 'disabled' }, { status: 'disabled' }, { outcome: 'disabled' }, 'disabled']);
    http.expectNone(() => true);
  });
});
