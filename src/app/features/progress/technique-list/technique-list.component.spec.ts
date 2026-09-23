import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { TechniqueListComponent } from './technique-list.component';
import { ProblemProgress, Technique } from '../../../core/models/progress.model';

function makeTechnique(overrides: Partial<Technique> = {}): Technique {
  return {
    name: 'Two Pointers',
    family: 'Arrays',
    tier: 'core',
    started: true,
    minProblems: 3,
    problemCount: 1,
    problems: [11],
    bestComfort: '🟡',
    hasGreen: false,
    thin: true,
    hasVariantGap: false,
    ...overrides,
  };
}

function makeProblem(overrides: Partial<ProblemProgress> = {}): ProblemProgress {
  return {
    lcNumber: 11,
    title: 'Container With Most Water',
    url: 'https://leetcode.com/problems/container-with-most-water/',
    difficulty: 'Medium',
    comfort: '🟡',
    level: 2,
    streak: 1,
    repDates: [],
    timeline: [],
    ...overrides,
  };
}

function createFixture(techniques: Technique[], details: ProblemProgress[] | null = null) {
  TestBed.configureTestingModule({
    imports: [TechniqueListComponent],
    providers: [provideRouter([])],
  });
  const fixture = TestBed.createComponent(TechniqueListComponent);
  fixture.componentRef.setInput('techniques', techniques);
  fixture.componentRef.setInput('details', details);
  fixture.detectChanges();
  return fixture;
}

describe('TechniqueListComponent', () => {
  it('shows the count/target ratio as problemCount/minProblems', () => {
    const fixture = createFixture([makeTechnique({ problemCount: 1, minProblems: 3 })]);

    const ratio = fixture.nativeElement.querySelector('.tech-row__ratio');
    expect(ratio?.textContent).toContain('1/3');
  });

  it('shows a "thin" chip when thin is true', () => {
    const fixture = createFixture([makeTechnique({ thin: true })]);
    expect(fixture.nativeElement.querySelector('.chip--thin')?.textContent).toContain('thin');
    expect(fixture.nativeElement.querySelector('.chip--covered')).toBeFalsy();
  });

  it('shows a "covered" chip when thin is false', () => {
    const fixture = createFixture([makeTechnique({ thin: false })]);
    expect(fixture.nativeElement.querySelector('.chip--covered')?.textContent).toContain('covered');
    expect(fixture.nativeElement.querySelector('.chip--thin')).toBeFalsy();
  });

  it('shows a "not started" chip (and no thin/covered chip) for a not-started technique', () => {
    const fixture = createFixture([makeTechnique({ started: false, problemCount: 0, problems: [] })]);

    expect(fixture.nativeElement.querySelector('.chip--not-started')?.textContent).toContain('not started');
    expect(fixture.nativeElement.querySelector('.chip--thin')).toBeFalsy();
    expect(fixture.nativeElement.querySelector('.chip--covered')).toBeFalsy();
  });

  it('is collapsed by default: clicking the row toggles aria-expanded and reveals the detail panel', () => {
    const fixture = createFixture([makeTechnique()], [makeProblem()]);

    const toggle = fixture.nativeElement.querySelector('.tech-row__toggle') as HTMLButtonElement;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(fixture.nativeElement.querySelector('.tech-row__detail')).toBeFalsy();

    toggle.click();
    fixture.detectChanges();

    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelector('.tech-row__detail')).toBeTruthy();
  });

  it('shows "Not started yet." for a not-started technique on expand, and never emits expand', () => {
    const fixture = createFixture([makeTechnique({ started: false, problemCount: 0, problems: [] })]);
    const emitted: Technique[] = [];
    fixture.componentInstance.expand.subscribe((t) => emitted.push(t));

    const toggle = fixture.nativeElement.querySelector('.tech-row__toggle') as HTMLButtonElement;
    toggle.click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.tech-row__detail')?.textContent).toContain('Not started yet.');
    expect(emitted.length).toBe(0);
  });

  it('emits expand exactly once when a started technique is expanded for the first time', () => {
    const fixture = createFixture([makeTechnique()], null);
    const emitted: Technique[] = [];
    fixture.componentInstance.expand.subscribe((t) => emitted.push(t));

    const toggle = fixture.nativeElement.querySelector('.tech-row__toggle') as HTMLButtonElement;
    toggle.click();
    fixture.detectChanges();

    expect(emitted.length).toBe(1);
    expect(emitted[0].name).toBe('Two Pointers');

    // Collapsing and re-expanding does not re-emit (the parent's loadDetails() is idempotent
    // anyway, but the component itself only emits on the transition into "expanded").
    toggle.click();
    fixture.detectChanges();
    toggle.click();
    fixture.detectChanges();

    expect(emitted.length).toBe(2);
  });

  it('shows "Loading problems…" when details is null (not yet fetched)', () => {
    const fixture = createFixture([makeTechnique()], null);

    (fixture.nativeElement.querySelector('.tech-row__toggle') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.tech-row__detail')?.textContent).toContain('Loading problems…');
  });

  it('shows "No matching problems found." when details is loaded but nothing joins', () => {
    const fixture = createFixture([makeTechnique({ problems: [999] })], [makeProblem({ lcNumber: 11 })]);

    (fixture.nativeElement.querySelector('.tech-row__toggle') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.tech-row__detail')?.textContent)
      .toContain('No matching problems found.');
  });

  it('joins technique.problems against details[] to render title/comfort/difficulty', () => {
    const fixture = createFixture(
      [makeTechnique({ problems: [11] })],
      [makeProblem({ lcNumber: 11, title: 'Container With Most Water', difficulty: 'Medium', comfort: '🟡' })],
    );

    (fixture.nativeElement.querySelector('.tech-row__toggle') as HTMLButtonElement).click();
    fixture.detectChanges();

    const row = fixture.nativeElement.querySelector('.tech-row__problem');
    expect(row?.textContent).toContain('Container With Most Water');
    expect(row?.textContent).toContain('#11');
    expect(row?.textContent).toContain('🟡');
    expect(fixture.nativeElement.querySelector('.tag--medium')?.textContent).toContain('Medium');

    // #11 (Container With Most Water) has a visualizer route, so the leading slot is the
    // `</>` link — and it's the row's first element child, leading the row.
    expect(row?.firstElementChild?.classList.contains('tech-row__problem-status')).toBe(true);
    expect(row?.firstElementChild?.classList.contains('tech-row__problem-status--link')).toBe(true);

    const link: HTMLAnchorElement | null = row?.querySelector('.tech-row__problem-links a') ?? null;
    expect(link?.textContent?.trim()).toBe('↗');
    expect(link?.getAttribute('aria-label')).toBe('Open on LeetCode');
  });
});
