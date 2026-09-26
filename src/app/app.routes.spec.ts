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

  it('loads the events feature at /events', async () => {
    const router = TestBed.inject(Router);

    await router.navigateByUrl('/events');

    expect(router.url).toBe('/events');
  });
});
