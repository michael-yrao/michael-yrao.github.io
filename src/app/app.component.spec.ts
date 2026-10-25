import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AppComponent } from './app.component';
import { AuthService } from './core/auth/auth.service';
import { GITHUB_APP_CONFIG } from './core/pattern-sense/github-save';
import { TodaySessionService } from './core/today-session/today-session.service';

const DISABLED_APP = { clientId: 'REPLACE_WITH_CLIENT_ID', appSlug: 'REPLACE_WITH_APP_SLUG' };

// A minimal routed target so clicking a real nav link (routerLink, not a
// synthetic call) resolves instead of throwing NG04002 for an unmatched URL.
@Component({
  selector: 'app-test-blank',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
class BlankComponent {}

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([{ path: '**', component: BlankComponent }]),
        // App off: the nav is the pre-sign-in nav (no auth controls).
        { provide: GITHUB_APP_CONFIG, useValue: DISABLED_APP },
      ],
    });
    fixture = TestBed.createComponent(AppComponent);
  });

  it('should create the app', () => {
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('renders the Progressive Overflow brand in the nav', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.po-nav__wordmark')?.textContent?.trim()).toBe(
      'progressiveoverflow',
    );
    expect(compiled.querySelector('.po-nav__brand')?.getAttribute('aria-label')).toBe(
      'Progressive Overflow — home',
    );
    expect(compiled.querySelector('.po-nav__brand app-logo-mark svg')).toBeTruthy();
  });

  it('renders the brand as the first child of the nav bar, before the menu', () => {
    fixture.detectChanges();
    const inner = fixture.nativeElement.querySelector('.po-nav__inner') as HTMLElement;
    const children = Array.from(inner.children);
    expect(children[0]?.classList.contains('po-nav__brand')).toBe(true);
    expect(children.findIndex((el) => el.classList.contains('po-nav__brand'))).toBeLessThan(
      children.findIndex((el) => el.querySelector('app-menu.po-nav__menu') !== null),
    );
  });

  it('renders the footer links in column order, the external one in a new tab', () => {
    fixture.detectChanges();
    const links = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLAnchorElement>('.po-footer a'),
    );
    expect(links.map((a) => [a.textContent?.trim(), a.getAttribute('href'), a.getAttribute('target')])).toEqual([
      ['Problems', '/practice', null],
      ['Cheat sheet', '/cheat-sheet', null],
      ['Quiz', '/quiz', null],
      ['Games', '/games', null],
      ['Interview', '/interview', null],
      ['Coach', '/coach', null],
      ['About', '/about', null],
      ['GitHub', 'https://github.com/michael-yrao/michael-yrao.github.io', '_blank'],
    ]);
  });

  it.each<{ url: string; active: string | null }>([
    { url: '/interview', active: 'Practice' },
    { url: '/quiz/big-o', active: 'Practice' },
    { url: '/practices', active: null },
  ])('on $url the active bar link is $active', async ({ url, active }) => {
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl(url);
    fixture.detectChanges();
    const lit = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.po-nav__links a.active'),
    ).map((a) => a.textContent?.trim());
    expect(lit).toEqual(active === null ? [] : [active]);
  });
});

interface AuthStub {
  isEnabled: boolean;
  isSignedIn: () => boolean;
  login: () => string | null;
  selectedRepo: () => string | null;
  resolveRepo: (queryRepo: string | null) => string | null;
  signIn: ReturnType<typeof vi.fn>;
  signOut: ReturnType<typeof vi.fn>;
}

const makeAuthStub = (overrides: Partial<AuthStub> = {}): AuthStub => ({
  isEnabled: true,
  isSignedIn: () => false,
  login: () => null,
  selectedRepo: () => null,
  resolveRepo: () => null,
  signIn: vi.fn(),
  signOut: vi.fn(),
  ...overrides,
});

const SIGNED_IN = {
  isSignedIn: () => true,
  login: () => 'ada',
  selectedRepo: () => 'ada/cse-progress',
};

const HAMBURGER = '.po-nav__menu';
const CHIP = '.po-nav__account-chip';

/** Mounts the app with the given auth stub (or the real service with the app off). */
function mount(auth: AuthStub | null): { fixture: ComponentFixture<AppComponent>; root: HTMLElement } {
  TestBed.configureTestingModule({
    imports: [AppComponent],
    providers: [
      provideRouter([{ path: '**', component: BlankComponent }]),
      auth === null
        ? { provide: GITHUB_APP_CONFIG, useValue: DISABLED_APP }
        : { provide: AuthService, useValue: auth },
    ],
  });
  const fixture = TestBed.createComponent(AppComponent);
  fixture.detectChanges();
  return { fixture, root: fixture.nativeElement as HTMLElement };
}

