import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
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
    if (key === 'GET views') return reply(VIEWS);
    return new Response(null, { status: 204 });
  });
}

async function settle(fixture: ComponentFixture<DiaryPageComponent>): Promise<void> {
  await fixture.whenStable();
  await new Promise((resolve) => setTimeout(resolve));
  fixture.detectChanges();
}

/** A page whose real router starts with the `entry` and `tab` query params set; `navigate` is spied. */
async function setup(
  login: string | null,
  entryParam: string | null = null,
  tabParam: string | null = null,
): Promise<ComponentFixture<DiaryPageComponent>> {
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthService, useValue: { login: signal(login), getToken: async () => 'tok' } },
      provideRouter([]),
    ],
  });
  const router = TestBed.inject(Router);
  if (entryParam !== null || tabParam !== null) {
    await router.navigate([], { queryParams: { entry: entryParam, tab: tabParam } });
  }
  vi.spyOn(router, 'navigate');
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

async function openMenu(fixture: ComponentFixture<DiaryPageComponent>): Promise<void> {
  await click(fixture, '.tabs button[aria-haspopup="menu"]');
}

/** A menu item's accessible name: its aria-label (a titled entry), else its text. */
function itemName(item: Element): string | undefined {
  return item.getAttribute('aria-label') ?? item.textContent?.trim();
}

