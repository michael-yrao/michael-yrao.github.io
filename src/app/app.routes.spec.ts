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
});
