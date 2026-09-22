import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CoachPageComponent, COACH_REPO_PUBLIC } from './coach-page.component';

// COACH_REPO_IS_PUBLIC (site-links.ts) is read through the COACH_REPO_PUBLIC
// injection token, so each variant below overrides it via TestBed rather than
// vi.mock: the unit-test builder pre-bundles the app through esbuild before
// Vitest runs, which collapses the site-links module boundary vi.mock would
// need to intercept (verified empirically — a mock factory on that import
// never executes under this builder).
const createFixture = (isRepoPublic: boolean): ComponentFixture<CoachPageComponent> => {
  TestBed.configureTestingModule({
    imports: [CoachPageComponent],
    providers: [provideRouter([]), { provide: COACH_REPO_PUBLIC, useValue: isRepoPublic }],
  });
  const fixture = TestBed.createComponent(CoachPageComponent);
  fixture.detectChanges();
  return fixture;
};

describe('CoachPageComponent (repo private)', () => {
  let fixture: ComponentFixture<CoachPageComponent>;

  beforeEach(() => {
    fixture = createFixture(false);
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('never renders an email address', () => {
    const html = (fixture.nativeElement as HTMLElement).innerHTML;
    expect(html).not.toMatch(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i);
  });

  it('shows "Request access" pointing at the GitHub profile, with the invite-only note', () => {
    const el = fixture.nativeElement as HTMLElement;
    const cta = el.querySelector('.coach-cta');
    expect(cta?.textContent).toContain('Request access');
    expect(cta?.getAttribute('href')).toBe('https://github.com/michael-yrao');
    expect(el.textContent).toContain('cse-coach is invite-only while it settles; ask on GitHub.');
  });

  it('renders the three-moves table and the breadcrumb', () => {
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('.coach-moves')?.textContent).toContain('Clean / Shaky / Blank');
    expect(el.textContent).toContain('Coach');
  });
});

describe('CoachPageComponent (repo public)', () => {
  let fixture: ComponentFixture<CoachPageComponent>;

  beforeEach(() => {
    fixture = createFixture(true);
  });

  it('shows "Get cse-coach" pointing at the repo, with no invite-only note', () => {
    const el = fixture.nativeElement as HTMLElement;
    const cta = el.querySelector('.coach-cta');
    expect(cta?.textContent).toContain('Get cse-coach');
    expect(cta?.getAttribute('href')).toBe('https://github.com/michael-yrao/cse-coach');
    expect(el.textContent).not.toContain('invite-only');
  });
});
