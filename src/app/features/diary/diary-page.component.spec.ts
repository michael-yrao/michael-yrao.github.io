import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { AuthService } from '../../core/auth/auth.service';
import { COACH_OWNER_LOGIN } from '../../core/data/site-links';
import { DiaryEntry, DiaryViewsResponse } from './diary-contract';
import { DiaryPageComponent } from './diary-page.component';

const ENTRIES: DiaryEntry[] = [
  { id: 'e2', date: '2026-02-01', title: 'Lorem title', body: '## Lorem one\n\nIpsum dolor sit amet.\n\nConsectetur.', updatedAt: '2026-02-01T00:00:00Z' },
  { id: 'e1', date: '2026-01-01', title: 'Sed title', body: 'Sed do eiusmod.', updatedAt: '2026-01-01T00:00:00Z' },
];
const VIEWS: DiaryViewsResponse = {
  views: [
    { at: '2026-01-02T03:04:05Z', city: 'Lorem', country: 'Ipsum', device: 'Dolor', read: ['e1', 'gone', 'e2'] },
    { at: '2026-01-03T03:04:05Z', city: '', country: 'Sit', device: 'Amet', read: [] },
  ],
  backupAt: null,
};

function reply(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

/** Routes the page's fetches by method and path; `overrides` replaces a route's response. */
function routeFetch(overrides: Record<string, Response> = {}) {
  return vi.fn(async (url: string, init?: RequestInit) => {
    const key = `${init?.method ?? 'GET'} ${url.split('diary/')[1]}`;
    if (key in overrides) return overrides[key];
    if (key === 'POST unlock') return reply({ visitId: 'v1', entries: ENTRIES });
    if (key === 'GET entries') return reply({ entries: ENTRIES });
    if (key === 'GET views') return reply(VIEWS);
    return new Response(null, { status: 204 });
  });
}

async function settle(fixture: ComponentFixture<DiaryPageComponent>): Promise<void> {
  await fixture.whenStable();
  await new Promise((resolve) => setTimeout(resolve));
  fixture.detectChanges();
}

async function setup(login: string | null): Promise<ComponentFixture<DiaryPageComponent>> {
  TestBed.configureTestingModule({
    providers: [{ provide: AuthService, useValue: { login: signal(login), getToken: async () => 'tok' } }],
  });
  const fixture = TestBed.createComponent(DiaryPageComponent);
  fixture.detectChanges();
  await settle(fixture);
  return fixture;
}

async function submit(fixture: ComponentFixture<DiaryPageComponent>): Promise<void> {
  const el: HTMLElement = fixture.nativeElement;
  el.querySelector<HTMLInputElement>('input')!.value = 'secret';
  el.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
  await settle(fixture);
}

async function click(fixture: ComponentFixture<DiaryPageComponent>, selector: string): Promise<void> {
  (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(selector)!.click();
  await settle(fixture);
}

describe('DiaryPageComponent', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows the wrong-password message and no entries on a 401', async () => {
    vi.stubGlobal('fetch', routeFetch({ 'POST unlock': reply({}, 401) }));
    const fixture = await setup(null);
    await submit(fixture);

    expect(fixture.nativeElement.textContent).toContain('Wrong password');
    expect(fixture.nativeElement.querySelector('article')).toBeNull();
  });

  it('renders the entries on unlock, a "## " paragraph as a heading', async () => {
    vi.stubGlobal('fetch', routeFetch());
    const fixture = await setup(null);
    await submit(fixture);

    const el: HTMLElement = fixture.nativeElement;
    expect([...el.querySelectorAll('h1')].map((h) => h.textContent)).toEqual(['Lorem title', 'Sed title']);
    expect([...el.querySelectorAll('h2')].map((h) => h.textContent)).toEqual(['Lorem one']);
    expect(el.querySelectorAll('p').length).toBe(3);
  });

  it.each([
    { name: 'signed out', login: null, isOwner: false },
    { name: 'a non-owner', login: 'someone-else', isOwner: false },
    { name: 'the owner', login: COACH_OWNER_LOGIN, isOwner: true },
  ])('owner controls and views for $name', async ({ login, isOwner }) => {
    const fetchMock = routeFetch();
    vi.stubGlobal('fetch', fetchMock);
    const fixture = await setup(login);
    if (!isOwner) await submit(fixture);

    const el: HTMLElement = fixture.nativeElement;
    for (const label of ['New entry', 'Edit', 'Delete']) {
      expect(el.querySelector(`button[aria-label="${label}"]`) !== null).toBe(isOwner);
    }
    expect(el.querySelector('.views') !== null).toBe(isOwner);
    if (isOwner) {
      expect(el.querySelector('input[type="password"]')).toBeNull();
      expect(el.querySelector('.views__count')?.textContent).toBe('2');
      expect(el.querySelector('.views__backup')?.textContent).toBe('Not backed up');
      expect(el.querySelectorAll('article').length).toBe(2);
    }
  });

  it('maps read ids to titles and skips a deleted id', async () => {
    vi.stubGlobal('fetch', routeFetch());
    const fixture = await setup(COACH_OWNER_LOGIN);

    const cells = fixture.nativeElement.querySelectorAll('tbody tr:first-child td');
    expect(cells[3].textContent).toBe('Sed title · Lorem title');
  });

  it('needs two clicks to delete an entry', async () => {
    const fetchMock = routeFetch();
    vi.stubGlobal('fetch', fetchMock);
    const fixture = await setup(COACH_OWNER_LOGIN);
    const isDelete = (call: unknown[]) => (call[1] as RequestInit | undefined)?.method === 'DELETE';

    await click(fixture, 'button[aria-label="Delete"]');
    expect(fetchMock.mock.calls.some(isDelete)).toBe(false);
    expect(fixture.nativeElement.querySelector('button[aria-label="Confirm delete"]')).not.toBeNull();

    await click(fixture, 'button[aria-label="Confirm delete"]');
    expect(fetchMock.mock.calls.filter(isDelete).length).toBe(1);
    expect(fixture.nativeElement.querySelectorAll('article').length).toBe(1);
  });

  it('shows "Couldn\'t save." when a save fails', async () => {
    vi.stubGlobal('fetch', routeFetch({ 'POST entries': reply({}, 500) }));
    const fixture = await setup(COACH_OWNER_LOGIN);

    await click(fixture, 'button[aria-label="New entry"]');
    fixture.nativeElement.querySelector('textarea').value = 'Lorem';
    await click(fixture, 'button[aria-label="Save"]');

    expect(fixture.nativeElement.textContent).toContain("Couldn't save.");
    expect(fixture.nativeElement.querySelector('textarea')).not.toBeNull();
  });
});