async function chooseItem(fixture: ComponentFixture<DiaryPageComponent>, text: string): Promise<void> {
  const items = [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('[role="menuitem"]')];
  items.find((item) => itemName(item) === text)!.click();
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

  it('renders the open entry on unlock, a "## " paragraph as a heading', async () => {
    vi.stubGlobal('fetch', routeFetch());
    const fixture = await setup(null, 'e2');
    await submit(fixture);

    const el: HTMLElement = fixture.nativeElement;
    expect([...el.querySelectorAll('h1')].map((h) => h.textContent)).toEqual(['Lorem title']);
    expect([...el.querySelectorAll('h2')].map((h) => h.textContent)).toEqual(['Lorem one']);
    expect(el.querySelectorAll('p').length).toBe(2);
  });

  it('renders a list and bold as li and strong, and typed HTML as literal text', async () => {
    const marked: DiaryEntry = { ...ENTRIES[0], body: '- one\n- two\n\nA **bold** word <b>x</b>' };
    vi.stubGlobal('fetch', routeFetch({ 'POST unlock': reply({ visitId: 'v1', entries: [marked] }) }));
    const fixture = await setup(null, 'e2');
    await submit(fixture);

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelectorAll('li').length).toBe(2);
    expect(el.querySelector('strong')?.textContent).toBe('bold');
    expect(el.querySelector('b')).toBeNull();
    expect(el.querySelector('p')?.textContent).toBe('A bold word <b>x</b>');
  });

  it('the Formatting button flips aria-expanded and shows or hides the five key rows', async () => {
    vi.stubGlobal('fetch', routeFetch());
    const fixture = await setup(COACH_OWNER_LOGIN, 'e2');
    await submit(fixture);
    await click(fixture, 'button[aria-label="Edit"]');
    const el: HTMLElement = fixture.nativeElement;
    const button = el.querySelector('button[aria-label="Formatting"]')!;
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(el.querySelector('.editor__key')).toBeNull();

    await click(fixture, 'button[aria-label="Formatting"]');
    expect(button.getAttribute('aria-expanded')).toBe('true');
    expect(el.querySelectorAll('.editor__key dt').length).toBe(5);

    await click(fixture, 'button[aria-label="Formatting"]');
    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(el.querySelector('.editor__key')).toBeNull();
  });

  it.each([
    { name: 'a known id', param: 'e1', title: 'Sed title' },
    { name: 'an unknown id', param: 'gone', title: undefined },
    { name: 'no id', param: null, title: undefined },
  ])('opens the right view for $name in the query param', async ({ param, title }) => {
    vi.stubGlobal('fetch', routeFetch());
    const fixture = await setup(null, param);
    await submit(fixture);

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('h1')?.textContent).toBe(title);
    expect(el.querySelector('.home') !== null).toBe(title === undefined);
  });

  it.each([
    { name: 'the owner', login: COACH_OWNER_LOGIN, items: ['Diaries', 'Lorem title', 'Sed title', 'Audit'], hasSeparator: true },
    { name: 'a reader', login: null, items: ['Diaries', 'Lorem title', 'Sed title'], hasSeparator: false },
  ])('the menu for $name lists $items', async ({ login, items, hasSeparator }) => {
    vi.stubGlobal('fetch', routeFetch());
    const fixture = await setup(login);
    await submit(fixture);
    await openMenu(fixture);

    const el: HTMLElement = fixture.nativeElement;
    expect([...el.querySelectorAll('[role="menuitem"]')].map(itemName)).toEqual(items);
    expect(el.querySelector('[role="separator"]') !== null).toBe(hasSeparator);
    expect(el.querySelector('[role="tablist"]')).toBeNull();
  });

  it('shows a titled item\'s date under its title, and an untitled item\'s date once', async () => {
    const untitled: DiaryEntry = { ...ENTRIES[1], id: 'e0', date: '2025-12-01', title: '' };
    vi.stubGlobal('fetch', routeFetch({ 'POST unlock': reply({ visitId: 'v1', entries: [ENTRIES[0], untitled] }) }));
    const fixture = await setup(COACH_OWNER_LOGIN);
    await submit(fixture);
    await openMenu(fixture);

    const [titled, bare] = [...fixture.nativeElement.querySelectorAll('[role="menuitem"]')].slice(1, 3) as HTMLElement[];
    expect(titled.getAttribute('aria-label')).toBe('Lorem title');
    expect(titled.querySelector('.entry-item__title')?.textContent).toBe('Lorem title');
    expect(titled.querySelector('.entry-item__date')?.textContent).toBe('2026-02-01');
    expect(bare.getAttribute('aria-label')).toBeNull();
    expect(bare.querySelector('.entry-item__title')).toBeNull();
    expect(bare.querySelectorAll('.entry-item__date').length).toBe(1);
    expect(bare.textContent?.trim()).toBe('2025-12-01');
  });

  it.each([
    { item: 'Diaries', queryParams: { entry: null, tab: null } },
    { item: 'Sed title', queryParams: { entry: 'e1', tab: null } },
    { item: 'Audit', queryParams: { entry: null, tab: 'audit' } },
  ])('the "$item" menu item navigates to $queryParams', async ({ item, queryParams }) => {
    vi.stubGlobal('fetch', routeFetch());
    const fixture = await setup(COACH_OWNER_LOGIN, 'e2');
    await submit(fixture);
    await openMenu(fixture);

    await chooseItem(fixture, item);

    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams, replaceUrl: true }),
    );
  });

  it.each([
    { name: 'the owner', login: COACH_OWNER_LOGIN, hasTable: true },
    { name: 'a non-owner', login: 'someone-else', hasTable: false },
  ])('?tab=audit for $name', async ({ login, hasTable }) => {
    vi.stubGlobal('fetch', routeFetch());
    const fixture = await setup(login, null, 'audit');
    await submit(fixture);

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.views table') !== null).toBe(hasTable);
    expect(el.querySelector('.home') !== null).toBe(!hasTable);
    if (hasTable) {
      expect(el.querySelector('.views__count')?.textContent).toBe('2');
      expect(el.querySelector('.views__backup')?.textContent).toBe('Not backed up');
    }
  });

  it.each([
    { name: 'signed out', login: null, hasTableAfter: false },
    { name: 'a non-owner', login: 'someone-else', hasTableAfter: false },
    { name: 'the owner', login: COACH_OWNER_LOGIN, hasTableAfter: true },
  ])('asks for the password before anything for $name, even with ?tab=audit', async ({ login, hasTableAfter }) => {
    const fetchMock = routeFetch();
    vi.stubGlobal('fetch', fetchMock);
    const fixture = await setup(login, null, 'audit');

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('input[type="password"]')).not.toBeNull();
    expect(el.querySelector('.tabs')).toBeNull();
    expect(el.querySelector('.home')).toBeNull();
    expect(el.querySelector('article')).toBeNull();
    expect(el.querySelector('.views')).toBeNull();
    expect(fetchMock.mock.calls.some(([url]) => /diary\/(entries|views)$/.test(url))).toBe(false);

    await submit(fixture);
    expect(el.querySelector('.views table') !== null).toBe(hasTableAfter);
  });

  it('lists a link per entry on home, with no body text', async () => {
    vi.stubGlobal('fetch', routeFetch());
    const fixture = await setup(null);
    await submit(fixture);

    const el: HTMLElement = fixture.nativeElement;
    const links = [...el.querySelectorAll<HTMLAnchorElement>('.home a')];
    expect(links.map((link) => new URL(link.href).searchParams.get('entry'))).toEqual(['e2', 'e1']);
    expect(links.map((link) => link.textContent?.trim())).toEqual(['2026-02-01Lorem title', '2026-01-01Sed title']);
    expect(el.querySelector('article')).toBeNull();
    expect(el.textContent).not.toContain('Sed do eiusmod');
  });

  it('opens a newly saved entry', async () => {
    const saved: DiaryEntry = { id: 'e3', date: '2026-03-01', title: 'New title', body: 'Lorem', updatedAt: '2026-03-01T00:00:00Z' };
    vi.stubGlobal('fetch', routeFetch({ 'POST entries': reply({ entry: saved }) }));
    const fixture = await setup(COACH_OWNER_LOGIN);
    await submit(fixture);

    await click(fixture, 'button[aria-label="New entry"]');
    await click(fixture, 'button[aria-label="Save"]');

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('h1')?.textContent).toBe('New title');
  });

  it('keeps the editor open and says the title is used on a 409 title-taken', async () => {
    vi.stubGlobal('fetch', routeFetch({ 'PUT entries/e2': reply({ error: 'title-taken' }, 409) }));
    const fixture = await setup(COACH_OWNER_LOGIN, 'e2');
    await submit(fixture);

    await click(fixture, 'button[aria-label="Edit"]');
    await click(fixture, 'button[aria-label="Save"]');

    expect(fixture.nativeElement.textContent).toContain('Title needs to be unique');
    expect(fixture.nativeElement.querySelector('form.editor')).not.toBeNull();
  });

  it('opens the new id after a rename and leaves no old copy', async () => {
    const renamed: DiaryEntry = { ...ENTRIES[1], id: 'renamed', title: 'Renamed' };
    vi.stubGlobal('fetch', routeFetch({ 'PUT entries/e1': reply({ entry: renamed }) }));
    const fixture = await setup(COACH_OWNER_LOGIN, 'e1');
    await submit(fixture);

    await click(fixture, 'button[aria-label="Edit"]');
    await click(fixture, 'button[aria-label="Save"]');

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('h1')?.textContent).toBe('Renamed');
    expect(TestBed.inject(Router).navigate).toHaveBeenCalledWith(
      [],
      expect.objectContaining({ queryParams: { entry: 'renamed', tab: null } }),
    );
    await openMenu(fixture);
    await chooseItem(fixture, 'Diaries');
    expect([...el.querySelectorAll('.home a')].map((link) => link.textContent?.trim())).toEqual([
      '2026-02-01Lorem title',
      '2026-01-01Renamed',
    ]);
  });

  it.each([
    { name: 'an existing entry', open: 'Edit', param: 'e2', hasDelete: true },
    { name: 'a new entry', open: 'New entry', param: null, hasDelete: false },
  ])('delete is in the editor only for $name, never in the entry header', async ({ open, param, hasDelete }) => {
    vi.stubGlobal('fetch', routeFetch());
    const fixture = await setup(COACH_OWNER_LOGIN, param);
    await submit(fixture);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('button[aria-label="Delete"]')).toBeNull();

    await click(fixture, `button[aria-label="${open}"]`);
    expect(el.querySelector('.editor button[aria-label="Delete"]') !== null).toBe(hasDelete);
    expect(el.querySelector('.entry button[aria-label="Delete"]')).toBeNull();
    expect(el.querySelector('form.editor')).not.toBeNull();
    expect(el.querySelector('article')).toBeNull();
    expect(el.querySelector('ul.home')).toBeNull();
  });

  it('sizes the body textarea from its scrollHeight on open and on input', async () => {
    const scrollHeight = vi.spyOn(HTMLTextAreaElement.prototype, 'scrollHeight', 'get').mockReturnValue(300);
    try {
      vi.stubGlobal('fetch', routeFetch());
      const fixture = await setup(COACH_OWNER_LOGIN, 'e2');
      await submit(fixture);
      await click(fixture, 'button[aria-label="Edit"]');
      const body = fixture.nativeElement.querySelector('textarea') as HTMLTextAreaElement;
      expect(body.style.height).toBe('300px');

      scrollHeight.mockReturnValue(500);
      body.dispatchEvent(new Event('input'));
      expect(body.style.height).toBe('500px');
    } finally {
      scrollHeight.mockRestore();
    }
  });

  it.each([
    { name: 'signed out', login: null, isOwner: false },
    { name: 'a non-owner', login: 'someone-else', isOwner: false },
    { name: 'the owner', login: COACH_OWNER_LOGIN, isOwner: true },
  ])('owner controls for $name', async ({ login, isOwner }) => {
    const fetchMock = routeFetch();
    vi.stubGlobal('fetch', fetchMock);
    const fixture = await setup(login, 'e2');
    await submit(fixture);

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('button[aria-label="Edit"]') !== null).toBe(isOwner);
    expect(el.querySelector('.views')).toBeNull();
    expect(el.querySelector('input[type="password"]')).toBeNull();
  });

  it.each([
    { view: 'home', entry: null, tab: null, controls: ['New entry'] },
    { view: 'an entry', entry: 'e2', tab: null, controls: ['Edit'] },
    { view: 'audit', entry: null, tab: 'audit', controls: [] },
  ])('the owner\'s right-side control on $view is $controls', async ({ entry, tab, controls }) => {
    vi.stubGlobal('fetch', routeFetch());
    const fixture = await setup(COACH_OWNER_LOGIN, entry, tab);
    await submit(fixture);

    const labels = [...fixture.nativeElement.querySelectorAll('.tabs .tabs__new')].map((button) =>
      (button as HTMLElement).getAttribute('aria-label'),
    );
    expect(labels).toEqual(controls);
  });

  it('maps read ids to titles and skips a deleted id', async () => {
    vi.stubGlobal('fetch', routeFetch());
    const fixture = await setup(COACH_OWNER_LOGIN, null, 'audit');
    await submit(fixture);

    const cells = fixture.nativeElement.querySelectorAll('tbody tr:first-child td');
    expect(cells[3].textContent).toBe('Sed title · Lorem title');
  });

  it.each([
    { name: 'a visitor opening the same entry twice', login: null, bodies: [{ visitId: 'v1', entryId: 'e2' }, { visitId: 'v1', entryId: 'e2' }] },
    { name: 'the owner', login: COACH_OWNER_LOGIN, bodies: [] },
  ])('/seen for $name', async ({ login, bodies }) => {
    const fetchMock = routeFetch();
    vi.stubGlobal('fetch', fetchMock);
    const fixture = await setup(login, 'e2');
    await submit(fixture);
    if (login === null) {
      await openMenu(fixture);
      await chooseItem(fixture, 'Diaries');
      await openMenu(fixture);
      await chooseItem(fixture, 'Lorem title');
    }

    const sent = fetchMock.mock.calls
      .filter(([url, init]) => url.endsWith('diary/seen') && init?.method === 'POST')
      .map(([, init]) => JSON.parse(init?.body as string) as unknown);
    expect(sent).toEqual(bodies);
  });

  it('needs two clicks to delete an entry', async () => {
    const fetchMock = routeFetch();
    vi.stubGlobal('fetch', fetchMock);
    const fixture = await setup(COACH_OWNER_LOGIN, 'e2');
    await submit(fixture);
    const isDelete = (call: unknown[]) => (call[1] as RequestInit | undefined)?.method === 'DELETE';

    await click(fixture, 'button[aria-label="Edit"]');
    await click(fixture, 'button[aria-label="Delete"]');
    expect(fetchMock.mock.calls.some(isDelete)).toBe(false);
    expect(fixture.nativeElement.querySelector('button[aria-label="Confirm delete"]')).not.toBeNull();

    await click(fixture, 'button[aria-label="Confirm delete"]');
    expect(fetchMock.mock.calls.filter(isDelete).length).toBe(1);
    expect(fixture.nativeElement.querySelector('form.editor')).toBeNull();
    expect(fixture.nativeElement.querySelector('.home')).not.toBeNull();
  });

  it('shows "Couldn\'t save." when a save fails', async () => {
    vi.stubGlobal('fetch', routeFetch({ 'POST entries': reply({}, 500) }));
    const fixture = await setup(COACH_OWNER_LOGIN);
    await submit(fixture);

    await click(fixture, 'button[aria-label="New entry"]');
    fixture.nativeElement.querySelector('textarea').value = 'Lorem';
    await click(fixture, 'button[aria-label="Save"]');

    expect(fixture.nativeElement.textContent).toContain("Couldn't save.");
    expect(fixture.nativeElement.querySelector('textarea')).not.toBeNull();
  });
});