/** Mounts the app and opens the menu under `scope` (the ☰ or the account chip). */
function mountMenu(auth: AuthStub | null, scope = HAMBURGER): { root: HTMLElement } {
  const { fixture, root } = mount(auth);
  (root.querySelector(`${scope} .menu__trigger`) as HTMLButtonElement).click();
  fixture.detectChanges();
  return { root };
}

const menuItems = (root: HTMLElement, scope = HAMBURGER): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>(`${scope} .menu__panel [role="menuitem"]`));

describe('Bar links and account chip', () => {
  it.each<{ name: string; auth: AuthStub | null; links: string[]; chip: string | null }>([
    { name: 'app off', auth: null, links: ['Practice'], chip: null },
    { name: 'signed out', auth: makeAuthStub(), links: ['Practice'], chip: 'Sign in' },
    {
      name: 'signed in',
      auth: makeAuthStub(SIGNED_IN),
      links: ['Practice'],
      chip: 'ada',
    },
  ])('$name shows its links and chip', ({ auth, links, chip }) => {
    const { root } = mount(auth);
    const labels = Array.from(root.querySelectorAll('.po-nav__links a')).map((a) => a.textContent?.trim());
    expect(labels).toEqual(links);
    const control = root.querySelector(`${CHIP} .menu__trigger-text, ${CHIP} .po-nav__auth-button`);
    expect(control?.textContent?.trim() ?? null).toBe(chip);
  });

  it('signed out: Sign in calls signIn once', () => {
    const auth = makeAuthStub();
    const { root } = mount(auth);
    (root.querySelector('.po-nav__auth-button') as HTMLButtonElement).click();
    expect(auth.signIn).toHaveBeenCalledTimes(1);
  });

  it('signed in: the chip menu lists Study track and Sign out, and Sign out calls signOut once', () => {
    const auth = makeAuthStub(SIGNED_IN);
    const { root } = mountMenu(auth, CHIP);
    const items = menuItems(root, CHIP);
    expect(items.map((el) => el.textContent?.trim())).toEqual(['Study track', 'Sign out']);
    items[1].click();
    expect(auth.signOut).toHaveBeenCalledTimes(1);
  });
});

describe('Resume-today chip', () => {
  const CHIP = '.po-nav__resume';

  function mountWithSession(isActive: boolean): HTMLElement {
    const session = { active: signal(isActive), current: signal(3), doneCount: signal(2), queue: signal([1, 2, 3, 4, 5]) };
    TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([{ path: '**', component: BlankComponent }]),
        { provide: GITHUB_APP_CONFIG, useValue: DISABLED_APP },
        { provide: TodaySessionService, useValue: session },
      ],
    });
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('active: shows 2/5 linking to the current problem; inactive: absent', () => {
    const chip = mountWithSession(true).querySelector(CHIP) as HTMLAnchorElement;

    expect(chip.textContent?.trim()).toBe('2/5');
    expect(chip.getAttribute('href')).toBe('/practice/3');
    expect(chip.getAttribute('aria-label')).toBe('Resume today, 2 of 5 done');

    TestBed.resetTestingModule();
    expect(mountWithSession(false).querySelector(CHIP)).toBeNull();
  });
});

describe('Site menu', () => {
  it.each<{
    name: string;
    auth: AuthStub | null;
    labels: string[];
    hrefs: (string | null)[];
    account: string | null;
  }>([
    {
      name: 'app off',
      auth: null,
      labels: ['Practice'],
      hrefs: ['/practice'],
      account: null,
    },
    {
      name: 'signed out',
      auth: makeAuthStub(),
      labels: ['Practice', 'Sign in with GitHub'],
      hrefs: ['/practice', null],
      account: null,
    },
    {
      name: 'signed in',
      auth: makeAuthStub(SIGNED_IN),
      labels: ['Practice', 'Sign out'],
      hrefs: ['/practice', null],
      account: 'adaada/cse-progress',
    },
  ])('$name lists its items in order', ({ auth, labels, hrefs, account }) => {
    const { root } = mountMenu(auth);
    const items = menuItems(root);
    expect(items.map((el) => el.textContent?.trim())).toEqual(labels);
    expect(items.map((el) => el.getAttribute('href'))).toEqual(hrefs);
    expect(root.querySelector(`${HAMBURGER} .po-nav__account`)?.textContent?.replace(/\s+/g, '') ?? null).toBe(
      account,
    );
  });

  it.each<{ name: string; overrides: Partial<AuthStub>; label: string; called: 'signIn' | 'signOut' }>([
    { name: 'signed in', overrides: SIGNED_IN, label: 'Sign out', called: 'signOut' },
    { name: 'signed out', overrides: {}, label: 'Sign in with GitHub', called: 'signIn' },
  ])('$name: clicking $label calls $called once', ({ overrides, label, called }) => {
    const auth = makeAuthStub(overrides);
    const { root } = mountMenu(auth);
    const button = menuItems(root).find((el) => el.textContent?.trim() === label) as HTMLElement;
    button.click();
    expect(auth[called]).toHaveBeenCalledTimes(1);
  });
});
