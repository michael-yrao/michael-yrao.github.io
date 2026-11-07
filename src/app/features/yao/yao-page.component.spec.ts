import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { vi } from 'vitest';

import { AuthService } from '../../core/auth/auth.service';
import { COACH_OWNER_LOGIN } from '../../core/data/site-links';
import { YaoStory, YaoViewsResponse } from './yao-contract';
import { YaoPageComponent } from './yao-page.component';

const STORY: YaoStory = {
  title: 'Lorem title',
  chapters: [
    { heading: 'Lorem one', paragraphs: ['Ipsum dolor sit amet.', 'Consectetur adipiscing.'] },
    { heading: 'Lorem two', paragraphs: ['Sed do eiusmod.'] },
  ],
};
const VIEWS: YaoViewsResponse = {
  views: [
    { at: '2026-01-02T03:04:05Z', city: 'Lorem', country: 'Ipsum', device: 'Dolor' },
    { at: '2026-01-03T03:04:05Z', city: '', country: 'Sit', device: 'Amet' },
  ],
};

function reply(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

async function setup(login: string | null): Promise<ComponentFixture<YaoPageComponent>> {
  TestBed.configureTestingModule({
    providers: [{ provide: AuthService, useValue: { login: signal(login), getToken: async () => 'tok' } }],
  });
  const fixture = TestBed.createComponent(YaoPageComponent);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

async function submit(fixture: ComponentFixture<YaoPageComponent>): Promise<void> {
  const el: HTMLElement = fixture.nativeElement;
  el.querySelector<HTMLInputElement>('input')!.value = 'secret';
  el.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
  await fixture.whenStable();
  await new Promise((resolve) => setTimeout(resolve));
  fixture.detectChanges();
}

describe('YaoPageComponent', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('shows the wrong-password message and no story on a 401', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => reply({}, 401)));
    const fixture = await setup(null);
    await submit(fixture);

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Wrong password');
    expect(fixture.nativeElement.querySelector('h1')).toBeNull();
  });

  it('renders the chapters on a 200', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => reply(STORY)));
    const fixture = await setup(null);
    await submit(fixture);

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('h1')?.textContent).toBe('Lorem title');
    expect([...el.querySelectorAll('h2')].map((h) => h.textContent)).toEqual(['Lorem one', 'Lorem two']);
    expect(el.querySelectorAll('p').length).toBe(3);
  });

  it.each([
    { name: 'signed out', login: null, hasBlock: false },
    { name: 'a non-owner', login: 'someone-else', hasBlock: false },
    { name: 'the owner', login: COACH_OWNER_LOGIN, hasBlock: true },
  ])('owner block for $name', async ({ login, hasBlock }) => {
    const fetchMock = vi.fn(async () => reply(VIEWS));
    vi.stubGlobal('fetch', fetchMock);
    const fixture = await setup(login);
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.views') !== null).toBe(hasBlock);
    expect(fetchMock).toHaveBeenCalledTimes(hasBlock ? 1 : 0);
    if (hasBlock) {
      expect(el.querySelector('.views__count')?.textContent).toBe('2');
      expect(el.querySelectorAll('tbody tr').length).toBe(2);
      expect(el.querySelectorAll('tbody tr')[1].textContent).toContain('Sit');
    }
  });
});
