import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { AuthService } from './core/auth/auth.service';
import { GITHUB_APP_CONFIG } from './core/pattern-sense/github-save';

describe('app routes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      // App off: the guard lets `/` through, as before sign-in existed.
      providers: [
        provideRouter(routes),
        {
          provide: GITHUB_APP_CONFIG,
          useValue: { clientId: 'REPLACE_WITH_CLIENT_ID', appSlug: 'REPLACE_WITH_APP_SLUG' },
        },
      ],
    });
  });

  it('redirects /progress to the root route, preserving query params', async () => {
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/progress?repo=a/b');

    expect(router.url).toBe('/?repo=a%2Fb');
  });

  it('redirects /signin to the root route when the app is off', async () => {
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/signin');

    expect(router.url).toBe('/');
  });

  it.each([
    { from: '/library', to: '/learn' },
    { from: '/explore', to: '/learn' },
  ])('redirects $from to $to', async ({ from, to }) => {
    const router = TestBed.inject(Router);

    await router.navigateByUrl(from);

    expect(router.url).toBe(to);
  });

  it('redirects /games/pattern-sense to /quiz/pattern-sense', async () => {
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/games/pattern-sense');

    expect(router.url).toBe('/quiz/pattern-sense');
  });

  it('redirects /games/big-o to /quiz/big-o', async () => {
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/games/big-o');

    expect(router.url).toBe('/quiz/big-o');
  });

  const algorithmRedirects: ReadonlyArray<{ from: string; to: string }> = [
    { from: '/algorithms?repo=a/b', to: '/practice?repo=a%2Fb' },
    { from: '/algorithms/stack?repo=a/b', to: '/practice?repo=a%2Fb' },
    { from: '/algorithms/stack/valid-parentheses?repo=a/b', to: '/practice/20/solution?repo=a%2Fb' },
    { from: '/algorithms/stack/nope?repo=a/b', to: '/practice?repo=a%2Fb' },
    { from: '/algorithms/toString/nope?repo=a/b', to: '/practice?repo=a%2Fb' },
  ];

  it.each(algorithmRedirects)('redirects $from to $to', async ({ from, to }) => {
    const router = TestBed.inject(Router);

    await router.navigateByUrl(from);

    expect(router.url).toBe(to);
  });

  it('redirects /events to the root route', async () => {
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/events');

    expect(router.url).toBe('/');
  });

  it('loads the solution page at /practice/:number/solution', async () => {
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/practice/20/solution');

    expect(router.url).toBe('/practice/20/solution');
  });

  it('loads the recognition page at /quiz/recognition', async () => {
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/quiz/recognition');

    expect(router.url).toBe('/quiz/recognition');
  });

  it('redirects /practice/custom to /interview, keeping query params', async () => {
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/practice/custom?host=x');

    expect(router.url).toBe('/interview?host=x');
  });
});

describe('app routes, signed out', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        { provide: AuthService, useValue: { isEnabled: true, isSignedIn: () => false } },
      ],
    });
  });

  const matchedRoute = (router: Router) => router.routerState.snapshot.root.firstChild?.routeConfig;

  it('keeps / on the landing page, which has no title', async () => {
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/');

    expect(router.url).toBe('/');
    expect(matchedRoute(router)?.title).toBeUndefined();
  });

  it('shows the Progress board at /?repo= to a signed-out viewer', async () => {
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/?repo=a/b');

    expect(router.url).toBe('/?repo=a%2Fb');
    expect(matchedRoute(router)?.title).toBe('Progress');
  });
});
