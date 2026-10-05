import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { routes } from './app.routes';

describe('app routes', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes)],
    });
  });

  it('redirects /progress to the root route, preserving query params', async () => {
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/progress?repo=a/b');

    expect(router.url).toBe('/?repo=a%2Fb');
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

  it('loads the events feature at /events', async () => {
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/events');

    expect(router.url).toBe('/events');
  });

  it('loads the solution page at /practice/:number/solution', async () => {
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/practice/20/solution');

    expect(router.url).toBe('/practice/20/solution');
  });

  it('redirects /practice/custom to /interview, keeping query params', async () => {
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/practice/custom?host=x');

    expect(router.url).toBe('/interview?host=x');
  });
});
