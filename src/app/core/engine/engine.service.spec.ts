import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { AuthService } from '../auth/auth.service';
import { BuildResult, EngineService } from './engine.service';

const REF = { owner: 'ada', repo: 'cse-progress', branch: 'main' };
const CONFLICT = 409;

describe('EngineService.buildNextWeek', () => {
  it.each<{ code: string; expected: BuildResult }>([
    { code: 'no-config', expected: 'no-config' },
  ])('a 409 $code answers $expected', async ({ code, expected }) => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: { getToken: async () => 'token' } },
      ],
    });
    const http = TestBed.inject(HttpTestingController);
    const pending = TestBed.inject(EngineService).buildNextWeek(REF);
    const req = await vi.waitFor(() => http.expectOne((r) => r.url.endsWith('engine/weekly-build')));
    req.flush({ error: code }, { status: CONFLICT, statusText: 'Conflict' });

    expect(await pending).toBe(expected);
  });
});
