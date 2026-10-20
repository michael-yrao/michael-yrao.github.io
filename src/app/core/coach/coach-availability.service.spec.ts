import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { AuthService } from '../auth/auth.service';
import { COACH_OWNER_LOGIN } from '../data/site-links';
import { CoachAvailabilityService } from './coach-availability.service';

const ASLEEP = { awake: false, busy: false, sessionId: null, repoHead: null, dirty: false, sessionCostUsd: 0 };

interface Row {
  readonly name: string;
  readonly login: string;
  readonly response: () => Promise<Response>;
  readonly isAvailable: boolean;
  readonly isFetched: boolean;
}

const json = (body: unknown) => async () => new Response(JSON.stringify(body), { status: 200 });

const ROWS: readonly Row[] = [
  { name: 'owner, enabled absent', login: COACH_OWNER_LOGIN, response: json(ASLEEP), isAvailable: true, isFetched: true },
  {
    name: 'owner, enabled true',
    login: COACH_OWNER_LOGIN,
    response: json({ ...ASLEEP, enabled: true }),
    isAvailable: true,
    isFetched: true,
  },
  {
    name: 'owner, enabled false',
    login: COACH_OWNER_LOGIN,
    response: json({ ...ASLEEP, enabled: false }),
    isAvailable: false,
    isFetched: true,
  },
  { name: 'not the owner', login: 'someone-else', response: json(ASLEEP), isAvailable: false, isFetched: false },
  {
    name: 'a fetch that rejects',
    login: COACH_OWNER_LOGIN,
    response: () => Promise.reject(new Error('offline')),
    isAvailable: false,
    isFetched: true,
  },
];

describe('CoachAvailabilityService', () => {
  afterEach(() => vi.unstubAllGlobals());

  it.each(ROWS)('$name', async ({ login, response, isAvailable, isFetched }) => {
    const fetchMock = vi.fn(response);
    vi.stubGlobal('fetch', fetchMock);
    TestBed.configureTestingModule({
      providers: [{ provide: AuthService, useValue: { login: signal(login), getToken: async () => 'tok' } }],
    });
    const service = TestBed.inject(CoachAvailabilityService);

    TestBed.tick();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(isFetched ? 1 : 0));
    await new Promise((resolve) => setTimeout(resolve));

    expect(service.available()).toBe(isAvailable);
  });
});
