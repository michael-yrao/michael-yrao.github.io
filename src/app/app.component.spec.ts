import { Component, ChangeDetectionStrategy } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AppComponent } from './app.component';
import { AuthService } from './core/auth/auth.service';
import { GITHUB_APP_CONFIG } from './core/pattern-sense/github-save';

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
        // App off: the nav is the pre-sign-in nav (Progress link shown, no auth controls).
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
      children.findIndex((el) => el.matches('app-menu.po-nav__menu')),
    );
  });

  it('renders the footer with exactly the human line and copyright, and no anchors', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    const footer = compiled.querySelector('.po-footer') as HTMLElement;
    expect(footer.textContent?.trim()).toBe(
      `Built by a human, with Claude in the loop.© ${new Date().getFullYear()}`,
    );
    expect(footer.querySelectorAll('a').length).toBe(0);
  });

});

interface AuthStub {
  isEnabled: boolean;
  isSignedIn: () => boolean;
  login: () => string | null;
  selectedRepo: () => string | null;
  signIn: ReturnType<typeof vi.fn>;
  signOut: ReturnType<typeof vi.fn>;
}

const makeAuthStub = (overrides: Partial<AuthStub> = {}): AuthStub => ({
  isEnabled: true,
  isSignedIn: () => false,
  login: () => null,
  selectedRepo: () => null,
  signIn: vi.fn(),
  signOut: vi.fn(),
  ...overrides,
});

const SIGNED_IN = {
  isSignedIn: () => true,
  login: () => 'ada',
  selectedRepo: () => 'ada/cse-progress',
};

/** Mounts the app with the given auth stub (or the real service with the app off) and opens the site menu. */
function mountMenu(auth: AuthStub | null): { root: HTMLElement; auth: AuthStub | null } {
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
  const root = fixture.nativeElement as HTMLElement;
  (root.querySelector('app-menu.po-nav__menu .menu__trigger') as HTMLButtonElement).click();
  fixture.detectChanges();
  return { root, auth };
}

const menuItems = (root: HTMLElement): HTMLElement[] =>
  Array.from(root.querySelectorAll<HTMLElement>('.menu__panel [role="menuitem"]'));

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
      labels: ['Progress', 'Practice', 'Library', 'Coach', 'About'],
      hrefs: ['/', '/practice', '/library', '/coach', '/about'],
      account: null,
    },
    {
      name: 'signed out',
      auth: makeAuthStub(),
      labels: ['Practice', 'Library', 'Coach', 'About', 'Sign in with GitHub'],
      hrefs: ['/practice', '/library', '/coach', '/about', null],
      account: null,
    },
    {
      name: 'signed in',
      auth: makeAuthStub(SIGNED_IN),
      labels: ['Progress', 'Study track', 'Practice', 'Library', 'Coach', 'About', 'Sign out'],
      hrefs: ['/', '/start', '/practice', '/library', '/coach', '/about', null],
      account: 'adaada/cse-progress',
    },
  ])('$name lists its items in order', ({ auth, labels, hrefs, account }) => {
    const { root } = mountMenu(auth);
    const items = menuItems(root);
    expect(items.map((el) => el.textContent?.trim())).toEqual(labels);
    expect(items.map((el) => el.getAttribute('href'))).toEqual(hrefs);
    expect(root.querySelector('.po-nav__account')?.textContent?.replace(/\s+/g, '') ?? null).toBe(
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
