import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { computed, signal } from '@angular/core';
import { vi } from 'vitest';

import { WORKER_API_URL } from '../../../core/data/site-links';
import { PatternSenseData } from '../../../core/models/pattern-sense.model';
import { GITHUB_APP_CONFIG } from '../../../core/pattern-sense/github-save';
import { RepoRef } from '../../../core/services/github-file.service';
import { AUTH_KEY, PENDING_KEY } from '../../../core/services/github-save.service';
import { PatternSenseService } from '../../../core/services/pattern-sense.service';
import { PatternSenseComponent } from './pattern-sense.component';

const ROUTES_URL = `${WORKER_API_URL}pattern-sense/`;
const APP_SLUG = 'pattern-sense';
const WEEK = '2026-11-30';
const CODE = `PS1 ${WEEK} abc123 1004:+/+`;
const SAVE_BUTTON = 'Save to GitHub';
const FAILED_TEXT = 'Save failed — copy the code instead';
const INSTALL_TEXT = 'Allow Pattern Sense to save to this repo';
const SIGN_IN_STATE = 'state-1';
const SIGN_IN_FAILED_TEXT ='Sign-in failed — try again';
const REPO: RepoRef = { owner: 'someone', repo: 'their-repo', branch: 'dev' };

const DECK: PatternSenseData = {
  schemaVersion: 1,
  generatedAt: '2026-10-18',
  week: WEEK,
  vocabHash: 'abc123',
  families: [{ id: 'sliding_window', techniques: ['Variable Window'] }],
  problems: [
    {
      lcNumber: 1004,
      prompt: 'p',
      constraints: [],
      family: 'sliding_window',
      technique: 'Variable Window',
      cue: 'c',
    },
  ],
};

interface Row {
  readonly name: string;
  readonly login: string;
  readonly isAuthorFallback: boolean;
  /** Worker reply to Save: null = the button is never offered. */
  readonly reply: { status: number; body: object } | null;
  readonly expectText: string | null;
  readonly expectInstallHref: string | null;
  /** Returning from GitHub with a code whose Worker exchange fails. */
  readonly signInFailure?: boolean;
}

const ROWS: readonly Row[] = [
  {
    name: 'non-owner signed in: no Save button',
    login: 'visitor',
    isAuthorFallback: false,
    reply: null,
    expectText: null,
    expectInstallHref: null,
  },
  {
    name: "author's fallback deck: no Save button",
    login: 'someone',
    isAuthorFallback: true,
    reply: null,
    expectText: null,
    expectInstallHref: null,
  },
  {
    name: 'not installed: the install link',
    login: 'Someone',
    isAuthorFallback: false,
    reply: { status: 409, body: { error: 'not-installed' } },
    expectText: INSTALL_TEXT,
    expectInstallHref: `https://github.com/apps/${APP_SLUG}/installations/new`,
  },
  {
    name: 'Worker failure: the failure line, code still on screen',
    login: 'someone',
    isAuthorFallback: false,
    reply: { status: 500, body: { error: 'github-error' } },
    expectText: FAILED_TEXT,
    expectInstallHref: null,
  },
  {
    name: 'token exchange fails after the GitHub return: the sign-in failure line',
    login: '',
    isAuthorFallback: false,
    reply: { status: 502, body: { error: 'exchange-failed' } },
    expectText: SIGN_IN_FAILED_TEXT,
    expectInstallHref: null,
    signInFailure: true,
  },
];

function buttonByText(root: HTMLElement, text: string): HTMLButtonElement | undefined {
  return Array.from(root.querySelectorAll('button')).find((b) => b.textContent?.trim() === text);
}

async function render(
  row: Row,
): Promise<{ fixture: ComponentFixture<PatternSenseComponent>; httpMock: HttpTestingController }> {
  if (row.signInFailure) {
    sessionStorage.setItem(
      PENDING_KEY,
      JSON.stringify({ state: SIGN_IN_STATE, repo: 'someone/their-repo@dev', week: WEEK }),
    );
  } else {
    sessionStorage.setItem(AUTH_KEY, JSON.stringify({ token: 'ghu_secret', login: row.login }));
  }
  localStorage.setItem(`po-pattern-sense-week-${WEEK}`, CODE);
  const patternSense = {
    status: signal('ready'),
    data: signal(DECK),
    sourceRef: signal(REPO),
    isAuthorFallback: computed(() => row.isAuthorFallback),
    load: () => undefined,
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([]),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: PatternSenseService, useValue: patternSense },
      {
        provide: GITHUB_APP_CONFIG,
        useValue: { clientId: 'Iv1.test', appSlug: APP_SLUG },
      },
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: {
            queryParamMap: convertToParamMap(
              row.signInFailure ? { deck: 'week', code: 'c', state: SIGN_IN_STATE } : { deck: 'week' },
            ),
          },
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(PatternSenseComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return { fixture, httpMock: TestBed.inject(HttpTestingController) };
}

/**
 * Node's own `localStorage` is one file shared by every parallel test worker, so another spec's
 * `clear()` can wipe the seeded week code mid-test. A private in-memory store keeps this file's reads its own.
 */
function createMemoryStorage(): Storage {
  const entries = new Map<string, string>();
  return {
    get length(): number {
      return entries.size;
    },
    clear: () => entries.clear(),
    getItem: (key) => entries.get(key) ?? null,
    key: (index) => Array.from(entries.keys())[index] ?? null,
    removeItem: (key) => void entries.delete(key),
    setItem: (key, value) => void entries.set(key, String(value)),
  };
}

describe('PatternSenseComponent save to GitHub', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createMemoryStorage());
  });

  afterEach(() => {
    sessionStorage.clear();
    vi.unstubAllGlobals();
  });

  it.each(ROWS)('$name', async (row) => {
    const { fixture, httpMock } = await render(row);
    const root: HTMLElement = fixture.nativeElement;
    const save = buttonByText(root, SAVE_BUTTON);

    if (row.reply === null) {
      expect(root.textContent).toContain(CODE); // the end screen did render
      expect(save).toBeUndefined();
      return;
    }

    if (row.signInFailure) {
      httpMock
        .expectOne(`${ROUTES_URL}token`)
        .flush(row.reply.body, { status: row.reply.status, statusText: 'x' });
    } else {
      save?.click();
      httpMock
        .expectOne(`${ROUTES_URL}save`)
        .flush(row.reply.body, { status: row.reply.status, statusText: 'x' });
    }
    await fixture.whenStable();
    fixture.detectChanges();

    expect(root.textContent).toContain(row.expectText);
    expect(root.textContent).toContain(CODE);
    const link = root.querySelector<HTMLAnchorElement>('.ps-save a');
    expect(link?.getAttribute('href') ?? null).toBe(row.expectInstallHref);
  });
});
